export interface FamilyIncomeShare {
  userId: string;
  monthlyIncome: number;
}

export interface GoalContributionShare {
  userId: string;
  monthlyAmount: number;
  percentage: number;
}

/** Split a shared goal in paise so displayed contributions always sum exactly. */
export function allocateFamilyGoal(
  monthlyAmount: number,
  members: FamilyIncomeShare[]
): GoalContributionShare[] {
  if (members.length === 0) return [];
  const totalPaise = Math.max(0, Math.round(monthlyAmount * 100));
  const positiveIncome = members.map((member) => Math.max(0, member.monthlyIncome));
  const totalIncome = positiveIncome.reduce((sum, income) => sum + income, 0);
  const weights = totalIncome > 0 ? positiveIncome : members.map(() => 1);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const exact = weights.map((weight) => totalPaise * weight / totalWeight);
  const paise = exact.map(Math.floor);
  const remaining = totalPaise - paise.reduce((sum, amount) => sum + amount, 0);
  const byRemainder = exact.map((amount, index) => ({ index, remainder: amount - paise[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let index = 0; index < remaining; index += 1) {
    paise[byRemainder[index].index] += 1;
  }
  return members.map((member, index) => ({
    userId: member.userId,
    monthlyAmount: paise[index] / 100,
    percentage: weights[index] / totalWeight * 100,
  }));
}
