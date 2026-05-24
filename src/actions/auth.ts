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
};

export async function registerAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { email, username, password, name } = parsed.data;

  await connectDB();

  const existing = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existing) {
    return { success: false, error: "Email or username already exists" };
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
  formData: FormData
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { identifier, password } = parsed.data;

  await connectDB();

  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
  });

  if (!user) {
    return { success: false, error: "Invalid credentials" };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { success: false, error: "Invalid credentials" };
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
