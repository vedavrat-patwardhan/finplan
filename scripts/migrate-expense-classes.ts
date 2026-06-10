/**
 * One-time migration: fixed → obligation, recurring → routine,
 * optional → discretionary, variable → adhoc
 *
 * Run: npx tsx scripts/migrate-expense-classes.ts
 */
import mongoose from "mongoose";
import { LEGACY_EXPENSE_CLASS_MAP } from "../src/lib/finance/expense-classes";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const collection = mongoose.connection.collection("expenses");

  for (const [legacy, next] of Object.entries(LEGACY_EXPENSE_CLASS_MAP)) {
    const result = await collection.updateMany(
      { expenseClass: legacy },
      { $set: { expenseClass: next } }
    );
    if (result.modifiedCount > 0) {
      console.log(`${legacy} → ${next}: ${result.modifiedCount} documents`);
    }
  }

  await mongoose.disconnect();
  console.log("Expense class migration complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
