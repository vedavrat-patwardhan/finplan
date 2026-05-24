/**
 * Indian Income Tax — FY 2025-26 (AY 2026-27)
 * New regime u/s 115BAC (default) + Old regime slabs
 */

export type TaxRegime = "new" | "old";

export interface TaxDeductions {
  section80C?: number;
  section80D?: number;
  hraExemption?: number;
  homeLoanInterest?: number;
  nps80CCD?: number;
}

export interface TaxBreakdown {
  grossIncome: number;
  standardDeduction: number;
  otherDeductions: number;
  taxableIncome: number;
  taxBeforeRebate: number;
  rebate87A: number;
  taxAfterRebate: number;
  cess: number;
  totalTax: number;
  netInHand: number;
  effectiveRate: number;
  regime: TaxRegime;
  slabBreakdown: Array<{ slab: string; rate: number; tax: number }>;
}

const CESS_RATE = 0.04;

const NEW_REGIME_SLABS = [
  { upTo: 400_000, rate: 0 },
  { upTo: 800_000, rate: 0.05 },
  { upTo: 1_200_000, rate: 0.1 },
  { upTo: 1_600_000, rate: 0.15 },
  { upTo: 2_000_000, rate: 0.2 },
  { upTo: 2_400_000, rate: 0.25 },
  { upTo: Infinity, rate: 0.3 },
];

const OLD_REGIME_SLABS = [
  { upTo: 250_000, rate: 0 },
  { upTo: 500_000, rate: 0.05 },
  { upTo: 1_000_000, rate: 0.2 },
  { upTo: Infinity, rate: 0.3 },
];

const NEW_STD_DEDUCTION = 75_000;
const OLD_STD_DEDUCTION = 50_000;
const NEW_REBATE_LIMIT = 1_200_000;
const NEW_REBATE_MAX = 60_000;
const OLD_REBATE_LIMIT = 500_000;
const OLD_REBATE_MAX = 12_500;

function computeSlabTax(
  taxableIncome: number,
  slabs: Array<{ upTo: number; rate: number }>
): { tax: number; breakdown: TaxBreakdown["slabBreakdown"] } {
  let remaining = taxableIncome;
  let prevLimit = 0;
  let tax = 0;
  const breakdown: TaxBreakdown["slabBreakdown"] = [];

  for (const slab of slabs) {
    if (remaining <= 0) break;
    const width = slab.upTo - prevLimit;
    const taxable = Math.min(remaining, width);
    const slabTax = taxable * slab.rate;
    if (taxable > 0) {
      breakdown.push({
        slab: `${formatSlabRange(prevLimit, slab.upTo)}`,
        rate: slab.rate * 100,
        tax: slabTax,
      });
    }
    tax += slabTax;
    remaining -= taxable;
    prevLimit = slab.upTo;
  }

  return { tax, breakdown };
}

function formatSlabRange(from: number, to: number): string {
  if (to === Infinity) return `Above ₹${(from / 100000).toFixed(1)}L`;
  return `₹${(from / 100000).toFixed(1)}L – ₹${(to / 100000).toFixed(1)}L`;
}

function getRebate(taxableIncome: number, taxBeforeRebate: number, regime: TaxRegime): number {
  if (regime === "new") {
    if (taxableIncome <= NEW_REBATE_LIMIT) {
      return Math.min(taxBeforeRebate, NEW_REBATE_MAX);
    }
  } else {
    if (taxableIncome <= OLD_REBATE_LIMIT) {
      return Math.min(taxBeforeRebate, OLD_REBATE_MAX);
    }
  }
  return 0;
}

export function calculateIncomeTax(
  grossAnnualIncome: number,
  regime: TaxRegime = "new",
  deductions: TaxDeductions = {}
): TaxBreakdown {
  const standardDeduction = regime === "new" ? NEW_STD_DEDUCTION : OLD_STD_DEDUCTION;

  const otherDeductions =
    regime === "old"
      ? Math.min(
          (deductions.section80C ?? 0) +
            (deductions.section80D ?? 0) +
            (deductions.hraExemption ?? 0) +
            (deductions.homeLoanInterest ?? 0) +
            (deductions.nps80CCD ?? 0),
          grossAnnualIncome
        )
      : 0;

  const taxableIncome = Math.max(
    0,
    grossAnnualIncome - standardDeduction - otherDeductions
  );

  const slabs = regime === "new" ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;
  const { tax: taxBeforeRebate, breakdown } = computeSlabTax(taxableIncome, slabs);
  const rebate87A = getRebate(taxableIncome, taxBeforeRebate, regime);
  const taxAfterRebate = Math.max(0, taxBeforeRebate - rebate87A);
  const cess = taxAfterRebate * CESS_RATE;
  const totalTax = taxAfterRebate + cess;
  const netInHand = grossAnnualIncome - totalTax;

  return {
    grossIncome: grossAnnualIncome,
    standardDeduction,
    otherDeductions,
    taxableIncome,
    taxBeforeRebate,
    rebate87A,
    taxAfterRebate,
    cess,
    totalTax,
    netInHand,
    effectiveRate: grossAnnualIncome > 0 ? (totalTax / grossAnnualIncome) * 100 : 0,
    regime,
    slabBreakdown: breakdown,
  };
}

/** Estimate gross from known in-hand (after TDS) using binary search */
export function estimateGrossFromNet(
  netAnnual: number,
  regime: TaxRegime = "new",
  deductions: TaxDeductions = {}
): TaxBreakdown {
  if (netAnnual <= 0) {
    return calculateIncomeTax(0, regime, deductions);
  }

  let low = netAnnual;
  let high = netAnnual * 2.5;
  let best = calculateIncomeTax(high, regime, deductions);

  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    const result = calculateIncomeTax(mid, regime, deductions);
    if (result.netInHand < netAnnual) {
      low = mid;
    } else {
      high = mid;
      best = result;
    }
  }

  return best;
}

export interface SalaryPackageInput {
  annualInHandSalary: number;
  annualInHandBonus: number;
  taxRegime: TaxRegime;
  deductions?: TaxDeductions;
}

export interface SalaryPackageBreakdown {
  monthlyInHandSalary: number;
  annualInHandSalary: number;
  annualInHandBonus: number;
  totalInHandAnnual: number;
  estimatedGrossSalary: number;
  estimatedGrossBonus: number;
  estimatedTotalGross: number;
  estimatedSalaryTax: number;
  estimatedBonusTax: number;
  estimatedTotalTax: number;
  taxRegime: TaxRegime;
  salaryTaxDetail: TaxBreakdown;
  bonusTaxDetail: TaxBreakdown;
  combinedTaxDetail: TaxBreakdown;
}

/**
 * Salary and bonus are entered as in-hand (after TDS at source).
 * Estimates gross and tax for each component separately.
 */
export function breakdownSalaryPackage(input: SalaryPackageInput): SalaryPackageBreakdown {
  const { annualInHandSalary, annualInHandBonus, taxRegime, deductions = {} } = input;

  const salaryTaxDetail = estimateGrossFromNet(annualInHandSalary, taxRegime, deductions);

  // Bonus taxed at marginal rate — estimate using combined income marginal slab
  const combinedGrossEstimate =
    salaryTaxDetail.grossIncome + (annualInHandBonus > 0 ? annualInHandBonus * 1.35 : 0);
  const combinedTaxDetail = calculateIncomeTax(combinedGrossEstimate, taxRegime, deductions);

  const bonusTaxDetail =
    annualInHandBonus > 0
      ? estimateGrossFromNet(annualInHandBonus, taxRegime, {})
      : calculateIncomeTax(0, taxRegime, deductions);

  const estimatedTotalTax =
    combinedTaxDetail.totalTax;
  const estimatedSalaryTax =
    annualInHandSalary > 0
      ? salaryTaxDetail.totalTax
      : 0;
  const estimatedBonusTax =
    annualInHandBonus > 0
      ? Math.max(0, estimatedTotalTax - estimatedSalaryTax)
      : 0;

  return {
    monthlyInHandSalary: annualInHandSalary / 12,
    annualInHandSalary,
    annualInHandBonus,
    totalInHandAnnual: annualInHandSalary + annualInHandBonus,
    estimatedGrossSalary: salaryTaxDetail.grossIncome,
    estimatedGrossBonus: bonusTaxDetail.grossIncome,
    estimatedTotalGross: salaryTaxDetail.grossIncome + bonusTaxDetail.grossIncome,
    estimatedSalaryTax,
    estimatedBonusTax,
    estimatedTotalTax,
    taxRegime,
    salaryTaxDetail,
    bonusTaxDetail,
    combinedTaxDetail,
  };
}

export function compareTaxRegimes(
  grossAnnualIncome: number,
  deductions: TaxDeductions = {}
): { newRegime: TaxBreakdown; oldRegime: TaxBreakdown; recommended: TaxRegime } {
  const newRegime = calculateIncomeTax(grossAnnualIncome, "new", deductions);
  const oldRegime = calculateIncomeTax(grossAnnualIncome, "old", deductions);
  return {
    newRegime,
    oldRegime,
    recommended: newRegime.totalTax <= oldRegime.totalTax ? "new" : "old",
  };
}
