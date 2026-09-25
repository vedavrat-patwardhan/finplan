import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const FamilyGroupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    inviteCode: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true }
);

export type IFamilyGroup = InferSchemaType<typeof FamilyGroupSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const FamilyGroup: Model<IFamilyGroup> =
  mongoose.models.FamilyGroup ?? mongoose.model<IFamilyGroup>("FamilyGroup", FamilyGroupSchema);

const FamilyMembershipSchema = new Schema(
  {
    familyId: { type: Schema.Types.ObjectId, ref: "FamilyGroup", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  },
  { timestamps: true }
);

FamilyMembershipSchema.index({ familyId: 1, userId: 1 }, { unique: true });

export type IFamilyMembership = InferSchemaType<typeof FamilyMembershipSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const FamilyMembership: Model<IFamilyMembership> =
  mongoose.models.FamilyMembership ??
  mongoose.model<IFamilyMembership>("FamilyMembership", FamilyMembershipSchema);
