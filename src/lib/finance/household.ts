export const HOUSEHOLD_OWNERS = ["self", "spouse", "joint"] as const;

export type HouseholdOwner = (typeof HOUSEHOLD_OWNERS)[number];

export function formatOwnerLabel(owner: string, spouseName?: string): string {
  switch (owner) {
    case "self":
      return "Mine";
    case "spouse":
      return spouseName?.trim() || "Partner";
    case "joint":
      return "Household";
    default:
      return owner;
  }
}

export function incomeOwnerFormField(spouseName?: string) {
  return {
    name: "owner",
    label: "Whose income?",
    type: "select" as const,
    options: [
      { value: "self", label: "Mine" },
      { value: "spouse", label: spouseName?.trim() || "Partner" },
      { value: "joint", label: "Household (shared)" },
    ],
    defaultValue: "self",
  };
}

export function expenseOwnerFormField(spouseName?: string) {
  return {
    name: "owner",
    label: "Whose expense?",
    type: "select" as const,
    options: [
      { value: "self", label: "Mine" },
      { value: "spouse", label: spouseName?.trim() || "Partner" },
      { value: "joint", label: "Household (shared)" },
    ],
    defaultValue: "joint",
  };
}
