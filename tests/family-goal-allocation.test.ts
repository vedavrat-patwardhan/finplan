import assert from "node:assert/strict";
import { test } from "node:test";
import { allocateFamilyGoal } from "../src/lib/finance/family-goal-allocation";

test("splits a common monthly goal by income ratio", () => {
  const shares = allocateFamilyGoal(15000, [
    { userId: "a", monthlyIncome: 90000 },
    { userId: "b", monthlyIncome: 60000 },
  ]);
  assert.deepEqual(shares, [
    { userId: "a", monthlyAmount: 9000, percentage: 60 },
    { userId: "b", monthlyAmount: 6000, percentage: 40 },
  ]);
});

test("paise rounding preserves the exact monthly total", () => {
  const shares = allocateFamilyGoal(100, [
    { userId: "a", monthlyIncome: 1 },
    { userId: "b", monthlyIncome: 1 },
    { userId: "c", monthlyIncome: 1 },
  ]);
  assert.deepEqual(shares.map((share) => share.monthlyAmount), [33.34, 33.33, 33.33]);
  assert.equal(shares.reduce((sum, share) => sum + share.monthlyAmount, 0), 100);
});

test("uses equal shares when nobody has recorded income", () => {
  const shares = allocateFamilyGoal(501, [
    { userId: "a", monthlyIncome: 0 },
    { userId: "b", monthlyIncome: -10 },
  ]);
  assert.deepEqual(shares.map((share) => share.monthlyAmount), [250.5, 250.5]);
  assert.deepEqual(shares.map((share) => share.percentage), [50, 50]);
});
