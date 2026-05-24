import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { GOAL_TYPES } from "@/lib/finance/constants";

const LifeGoalSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    goalType: { type: String, enum: GOAL_TYPES, required: true },
    targetAmount: { type: Number, required: true, min: 0 },
    targetDate: { type: Date, required: true },
    currentSaved: { type: Number, default: 0, min: 0 },
    monthlyContribution: { type: Number, default: 0, min: 0 },
    assumptions: {
      inflationRate: { type: Number },
      notes: { type: String },
    },
    priority: { type: Number, default: 0 },
  },
  { timestamps: true }
);

LifeGoalSchema.index({ userId: 1, targetDate: 1 });

export type ILifeGoal = InferSchemaType<typeof LifeGoalSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const LifeGoal: Model<ILifeGoal> =
  mongoose.models.LifeGoal ?? mongoose.model<ILifeGoal>("LifeGoal", LifeGoalSchema);
