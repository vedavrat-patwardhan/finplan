import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { EXPENSE_CATEGORIES, EXPENSE_CLASSES, FREQUENCIES } from "@/lib/finance/constants";

const ExpenseSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    expenseClass: { type: String, enum: EXPENSE_CLASSES, required: true },
    amount: { type: Number, required: true, min: 0 },
    frequency: { type: String, enum: FREQUENCIES, required: true },
    isEssential: { type: Boolean, default: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export type IExpense = InferSchemaType<typeof ExpenseSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Expense: Model<IExpense> =
  mongoose.models.Expense ?? mongoose.model<IExpense>("Expense", ExpenseSchema);
