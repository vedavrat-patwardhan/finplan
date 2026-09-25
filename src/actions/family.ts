"use server";

import { randomBytes } from "crypto";
import mongoose from "mongoose";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { connectDB } from "@/lib/db/mongoose";
import { FamilyGroup, FamilyMembership } from "@/lib/db/models";
import { withTransaction, transactionErrorMessage } from "@/lib/db/transaction";
import type { ActionResult } from "./auth";

const familyNameSchema = z.string().trim().min(2).max(80);
const inviteCodeSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{16}$/);
const VIEW_COOKIE = "finplan_dashboard_view";

function revalidateFamilyPages() {
  revalidatePath("/family");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
}

export async function createFamilyAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const name = familyNameSchema.safeParse(formData.get("name"));
  if (!name.success) return { success: false, error: "Enter a family name (2–80 characters)." };

  const userId = new mongoose.Types.ObjectId(session.userId);
  try {
    await withTransaction(async (dbSession) => {
      const existing = await FamilyMembership.findOne({ userId }).session(dbSession).lean();
      if (existing) throw new Error("You already belong to a family.");
      const [family] = await FamilyGroup.create([{
        name: name.data,
        ownerUserId: userId,
        inviteCode: randomBytes(12).toString("base64url"),
      }], { session: dbSession });
      await FamilyMembership.create([{ familyId: family._id, userId }], { session: dbSession });
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error && error.message === "You already belong to a family."
        ? error.message : transactionErrorMessage(error),
    };
  }
  revalidateFamilyPages();
  return { success: true };
}

export async function joinFamilyAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const code = inviteCodeSchema.safeParse(formData.get("inviteCode"));
  if (!code.success) return { success: false, error: "Enter the 16-character invite code." };

  const userId = new mongoose.Types.ObjectId(session.userId);
  try {
    await withTransaction(async (dbSession) => {
      const existing = await FamilyMembership.findOne({ userId }).session(dbSession).lean();
      if (existing) throw new Error("You already belong to a family.");
      const family = await FamilyGroup.findOne({ inviteCode: code.data }).session(dbSession).lean();
      if (!family) throw new Error("Invite code not found. Ask for a new link.");
      const memberCount = await FamilyMembership.countDocuments({ familyId: family._id }).session(dbSession);
      if (memberCount >= 12) throw new Error("This family has reached its 12-member limit.");
      await FamilyMembership.create([{ familyId: family._id, userId }], { session: dbSession });
    });
  } catch (error) {
    const known = ["You already belong to a family.", "Invite code not found. Ask for a new link.", "This family has reached its 12-member limit."];
    return { success: false, error: error instanceof Error && known.includes(error.message)
      ? error.message : transactionErrorMessage(error) };
  }
  revalidateFamilyPages();
  return { success: true };
}

export async function setDashboardViewAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const requested = String(formData.get("view") ?? "personal");
  const view = requested === "family" ? "family" : "personal";
  if (view === "family") {
    await connectDB();
    const membership = await FamilyMembership.exists({ userId: new mongoose.Types.ObjectId(session.userId) });
    if (!membership) redirect("/dashboard");
  }
  (await cookies()).set(VIEW_COOKIE, view, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/dashboard");
}

export async function rotateFamilyInviteAction(): Promise<void> {
  const session = await requireSession();
  await connectDB();
  const userId = new mongoose.Types.ObjectId(session.userId);
  const membership = await FamilyMembership.findOne({ userId }).lean();
  if (!membership) return;
  await FamilyGroup.updateOne(
    { _id: membership.familyId, ownerUserId: userId },
    { $set: { inviteCode: randomBytes(12).toString("base64url") } }
  );
  revalidateFamilyPages();
}

export async function removeFamilyMemberAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const targetId = String(formData.get("userId") ?? "");
  if (!mongoose.isValidObjectId(targetId) || targetId === session.userId) return;
  await connectDB();
  const ownerUserId = new mongoose.Types.ObjectId(session.userId);
  const membership = await FamilyMembership.findOne({ userId: ownerUserId }).lean();
  if (!membership) return;
  const family = await FamilyGroup.findOne({
    _id: membership.familyId,
    ownerUserId,
  }).lean();
  if (!family) return;
  await FamilyMembership.deleteOne({
    familyId: family._id,
    userId: new mongoose.Types.ObjectId(targetId),
  });
  revalidateFamilyPages();
}

export async function leaveFamilyAction(): Promise<void> {
  const session = await requireSession();
  await connectDB();
  const userId = new mongoose.Types.ObjectId(session.userId);
  const membership = await FamilyMembership.findOne({ userId }).lean();
  if (!membership) return;
  const family = await FamilyGroup.findById(membership.familyId).lean();
  if (!family || family.ownerUserId.equals(userId)) return;
  await FamilyMembership.deleteOne({ _id: membership._id, userId });
  (await cookies()).set(VIEW_COOKIE, "personal", { httpOnly: true, sameSite: "lax", path: "/" });
  revalidateFamilyPages();
}
