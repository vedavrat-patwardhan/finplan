import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";

export async function withTransaction<T>(
  fn: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  await connectDB();
  const session = await mongoose.startSession();

  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export function transactionErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.includes("Transaction")) {
    return "Something went wrong while saving. No changes were applied — please try again.";
  }
  return "Something went wrong while saving. Please try again.";
}
