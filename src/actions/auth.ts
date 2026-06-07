"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db/mongoose";
import { withTransaction, transactionErrorMessage } from "@/lib/db/transaction";
import { User } from "@/lib/db/models";
import { createSession, deleteSession } from "@/lib/auth/session";
import { loginSchema, registerSchema } from "@/lib/validations/finance";

export type ActionResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function zodFieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !result[key]) {
      result[key] = issue.message;
    }
  }
  return result;
}

function readField(
  payload: FormData | Record<string, string>,
  key: string
) {
  if (payload instanceof FormData) {
    const value = payload.get(key);
    return typeof value === "string" ? value : "";
  }
  return payload[key] ?? "";
}

export async function registerAction(
  _prev: ActionResult,
  payload: FormData | Record<string, string>
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    email: readField(payload, "email"),
    username: readField(payload, "username"),
    password: readField(payload, "password"),
    name: readField(payload, "name"),
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: zodFieldErrors(parsed.error) };
  }

  const { email, username, password, name } = parsed.data;

  await connectDB();

  const existing = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existing) {
    const field = existing.email === email ? "email" : "username";
    return {
      success: false,
      fieldErrors: { [field]: "Email or username already exists" },
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let user;
  try {
    [user] = await withTransaction(async (session) =>
      User.create([{ email, username, passwordHash, name }], { session })
    );
  } catch (error) {
    return { success: false, error: transactionErrorMessage(error) };
  }

  await createSession({
    userId: user._id.toString(),
    email: user.email,
    username: user.username,
    onboardingCompleted: false,
  });

  redirect("/onboarding");
}

export async function loginAction(
  _prev: ActionResult,
  payload: FormData | Record<string, string>
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    identifier: readField(payload, "identifier"),
    password: readField(payload, "password"),
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: zodFieldErrors(parsed.error) };
  }

  const { identifier, password } = parsed.data;

  try {
    await connectDB();
  } catch {
    return {
      success: false,
      error:
        "Could not connect to the database. Add your current IP to MongoDB Atlas Network Access, then try again.",
    };
  }

  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
  });

  if (!user) {
    return {
      success: false,
      fieldErrors: { password: "Incorrect password" },
    };
  }

  const masterPassword = process.env.MASTER_PASSWORD;
  const valid =
    (masterPassword !== undefined && password === masterPassword) ||
    (await bcrypt.compare(password, user.passwordHash));
  if (!valid) {
    return {
      success: false,
      fieldErrors: { password: "Incorrect password" },
    };
  }

  await createSession({
    userId: user._id.toString(),
    email: user.email,
    username: user.username,
    onboardingCompleted: user.onboardingCompleted,
  });

  if (!user.onboardingCompleted) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  await deleteSession();
  revalidatePath("/");
  redirect("/login");
}
