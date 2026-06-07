import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { GOAL_TYPES } from "@/lib/finance/constants";

const GoalDetailsSchema = new Schema(
  {
    propertyValue: { type: Number, min: 0 },
    downPaymentPct: { type: Number, min: 0, max: 100 },
    stampDutyPct: { type: Number, min: 0, max: 100 },
    registrationPct: { type: Number, min: 0, max: 100 },
    includeClosingCosts: { type: Boolean },
    monthlyExpenseAtRetirement: { type: Number, min: 0 },
    corpusMultiplier: { type: Number, min: 1, max: 50 },
    retirementAge: { type: Number, min: 18, max: 100 },
    currentAge: { type: Number, min: 18, max: 100 },
    monthsOfExpenses: { type: Number, min: 1, max: 24 },
    monthlyExpenseBasis: { type: Number, min: 0 },
    yearsUntilCourse: { type: Number, min: 0, max: 30 },
    courseDurationYears: { type: Number, min: 1, max: 10 },
    annualCostToday: { type: Number, min: 0 },
    educationInflationPct: { type: Number, min: 0, max: 30 },
    onRoadPrice: { type: Number, min: 0 },
    carDownPaymentPct: { type: Number, min: 0, max: 100 },
    exchangeValue: { type: Number, min: 0 },
    estimatedBudget: { type: Number, min: 0 },
    oneTimeSetupCost: { type: Number, min: 0 },
    firstYearMonthlyCost: { type: Number, min: 0 },
  },
  { _id: false }
);

const LifeGoalSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    goalType: { type: String, enum: GOAL_TYPES, required: true },
    status: { type: String, enum: ["active", "completed"], default: "active" },
    targetMode: { type: String, enum: ["manual", "calculated"], default: "manual" },
    targetAmount: { type: Number, required: true, min: 0 },
    targetDate: { type: Date },
    currentSaved: { type: Number, default: 0, min: 0 },
    monthlyContribution: { type: Number, default: 0, min: 0 },
    inflationRate: { type: Number, min: 0, max: 30 },
    expectedReturnPct: { type: Number, min: 0, max: 30 },
    stepUpPct: { type: Number, min: 0, max: 50 },
    priorityTier: { type: Number, min: 1, max: 3, default: 2 },
    details: { type: GoalDetailsSchema, default: undefined },
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

if (process.env.NODE_ENV !== "production" && mongoose.models.LifeGoal) {
  mongoose.deleteModel("LifeGoal");
}

export const LifeGoal: Model<ILifeGoal> =
  mongoose.models.LifeGoal ?? mongoose.model<ILifeGoal>("LifeGoal", LifeGoalSchema);
