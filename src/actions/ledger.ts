"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import {
  PaymentAccount,
  LedgerTransaction,
  Document,
  User,
  IncomeSource,
} from "@/lib/db/models";
import { withTransaction, transactionErrorMessage } from "@/lib/db/transaction";
import { requireSession } from "@/lib/auth/session";
import {
  paymentAccountSchema,
  paymentAccountUpdateSchema,
  ledgerTransactionSchema,
  documentSchema,
  salarySlipManualSchema,
  billManualSchema,
} from "@/lib/validations/finance";
import { transactionBalanceDelta } from "@/lib/finance/ledger";
import {
  deriveLastFour,
  digitsOnly,
  isCardType,
} from "@/lib/finance/account-details";
import { encryptSensitive, decryptSensitive } from "@/lib/crypto/sensitive";
import { breakdownSalaryPackage } from "@/lib/finance/tax";
import {
  buildDocumentS3Key,
  deleteS3Object,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  isS3Configured,
} from "@/lib/storage/s3";
import type { ActionResult } from "./auth";
import type { PaymentAccountType, TransactionType } from "@/lib/finance/constants";

function userObjectId(userId: string) {
  return new mongoose.Types.ObjectId(userId);
}

function formText(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  return trimmed || undefined;
}

function formOptionalNumber(formData: FormData, key: string): number | undefined {
  const value = formData.get(key);
  if (value == null || String(value).trim() === "") return undefined;
  return value as unknown as number;
}

function parseAccountFormData(formData: FormData) {
  return {
    type: formData.get("type"),
    name: formText(formData, "name"),
    institution: formText(formData, "institution"),
    holderName: formText(formData, "holderName"),
    accountNumber: formText(formData, "accountNumber"),
    ifscCode: formText(formData, "ifscCode"),
    accountSubtype: formText(formData, "accountSubtype"),
    cardNumber: formText(formData, "cardNumber"),
    expiryMonth: formOptionalNumber(formData, "expiryMonth"),
    expiryYear: formOptionalNumber(formData, "expiryYear"),
    upiId: formText(formData, "upiId"),
    openingBalance: formData.get("openingBalance") ?? 0,
    creditLimit: formOptionalNumber(formData, "creditLimit"),
    billingDay: formOptionalNumber(formData, "billingDay"),
    isDefault: formData.get("isDefault") === "on" || formData.get("isDefault") === "true",
    notes: formText(formData, "notes"),
  };
}

type ParsedAccountForm = ReturnType<typeof parseAccountFormData>;

function mergeAccountFormWithExisting(
  raw: ParsedAccountForm,
  existing: Record<string, unknown>
) {
  const type = String(raw.type) as PaymentAccountType;

  if (!raw.holderName && existing.holderName) {
    raw.holderName = String(existing.holderName);
  }
  if (!raw.institution && existing.institution) {
    raw.institution = String(existing.institution);
  }

  if (type === "bank") {
    if (!raw.ifscCode && existing.ifscCode) raw.ifscCode = String(existing.ifscCode);
    if (!raw.accountSubtype && existing.accountSubtype) {
      raw.accountSubtype = String(existing.accountSubtype);
    }
  }

  if (type === "wallet" && !raw.upiId && existing.upiId) {
    raw.upiId = String(existing.upiId);
  }

  if (isCardType(type)) {
    if (raw.expiryMonth === undefined && existing.expiryMonth != null) {
      raw.expiryMonth = Number(existing.expiryMonth);
    }
    if (raw.expiryYear === undefined && existing.expiryYear != null) {
      raw.expiryYear = Number(existing.expiryYear);
    }
  }

  if (type === "credit_card") {
    if (raw.creditLimit === undefined && existing.creditLimit != null) {
      raw.creditLimit = Number(existing.creditLimit);
    }
    if (raw.billingDay === undefined && existing.billingDay != null) {
      raw.billingDay = Number(existing.billingDay);
    }
  }

  return raw;
}

/** Build a partial update — never wipe sensitive fields unless type changed or user supplied a replacement. */
function buildAccountUpdateDoc(
  normalized: Record<string, unknown>,
  existingType: PaymentAccountType,
  newType: PaymentAccountType,
  openingBalance: number,
  isDefault: boolean
): Record<string, unknown> {
  const typeChanged = existingType !== newType;
  const update: Record<string, unknown> = {
    name: normalized.name,
    type: newType,
    institution: normalized.institution ?? "",
    holderName: normalized.holderName ?? "",
    isDefault,
    currentBalance: openingBalance,
    notes: normalized.notes ?? "",
  };

  if (newType === "bank") {
    update.ifscCode = normalized.ifscCode ?? "";
    if (normalized.accountSubtype) update.accountSubtype = normalized.accountSubtype;
    if (normalized.accountNumber) {
      update.accountNumber = normalized.accountNumber;
      update.lastFour = normalized.lastFour;
    }
    if (typeChanged) {
      update.cardNumber = "";
      update.expiryMonth = undefined;
      update.expiryYear = undefined;
      update.upiId = "";
      update.creditLimit = undefined;
      update.billingDay = undefined;
    }
    return update;
  }

  if (isCardType(newType)) {
    if (normalized.cardNumber) {
      update.cardNumber = normalized.cardNumber;
      update.lastFour = normalized.lastFour;
    }
    if (normalized.expiryMonth != null) update.expiryMonth = normalized.expiryMonth;
    if (normalized.expiryYear != null) update.expiryYear = normalized.expiryYear;
    if (typeChanged) {
      update.accountNumber = "";
      update.ifscCode = "";
      update.accountSubtype = undefined;
      update.upiId = "";
    }
    if (newType === "credit_card") {
      if (normalized.creditLimit != null) update.creditLimit = normalized.creditLimit;
      if (normalized.billingDay != null) update.billingDay = normalized.billingDay;
    } else if (typeChanged) {
      update.creditLimit = undefined;
      update.billingDay = undefined;
    }
    return update;
  }

  if (newType === "wallet") {
    update.upiId = normalized.upiId ?? "";
    if (typeChanged) {
      update.accountNumber = "";
      update.ifscCode = "";
      update.accountSubtype = undefined;
      update.cardNumber = "";
      update.expiryMonth = undefined;
      update.expiryYear = undefined;
      update.creditLimit = undefined;
      update.billingDay = undefined;
      update.holderName = "";
    }
    return update;
  }

  if (newType === "cash" && typeChanged) {
    update.accountNumber = "";
    update.ifscCode = "";
    update.accountSubtype = undefined;
    update.cardNumber = "";
    update.expiryMonth = undefined;
    update.expiryYear = undefined;
    update.upiId = "";
    update.creditLimit = undefined;
    update.billingDay = undefined;
    update.holderName = "";
    update.institution = "";
  }

  return update;
}

function normalizeAccountPayload(data: {
  type: PaymentAccountType;
  cardNumber?: string;
  accountNumber?: string;
  ifscCode?: string;
  [key: string]: unknown;
}) {
  const payload = { ...data } as Record<string, unknown>;

  if (payload.cardNumber) {
    const digits = digitsOnly(String(payload.cardNumber));
    payload.lastFour = deriveLastFour(digits);
    payload.cardNumber = encryptSensitive(digits);
  }

  if (payload.accountNumber) {
    const digits = digitsOnly(String(payload.accountNumber));
    payload.lastFour = deriveLastFour(digits);
    payload.accountNumber = encryptSensitive(digits);
  }

  if (payload.ifscCode) {
    payload.ifscCode = String(payload.ifscCode).toUpperCase().trim();
  }

  return payload;
}

function revalidateLedger() {
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/documents");
  revalidatePath("/income");
}

async function getOwnedAccount(userId: string, accountId: string, session?: mongoose.ClientSession) {
  return PaymentAccount.findOne({
    _id: accountId,
    userId: userObjectId(userId),
    isActive: true,
  }).session(session ?? null);
}

async function adjustAccountBalance(
  accountId: mongoose.Types.ObjectId,
  accountType: PaymentAccountType,
  txType: TransactionType,
  amount: number,
  mode: "apply" | "revert",
  session: mongoose.ClientSession
) {
  const delta = transactionBalanceDelta(accountType, txType, amount, mode);
  await PaymentAccount.findByIdAndUpdate(
    accountId,
    { $inc: { currentBalance: delta } },
    { session }
  );
}

export async function createAccountAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = paymentAccountSchema.safeParse(parseAccountFormData(formData));

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { openingBalance, isDefault, ...data } = parsed.data;
  const normalized = normalizeAccountPayload(data);
  const userId = userObjectId(session.userId);

  try {
    await withTransaction(async (dbSession) => {
      if (isDefault) {
        await PaymentAccount.updateMany(
          { userId, isDefault: true },
          { isDefault: false },
          { session: dbSession }
        );
      }

      await PaymentAccount.create(
        [
          {
            ...normalized,
            userId,
            openingBalance,
            currentBalance: openingBalance,
            isDefault: isDefault ?? false,
          },
        ],
        { session: dbSession }
      );
    });
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }

  revalidateLedger();
  return { success: true };
}

export async function updateAccountAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireSession();
  const accountId = formData.get("id") as string;
  if (!accountId) return { success: false, error: "Account ID required" };

  const userId = userObjectId(session.userId);

  try {
    await withTransaction(async (dbSession) => {
      const existing = await PaymentAccount.findOne({
        _id: accountId,
        userId,
        isActive: true,
      }).session(dbSession);

      if (!existing) throw new Error("Account not found");

      const raw = mergeAccountFormWithExisting(parseAccountFormData(formData), {
        ...existing.toObject(),
      });
      if (!raw.cardNumber) delete raw.cardNumber;
      if (!raw.accountNumber) delete raw.accountNumber;

      const parsed = paymentAccountUpdateSchema.safeParse(raw);

      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid account data");
      }

      const { isDefault, openingBalance, ...data } = parsed.data;
      const normalized = normalizeAccountPayload(data) as Record<string, unknown>;
      const updateDoc = buildAccountUpdateDoc(
        normalized,
        existing.type as PaymentAccountType,
        data.type as PaymentAccountType,
        openingBalance,
        isDefault ?? false
      );

      if (isDefault) {
        await PaymentAccount.updateMany(
          { userId, isDefault: true, _id: { $ne: accountId } },
          { isDefault: false },
          { session: dbSession }
        );
      }

      await PaymentAccount.findByIdAndUpdate(accountId, updateDoc, { session: dbSession });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : transactionErrorMessage(error);
    return { success: false, error: message };
  }

  revalidateLedger();
  return { success: true };
}

const REVEALABLE_FIELDS = [
  "cardNumber",
  "accountNumber",
  "ifscCode",
  "holderName",
  "upiId",
] as const;

export type RevealableAccountField = (typeof REVEALABLE_FIELDS)[number];

export async function revealAccountFieldAction(
  accountId: string,
  field: RevealableAccountField
): Promise<{ success: boolean; value?: string; error?: string }> {
  const session = await requireSession();

  if (!REVEALABLE_FIELDS.includes(field)) {
    return { success: false, error: "Invalid field" };
  }

  const account = await PaymentAccount.findOne({
    _id: accountId,
    userId: userObjectId(session.userId),
    isActive: true,
  }).lean();

  if (!account) {
    return { success: false, error: "Account not found" };
  }

  const stored = account[field as keyof typeof account];
  if (!stored) {
    return { success: false, error: "Nothing stored for this field" };
  }

  const value =
    field === "cardNumber" || field === "accountNumber"
      ? decryptSensitive(String(stored))
      : String(stored);

  if (!value) {
    return { success: false, error: "Nothing stored for this field" };
  }

  return { success: true, value };
}

export async function deleteAccountAction(id: string): Promise<ActionResult> {
  const session = await requireSession();

  try {
    await withTransaction(async (dbSession) => {
      const txCount = await LedgerTransaction.countDocuments({
        accountId: id,
        userId: userObjectId(session.userId),
      }).session(dbSession);

      if (txCount > 0) {
        throw new Error("Cannot delete an account with transactions. Deactivate it instead.");
      }

      await PaymentAccount.deleteOne({
        _id: id,
        userId: userObjectId(session.userId),
      }).session(dbSession);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : transactionErrorMessage(error);
    return { success: false, error: message };
  }

  revalidateLedger();
  return { success: true };
}

export async function createTransactionAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = ledgerTransactionSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const data = parsed.data;

  try {
    await withTransaction(async (dbSession) => {
      const account = await getOwnedAccount(session.userId, data.accountId, dbSession);
      if (!account) throw new Error("Account not found");

      await LedgerTransaction.create(
        [
          {
            userId: userObjectId(session.userId),
            accountId: account._id,
            type: data.type,
            amount: data.amount,
            category: data.category,
            merchant: data.merchant ?? "",
            description: data.description ?? "",
            date: data.date,
            notes: data.notes ?? "",
            documentId: data.documentId
              ? new mongoose.Types.ObjectId(data.documentId)
              : undefined,
          },
        ],
        { session: dbSession }
      );

      await adjustAccountBalance(
        account._id,
        account.type as PaymentAccountType,
        data.type,
        data.amount,
        "apply",
        dbSession
      );
    });
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }

  revalidateLedger();
  return { success: true };
}

export async function updateTransactionAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireSession();
  const id = formData.get("id") as string;
  if (!id) return { success: false, error: "Transaction ID required" };

  const parsed = ledgerTransactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const data = parsed.data;

  try {
    await withTransaction(async (dbSession) => {
      const existing = await LedgerTransaction.findOne({
        _id: id,
        userId: userObjectId(session.userId),
      }).session(dbSession);

      if (!existing) throw new Error("Transaction not found");

      const oldAccount = await getOwnedAccount(
        session.userId,
        existing.accountId.toString(),
        dbSession
      );
      const newAccount = await getOwnedAccount(session.userId, data.accountId, dbSession);
      if (!oldAccount || !newAccount) throw new Error("Account not found");

      await adjustAccountBalance(
        oldAccount._id,
        oldAccount.type as PaymentAccountType,
        existing.type as TransactionType,
        existing.amount,
        "revert",
        dbSession
      );

      await LedgerTransaction.findByIdAndUpdate(
        id,
        {
          accountId: newAccount._id,
          type: data.type,
          amount: data.amount,
          category: data.category,
          merchant: data.merchant ?? "",
          description: data.description ?? "",
          date: data.date,
          notes: data.notes ?? "",
        },
        { session: dbSession }
      );

      await adjustAccountBalance(
        newAccount._id,
        newAccount.type as PaymentAccountType,
        data.type,
        data.amount,
        "apply",
        dbSession
      );
    });
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }

  revalidateLedger();
  return { success: true };
}

export async function deleteTransactionAction(id: string): Promise<ActionResult> {
  const session = await requireSession();

  try {
    await withTransaction(async (dbSession) => {
      const existing = await LedgerTransaction.findOne({
        _id: id,
        userId: userObjectId(session.userId),
      }).session(dbSession);

      if (!existing) throw new Error("Transaction not found");

      const account = await getOwnedAccount(
        session.userId,
        existing.accountId.toString(),
        dbSession
      );
      if (!account) throw new Error("Account not found");

      await adjustAccountBalance(
        account._id,
        account.type as PaymentAccountType,
        existing.type as TransactionType,
        existing.amount,
        "revert",
        dbSession
      );

      await LedgerTransaction.deleteOne({ _id: id }).session(dbSession);
    });
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }

  revalidateLedger();
  return { success: true };
}

export async function getPresignedUploadUrlAction(
  fileName: string,
  mimeType: string,
  size: number
): Promise<ActionResult & { uploadUrl?: string; s3Key?: string }> {
  const session = await requireSession();

  if (!isS3Configured()) {
    return { success: false, error: "File storage is not configured" };
  }

  if (size > 10 * 1024 * 1024) {
    return { success: false, error: "File must be under 10 MB" };
  }

  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(mimeType)) {
    return { success: false, error: "Only PDF and image files are supported" };
  }

  try {
    const s3Key = buildDocumentS3Key(session.userId, fileName);
    const uploadUrl = await getPresignedUploadUrl(s3Key, mimeType);
    return { success: true, uploadUrl, s3Key };
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }
}

export async function createDocumentAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult & { documentId?: string }> {
  const session = await requireSession();

  const parsed = documentSchema.safeParse({
    type: formData.get("type"),
    s3Key: formData.get("s3Key"),
    fileName: formData.get("fileName"),
    mimeType: formData.get("mimeType"),
    size: formData.get("size"),
    periodStart: formData.get("periodStart") || undefined,
    periodEnd: formData.get("periodEnd") || undefined,
    accountId: formData.get("accountId") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const data = parsed.data;

  try {
    const [doc] = await withTransaction(async (dbSession) =>
      Document.create(
        [
          {
            userId: userObjectId(session.userId),
            type: data.type,
            s3Key: data.s3Key,
            fileName: data.fileName,
            mimeType: data.mimeType,
            size: data.size,
            periodStart: data.periodStart,
            periodEnd: data.periodEnd,
            accountId: data.accountId
              ? new mongoose.Types.ObjectId(data.accountId)
              : undefined,
            notes: data.notes ?? "",
            manualData: {},
            extractionStatus: "none",
          },
        ],
        { session: dbSession }
      )
    );

    revalidateLedger();
    return { success: true, documentId: doc._id.toString() };
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }
}

export async function updateDocumentManualDataAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireSession();
  const documentId = formData.get("documentId") as string;
  const manualDataRaw = formData.get("manualData") as string;

  if (!documentId) return { success: false, error: "Document ID required" };

  let manualData: Record<string, unknown> = {};
  try {
    manualData = JSON.parse(manualDataRaw || "{}");
  } catch {
    return { success: false, error: "Invalid manual data" };
  }

  try {
    await withTransaction(async (dbSession) => {
      const result = await Document.findOneAndUpdate(
        { _id: documentId, userId: userObjectId(session.userId) },
        { manualData },
        { session: dbSession }
      );
      if (!result) throw new Error("Document not found");
    });
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }

  revalidateLedger();
  return { success: true };
}

export async function getDocumentDownloadUrlAction(
  documentId: string
): Promise<ActionResult & { downloadUrl?: string }> {
  const session = await requireSession();

  if (!isS3Configured()) {
    return { success: false, error: "File storage is not configured" };
  }

  const doc = await Document.findOne({
    _id: documentId,
    userId: userObjectId(session.userId),
  }).lean();

  if (!doc) return { success: false, error: "Document not found" };

  try {
    const downloadUrl = await getPresignedDownloadUrl(doc.s3Key);
    return { success: true, downloadUrl };
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }
}

export async function deleteDocumentAction(id: string): Promise<ActionResult> {
  const session = await requireSession();

  try {
    await withTransaction(async (dbSession) => {
      const doc = await Document.findOne({
        _id: id,
        userId: userObjectId(session.userId),
      }).session(dbSession);

      if (!doc) throw new Error("Document not found");

      await Document.deleteOne({ _id: id }).session(dbSession);

      if (isS3Configured()) {
        await deleteS3Object(doc.s3Key);
      }
    });
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }

  revalidateLedger();
  return { success: true };
}

export async function applySalarySlipDataAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireSession();

  const parsed = salarySlipManualSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const {
    documentId,
    payPeriodMonth,
    payPeriodYear,
    grossSalary,
    tdsDeducted,
    professionalTax,
    pfEsi,
    netInHand,
    bonus,
    taxRegime,
  } = parsed.data;

  const annualInHandSalary = netInHand * 12;
  const annualInHandBonus = bonus ?? 0;
  const userId = userObjectId(session.userId);

  const packageBreakdown = breakdownSalaryPackage({
    annualInHandSalary,
    annualInHandBonus,
    taxRegime,
  });

  const manualData = {
    payPeriodMonth,
    payPeriodYear,
    grossSalary,
    tdsDeducted,
    professionalTax: professionalTax ?? 0,
    pfEsi: pfEsi ?? 0,
    netInHand,
    bonus: annualInHandBonus,
    taxRegime,
    estimatedTotalTax: packageBreakdown.estimatedTotalTax,
    effectiveRate: packageBreakdown.combinedTaxDetail.effectiveRate,
  };

  try {
    await withTransaction(async (dbSession) => {
      const doc = await Document.findOne({
        _id: documentId,
        userId,
        type: "salary_slip",
      }).session(dbSession);

      if (!doc) throw new Error("Salary slip document not found");

      await Document.findByIdAndUpdate(
        documentId,
        { manualData },
        { session: dbSession }
      );

      await User.findByIdAndUpdate(
        session.userId,
        {
          annualInHandSalary,
          annualInHandBonus,
          taxRegime,
          monthlyTakeHome: packageBreakdown.monthlyInHandSalary,
        },
        { session: dbSession }
      );

      await IncomeSource.deleteMany({
        userId,
        name: { $in: ["Monthly Salary (in-hand)", "Annual Bonus (in-hand)"] },
      }).session(dbSession);

      if (annualInHandSalary > 0) {
        await IncomeSource.create(
          [
            {
              userId,
              name: "Monthly Salary (in-hand)",
              type: "salary",
              amount: packageBreakdown.monthlyInHandSalary,
              frequency: "monthly",
              isNetAmount: true,
              grossAmount: packageBreakdown.estimatedGrossSalary / 12,
              estimatedTax: packageBreakdown.estimatedSalaryTax / 12,
              notes: `From salary slip ${payPeriodMonth}/${payPeriodYear} · FY 2025-26 ${taxRegime} regime`,
            },
          ],
          { session: dbSession }
        );
      }

      if (annualInHandBonus > 0) {
        await IncomeSource.create(
          [
            {
              userId,
              name: "Annual Bonus (in-hand)",
              type: "bonus",
              amount: annualInHandBonus,
              frequency: "yearly",
              isNetAmount: true,
              grossAmount: packageBreakdown.estimatedGrossBonus,
              estimatedTax: packageBreakdown.estimatedBonusTax,
              notes: "From salary slip · not spread monthly",
            },
          ],
          { session: dbSession }
        );
      }
    });
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }

  revalidateLedger();
  revalidatePath("/income");
  revalidatePath("/settings");
  return { success: true };
}

export async function saveBillManualDataAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireSession();

  const parsed = billManualSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { documentId, accountId, periodStart, periodEnd, totalDue, minimumDue, dueDate } =
    parsed.data;

  const manualData = {
    accountId,
    periodStart: periodStart?.toISOString(),
    periodEnd: periodEnd?.toISOString(),
    totalDue,
    minimumDue,
    dueDate: dueDate?.toISOString(),
  };

  try {
    await withTransaction(async (dbSession) => {
      const result = await Document.findOneAndUpdate(
        { _id: documentId, userId: userObjectId(session.userId) },
        {
          manualData,
          periodStart,
          periodEnd,
          accountId: accountId ? new mongoose.Types.ObjectId(accountId) : undefined,
        },
        { session: dbSession }
      );
      if (!result) throw new Error("Document not found");
    });
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }

  revalidateLedger();
  return { success: true };
}
