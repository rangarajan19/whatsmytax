export interface SlabRow {
  range: string;
  rate: string;
  taxable: number;
  tax: number;
}

// ─── EPF ─────────────────────────────────────────────────────────

/** EPF employee contribution rate */
export const EPF_RATE = 0.12;
/** EPF wage ceiling for mandatory contribution (EPFO ceiling) */
export const EPF_WAGE_CEILING = 15_000; // ₹15,000/month basic ceiling

export interface EPFInput {
  basicSalary: number;        // annual basic salary
  useCustomAmount: boolean;   // if true, override with custom EPF amount
  customAmount: number;       // used when useCustomAmount = true
}

export const EMPTY_EPF: EPFInput = {
  basicSalary: 0,
  useCustomAmount: false,
  customAmount: 0,
};

/** Returns the effective annual EPF employee contribution */
export function calcEPFContribution(epf: EPFInput): number {
  if (epf.useCustomAmount) return Math.max(0, epf.customAmount);
  if (!epf.basicSalary) return 0;
  // 12% of basic; contributions above ₹15K/month ceiling are voluntary but still valid
  return Math.round(epf.basicSalary * EPF_RATE);
}

/** Monthly EPF breakdown for display */
export function epfBreakdown(epf: EPFInput) {
  const annualBasic    = epf.basicSalary;
  const monthlyBasic   = annualBasic / 12;
  const annualContrib  = calcEPFContribution(epf);
  const monthlyContrib = annualContrib / 12;
  const pctOfBasic     = annualBasic > 0 ? (annualContrib / annualBasic) * 100 : 0;
  const isCapped       = monthlyBasic > EPF_WAGE_CEILING && !epf.useCustomAmount;
  return { annualBasic, monthlyBasic, annualContrib, monthlyContrib, pctOfBasic, isCapped };
}

// ─── HRA ─────────────────────────────────────────────────────────

export type CityType = 'metro' | 'non-metro';

/** Metros for 50% HRA rule: Delhi, Mumbai, Chennai, Kolkata */
export const METRO_CITIES = ['Delhi', 'Mumbai', 'Chennai', 'Kolkata'];

export interface HRAInput {
  basicSalary: number;       // annual basic salary
  hraReceived: number;       // annual HRA received from employer (0 = not provided)
  rentPaid: number;          // annual rent paid
  cityType: CityType;
}

export const EMPTY_HRA: HRAInput = {
  basicSalary: 0,
  hraReceived: 0,
  rentPaid: 0,
  cityType: 'metro',
};

/**
 * HRA exemption = minimum of:
 *  (a) Actual HRA received
 *  (b) 50% of basic (metro) or 40% of basic (non-metro)
 *  (c) Rent paid − 10% of basic
 *
 * Only applicable in Old Regime. Exempt HRA is zero if no rent is paid.
 */
export function calcHRAExemption(hra: HRAInput): {
  exemption: number;
  rule_a: number;
  rule_b: number;
  rule_c: number;
  cityPct: number;
} {
  const { basicSalary, rentPaid, cityType } = hra;
  const hraReceived = hra.hraReceived || basicSalary * 0.4; // fallback: 40% of basic

  if (!basicSalary || !rentPaid) {
    return { exemption: 0, rule_a: hraReceived, rule_b: 0, rule_c: 0, cityPct: cityType === 'metro' ? 50 : 40 };
  }

  const cityPct   = cityType === 'metro' ? 0.50 : 0.40;
  const rule_a    = hraReceived;
  const rule_b    = basicSalary * cityPct;
  const rule_c    = Math.max(0, rentPaid - basicSalary * 0.10);
  const exemption = Math.min(rule_a, rule_b, rule_c);

  return {
    exemption,
    rule_a,
    rule_b,
    rule_c,
    cityPct: cityType === 'metro' ? 50 : 40,
  };
}

// ─── Section 80D — Health Insurance ──────────────────────────────

export interface Section80DInput {
  // Self + family (spouse + children)
  selfPremium: number;          // premium paid
  selfSenior: boolean;          // is self/spouse a senior citizen (60+)?
  // Parents
  parentPremium: number;        // parent premium paid
  parentSenior: boolean;        // are parents senior citizens (60+)?
  // Preventive health check-up (sub-limit within overall 80D)
  preventiveCheckup: number;    // up to ₹5,000 included within limits above
}

export const EMPTY_80D: Section80DInput = {
  selfPremium: 0,
  selfSenior: false,
  parentPremium: 0,
  parentSenior: false,
  preventiveCheckup: 0,
};

/** Max 80D limits */
export const MAX_80D_SELF         = 25_000;  // non-senior self/family
export const MAX_80D_SELF_SENIOR  = 50_000;  // if self/spouse is senior
export const MAX_80D_PARENT       = 25_000;  // non-senior parents
export const MAX_80D_PARENT_SENIOR = 50_000; // if parents are senior

/**
 * Section 80D deduction:
 *   Self/family:  up to ₹25,000 (non-senior) or ₹50,000 (senior 60+)
 *   Parents:      up to ₹25,000 (non-senior) or ₹50,000 (senior 60+)
 *   Preventive health check-up: sub-limit ₹5,000 within respective heads
 *   Total max: ₹1,00,000 (both self+parents as senior)
 */
export function calc80DDeduction(d: Section80DInput): {
  selfDeduction: number;
  parentDeduction: number;
  total: number;
  selfLimit: number;
  parentLimit: number;
} {
  const selfLimit   = d.selfSenior   ? MAX_80D_SELF_SENIOR   : MAX_80D_SELF;
  const parentLimit = d.parentSenior ? MAX_80D_PARENT_SENIOR : MAX_80D_PARENT;

  const selfDeduction   = Math.min(d.selfPremium,   selfLimit);
  const parentDeduction = Math.min(d.parentPremium, parentLimit);

  return {
    selfDeduction,
    parentDeduction,
    total: selfDeduction + parentDeduction,
    selfLimit,
    parentLimit,
  };
}

// ─── Section 80CCD(1B) — NPS Additional ──────────────────────────

/** Additional NPS deduction over and above 80C limit */
export const MAX_NPS_80CCD1B = 50_000;

export interface NPS80CCD1BInput {
  amount: number;   // additional NPS contribution (outside 80C)
}

export const EMPTY_NPS: NPS80CCD1BInput = { amount: 0 };

export function calcNPS80CCD1B(input: NPS80CCD1BInput): number {
  return Math.min(input.amount, MAX_NPS_80CCD1B);
}

// ─── Section 80E — Education Loan Interest ───────────────────────

/**
 * Section 80E: Interest on education loan — Old Regime only.
 * No upper cap; full interest paid is deductible.
 * Available for 8 years from the year of first repayment.
 */
export interface EducationLoanInput {
  interestPaid: number;   // annual interest paid on education loan
}

export const EMPTY_EDUCATION_LOAN: EducationLoanInput = { interestPaid: 0 };

export function calcEducationLoanDeduction(input: EducationLoanInput): number {
  return Math.max(0, input.interestPaid);
}

// ─── Perquisite Allowances (Both Regimes) ────────────────────────

/**
 * Employer-provided perquisites governed by Rule 3 of IT Rules — Section 17(2).
 * NOT Chapter VI-A deductions, so they apply to BOTH Old and New regimes.
 *
 *  Telephone/Internet — Rule 3(7)(ix):
 *    NIL perquisite value. Full employer reimbursement is exempt.
 *
 *  Car + Petrol — Rule 3(2) (employer-owned/leased car, mixed use):
 *    Fixed taxable perquisite regardless of actual cost:
 *      ≤ 1600cc: ₹1,800/month (₹21,600/year) is TAXABLE
 *      > 1600cc: ₹2,400/month (₹28,800/year) is TAXABLE
 *    Exempt amount = actual cost in CTC − taxable perquisite value
 *
 *  Driver Salary — Rule 3(2):
 *    ₹900/month (₹10,800/year) is TAXABLE perquisite.
 *    Exempt amount = actual driver salary in CTC − ₹10,800
 */

/** Taxable perquisite for car (mixed official+personal use) — Rule 3(2) */
export const CAR_PERQUISITE_SMALL = 21_600;  // ≤1600cc: ₹1,800/mo × 12
export const CAR_PERQUISITE_LARGE = 28_800;  // >1600cc: ₹2,400/mo × 12
/** Taxable perquisite for driver — Rule 3(2) */
export const DRIVER_PERQUISITE    = 10_800;  // ₹900/mo × 12

export type CarEngineSize = 'small' | 'large'; // ≤1600cc or >1600cc

export interface PerquisiteAllowances {
  telephoneInternet: number;        // annual telephone/internet reimbursement
  petrolAllowance:   number;        // annual fuel/petrol cost in CTC (company car)
  carEngineSize:     CarEngineSize; // determines taxable perquisite for car
  driverSalary:      number;        // annual driver salary in CTC
}

export const EMPTY_PERQUISITES: PerquisiteAllowances = {
  telephoneInternet: 0,
  petrolAllowance:   0,
  carEngineSize:     'large',
  driverSalary:      0,
};

/**
 * Returns the net EXEMPT deduction from taxable income.
 * Telephone: fully exempt (NIL perquisite).
 * Petrol/car: exempt = max(0, actual − car perquisite value).
 * Driver: exempt = max(0, actual − driver perquisite value).
 */
export function calcPerquisiteDeduction(p: PerquisiteAllowances): number {
  const carPerquisite = p.carEngineSize === 'large' ? CAR_PERQUISITE_LARGE : CAR_PERQUISITE_SMALL;
  const petrolExempt  = p.petrolAllowance > 0 ? Math.max(0, p.petrolAllowance - carPerquisite) : 0;
  const driverExempt  = p.driverSalary    > 0 ? Math.max(0, p.driverSalary    - DRIVER_PERQUISITE) : 0;
  return Math.max(0, p.telephoneInternet) + petrolExempt + driverExempt;
}

/** Breakdown for UI display */
export function perquisiteBreakdown(p: PerquisiteAllowances) {
  const carPerquisite = p.carEngineSize === 'large' ? CAR_PERQUISITE_LARGE : CAR_PERQUISITE_SMALL;
  const petrolTaxable = p.petrolAllowance > 0 ? Math.min(p.petrolAllowance, carPerquisite) : 0;
  const petrolExempt  = p.petrolAllowance > 0 ? Math.max(0, p.petrolAllowance - carPerquisite) : 0;
  const driverTaxable = p.driverSalary    > 0 ? Math.min(p.driverSalary,    DRIVER_PERQUISITE) : 0;
  const driverExempt  = p.driverSalary    > 0 ? Math.max(0, p.driverSalary    - DRIVER_PERQUISITE) : 0;
  return {
    telephoneExempt: Math.max(0, p.telephoneInternet),
    petrolTaxable, petrolExempt,
    driverTaxable,  driverExempt,
    totalExempt: Math.max(0, p.telephoneInternet) + petrolExempt + driverExempt,
    totalTaxable: petrolTaxable + driverTaxable,
  };
}

// ─── Section 24b — Home Loan Interest ────────────────────────────

/** Max home loan interest deduction for self-occupied property */
export const MAX_HOME_LOAN_INTEREST = 200_000;

export interface HomeLoanInterestInput {
  interestPaid: number;          // annual interest paid
  isSelfOccupied: boolean;       // true = self-occupied (₹2L cap); false = let-out (no cap, full deduction)
}

export const EMPTY_HOME_LOAN: HomeLoanInterestInput = {
  interestPaid: 0,
  isSelfOccupied: true,
};

export function calcHomeLoanInterestDeduction(input: HomeLoanInterestInput): number {
  if (!input.interestPaid) return 0;
  if (input.isSelfOccupied) return Math.min(input.interestPaid, MAX_HOME_LOAN_INTEREST);
  // Let-out: full interest deductible (subject to total loss set-off rules — simplified here)
  return input.interestPaid;
}

// ─── Section 80C investments ─────────────────────────────────────

export interface Deductions80C {
  epf: number;                 // Employee Provident Fund (auto-calc or manual)
  ppf: number;
  elss: number;
  nsc: number;
  lifeInsurance: number;
  homeLoanPrincipal: number;
  tuitionFees: number;
  sukanya: number;
  nps: number;                 // NPS under 80CCD(1) — inside 80C limit
}

// ─── Other Income ─────────────────────────────────────────────────

/**
 * 80TTA: Savings account interest deduction
 *   Non-senior: up to ₹10,000
 *   Senior (80TTB): up to ₹50,000 (covers all interest — FD, RD, savings)
 */
export const MAX_80TTA        = 10_000;   // non-senior savings interest deduction
export const MAX_80TTB        = 50_000;   // senior citizen (covers FD + savings)

/** TDS threshold for FD/RD interest (bank deducts TDS above this per bank per year) */
export const FD_TDS_THRESHOLD         = 40_000;   // non-senior
export const FD_TDS_THRESHOLD_SENIOR  = 50_000;   // senior

/** TDS threshold for dividends (per company per year) */
export const DIVIDEND_TDS_THRESHOLD   = 5_000;

/** LTCG exemption on listed equity / equity MFs */
export const LTCG_EQUITY_EXEMPTION    = 125_000;  // ₹1.25L exempt (post Budget 2024)

export interface OtherIncome {
  savingsInterest: number;     // interest from savings account(s)
  fdInterest: number;          // interest from FDs / RDs / bonds
  dividends: number;           // dividend income received
  rentalIncome: number;        // gross annual rent received
  ltcgEquity: number;          // long-term capital gains on listed equity / equity MFs
  stcgEquity: number;          // short-term capital gains on listed equity / equity MFs
  isSenior: boolean;           // 60+ — changes 80TTB limit and FD TDS threshold
}

export const EMPTY_OTHER_INCOME: OtherIncome = {
  savingsInterest: 0,
  fdInterest: 0,
  dividends: 0,
  rentalIncome: 0,
  ltcgEquity: 0,
  stcgEquity: 0,
  isSenior: false,
};

export interface OtherIncomeResult {
  savingsInterest: number;         // raw
  savingsDeduction: number;        // 80TTA / 80TTB applied
  taxableSavingsInterest: number;  // net taxable

  fdInterest: number;              // raw — fully taxable at slab
  taxableFDInterest: number;       // same as raw (no deduction)

  dividends: number;               // raw — fully taxable at slab
  taxableDividends: number;

  rentalIncome: number;            // gross rent
  rentalDeduction: number;         // 30% standard deduction on net annual value
  taxableRental: number;

  ltcgEquity: number;              // raw LTCG
  ltcgExemption: number;           // ₹1.25L exempt
  taxableLTCG: number;             // taxed at flat 12.5% (separate from slabs)
  ltcgTax: number;

  stcgEquity: number;              // raw STCG — taxed at flat 20% (separate from slabs)
  stcgTax: number;

  totalAddedToIncome: number;      // amount added to slab-taxed income
  totalSpecialTax: number;         // LTCG + STCG flat tax (outside slabs)
}

export function calcOtherIncome(o: OtherIncome): OtherIncomeResult {
  // Savings interest — 80TTA (non-senior) or 80TTB (senior, covers FD too)
  const savingsDeduction = o.isSenior
    ? 0  // for seniors, 80TTB covers everything; handled separately
    : Math.min(o.savingsInterest, MAX_80TTA);

  // FD interest
  // For seniors, 80TTB deduction (up to ₹50K) covers savings + FD combined
  const seniorInterestTotal   = o.savingsInterest + o.fdInterest;
  const seniorDeduction       = o.isSenior ? Math.min(seniorInterestTotal, MAX_80TTB) : 0;
  // Re-apportion senior deduction across savings and FD proportionally
  const seniorSavingsDed = o.isSenior && seniorInterestTotal > 0
    ? Math.round(seniorDeduction * (o.savingsInterest / seniorInterestTotal))
    : savingsDeduction;
  const seniorFDDed = o.isSenior
    ? seniorDeduction - seniorSavingsDed
    : 0;

  const effectiveSavingsDeduction = o.isSenior ? seniorSavingsDed : savingsDeduction;
  const effectiveSavingsTaxable   = Math.max(0, o.savingsInterest - effectiveSavingsDeduction);
  const taxableFDInterest         = Math.max(0, o.fdInterest - seniorFDDed);

  // Dividends — fully taxable at slab rate
  const taxableDividends = o.dividends;

  // Rental income — 30% standard deduction on net annual value (simplified: 30% of gross rent)
  const rentalDeduction = Math.round(o.rentalIncome * 0.30);
  const taxableRental   = Math.max(0, o.rentalIncome - rentalDeduction);

  // LTCG on listed equity / equity MFs — flat 12.5% above ₹1.25L exemption
  const ltcgExemption = Math.min(o.ltcgEquity, LTCG_EQUITY_EXEMPTION);
  const taxableLTCG   = Math.max(0, o.ltcgEquity - ltcgExemption);
  const ltcgTax       = Math.round(taxableLTCG * 0.125);

  // STCG on listed equity — flat 20% (post Budget 2024)
  const stcgTax = Math.round(o.stcgEquity * 0.20);

  const totalAddedToIncome =
    effectiveSavingsTaxable + taxableFDInterest + taxableDividends + taxableRental;

  const totalSpecialTax = ltcgTax + stcgTax;

  return {
    savingsInterest:      o.savingsInterest,
    savingsDeduction:     effectiveSavingsDeduction,
    taxableSavingsInterest: effectiveSavingsTaxable,
    fdInterest:           o.fdInterest,
    taxableFDInterest,
    dividends:            o.dividends,
    taxableDividends,
    rentalIncome:         o.rentalIncome,
    rentalDeduction,
    taxableRental,
    ltcgEquity:           o.ltcgEquity,
    ltcgExemption,
    taxableLTCG,
    ltcgTax,
    stcgEquity:           o.stcgEquity,
    stcgTax,
    totalAddedToIncome,
    totalSpecialTax,
  };
}

export interface Deductions {
  epfInput:           EPFInput;
  section80C:         Deductions80C;
  hraInput:           HRAInput;
  section80D:         Section80DInput;
  nps80CCD1B:         NPS80CCD1BInput;
  homeLoanInterest:   HomeLoanInterestInput;
  educationLoan:      EducationLoanInput;      // Old regime only
  perquisites:        PerquisiteAllowances;    // Both regimes
}

export const EMPTY_80C: Deductions80C = {
  epf: 0, ppf: 0, elss: 0, nsc: 0,
  lifeInsurance: 0, homeLoanPrincipal: 0,
  tuitionFees: 0, sukanya: 0, nps: 0,
};

export const EMPTY_DEDUCTIONS: Deductions = {
  epfInput:         { ...EMPTY_EPF },
  section80C:       { ...EMPTY_80C },
  hraInput:         { ...EMPTY_HRA },
  section80D:       { ...EMPTY_80D },
  nps80CCD1B:       { ...EMPTY_NPS },
  homeLoanInterest: { ...EMPTY_HOME_LOAN },
  educationLoan:    { ...EMPTY_EDUCATION_LOAN },
  perquisites:      { ...EMPTY_PERQUISITES },
};

export const EMPTY_OTHER_INCOME_RESULT: OtherIncomeResult = calcOtherIncome(EMPTY_OTHER_INCOME);

/** Max allowed under Section 80C */
export const MAX_80C = 150_000;

export function total80C(d: Deductions80C): number {
  return (
    d.epf + d.ppf + d.elss + d.nsc +
    d.lifeInsurance + d.homeLoanPrincipal +
    d.tuitionFees + d.sukanya + d.nps
  );
}

/** Effective 80C deduction (capped at ₹1.5L) */
export function effective80C(d: Deductions80C): number {
  return Math.min(total80C(d), MAX_80C);
}

// ─── Types ───────────────────────────────────────────────────────

export interface RegimeResult {
  stdDeduction: number;
  deduction80C: number;
  deductionHRA: number;
  deduction80D: number;
  deductionNPS: number;
  deductionHomeLoan: number;
  deductionEducationLoan: number; // Old regime only (Sec 80E)
  deductionPerquisites: number;   // Both regimes (telephone + petrol + driver)
  otherIncomeAdded: number;       // other income added to slab base
  specialTax: number;             // LTCG + STCG flat tax
  taxableIncome: number;
  baseTax: number;
  rebate: number;
  surcharge: number;
  cess: number;
  total: number;
  rows: SlabRow[];
}

export interface TaxResult {
  gross: number;
  deductions: Deductions;
  otherIncome: OtherIncome;
  otherIncomeResult: OtherIncomeResult;
  old: RegimeResult;
  new: RegimeResult;
}

// ─── Slab definitions ────────────────────────────────────────────

interface Slab { limit: number; rate: number; }

const OLD_SLABS: Slab[] = [
  { limit: 250_000,   rate: 0    },
  { limit: 500_000,   rate: 0.05 },
  { limit: 1_000_000, rate: 0.20 },
  { limit: Infinity,  rate: 0.30 },
];

const NEW_SLABS: Slab[] = [
  { limit:   400_000, rate: 0    },  // ₹0 – ₹4L:   0%
  { limit:   800_000, rate: 0.05 },  // ₹4L – ₹8L:  5%
  { limit: 1_200_000, rate: 0.10 },  // ₹8L – ₹12L: 10%
  { limit: 1_600_000, rate: 0.15 },  // ₹12L – ₹16L: 15%
  { limit: 2_000_000, rate: 0.20 },  // ₹16L – ₹20L: 20%
  { limit: 2_400_000, rate: 0.25 },  // ₹20L – ₹24L: 25%
  { limit: Infinity,  rate: 0.30 },  // Above ₹24L: 30%
];

// ─── Helpers ─────────────────────────────────────────────────────

function calcSlabTax(income: number, slabs: Slab[]): { tax: number; rows: SlabRow[] } {
  let tax = 0, prev = 0;
  const rows: SlabRow[] = [];
  for (const { limit, rate } of slabs) {
    if (income <= prev) break;
    const taxable = Math.min(income, limit) - prev;
    const slabTax = taxable * rate;
    if (taxable > 0) {
      rows.push({
        range: `${fmt(prev)} – ${limit === Infinity ? 'Above' : fmt(limit)}`,
        rate:  `${(rate * 100).toFixed(0)}%`,
        taxable,
        tax: slabTax,
      });
    }
    tax += slabTax;
    prev = limit;
  }
  return { tax, rows };
}

function rebate87A(tax: number, income: number, regime: 'old' | 'new'): number {
  if (regime === 'old' && income <= 500_000) return Math.min(tax, 12_500);
  if (regime === 'new' && income <= 1_200_000) return Math.min(tax, 60_000); // Budget 2025: full rebate up to ₹12L taxable
  return 0;
}

function calcSurcharge(tax: number, income: number, regime: 'old' | 'new'): number {
  if (income > 50_000_000) return tax * (regime === 'new' ? 0.25 : 0.37); // New Regime capped at 25%
  if (income > 20_000_000) return tax * 0.25;
  if (income > 10_000_000) return tax * 0.15;
  if (income > 5_000_000)  return tax * 0.10;
  return 0;
}

const CESS = 0.04;

// ─── Regime calculations ──────────────────────────────────────────

export function calcOldRegime(
  gross: number,
  deductions: Deductions = EMPTY_DEDUCTIONS,
  otherIncome: OtherIncome = EMPTY_OTHER_INCOME,
): RegimeResult {
  const STD          = 50_000;
  const ded80C       = effective80C(deductions.section80C);
  const hra          = calcHRAExemption(deductions.hraInput);
  const dedHRA       = hra.exemption;
  const ded80D       = calc80DDeduction(deductions.section80D).total;
  const dedNPS       = calcNPS80CCD1B(deductions.nps80CCD1B);
  const dedHomeLoan  = calcHomeLoanInterestDeduction(deductions.homeLoanInterest);
  const dedEduLoan   = calcEducationLoanDeduction(deductions.educationLoan);
  const dedPerqs     = calcPerquisiteDeduction(deductions.perquisites);
  const oiResult     = calcOtherIncome(otherIncome);

  const income = Math.max(0,
    gross
    + oiResult.totalAddedToIncome
    - STD - ded80C - dedHRA - ded80D - dedNPS - dedHomeLoan - dedEduLoan - dedPerqs
  );

  const { tax: baseTax, rows } = calcSlabTax(income, OLD_SLABS);
  const rebate         = rebate87A(baseTax, income, 'old');
  const taxAfterRebate = baseTax - rebate;
  const surcharge      = calcSurcharge(taxAfterRebate, income, 'old');
  const cess           = (taxAfterRebate + surcharge + oiResult.totalSpecialTax) * CESS;
  const specialTax     = oiResult.totalSpecialTax;

  return {
    stdDeduction:           STD,
    deduction80C:           ded80C,
    deductionHRA:           dedHRA,
    deduction80D:           ded80D,
    deductionNPS:           dedNPS,
    deductionHomeLoan:      dedHomeLoan,
    deductionEducationLoan: dedEduLoan,
    deductionPerquisites:   dedPerqs,
    otherIncomeAdded:       oiResult.totalAddedToIncome,
    specialTax,
    taxableIncome:          income,
    baseTax,
    rebate,
    surcharge,
    cess,
    total: taxAfterRebate + surcharge + specialTax + cess,
    rows,
  };
}

export function calcNewRegime(
  gross: number,
  otherIncome: OtherIncome = EMPTY_OTHER_INCOME,
  perquisites: PerquisiteAllowances = EMPTY_PERQUISITES,
): RegimeResult {
  const STD      = 75_000;
  const dedPerqs = calcPerquisiteDeduction(perquisites);
  const oiResult = calcOtherIncome(otherIncome);
  // Note: 80TTA deduction NOT available in New Regime — savings interest fully taxable
  const otherAdded = otherIncome.savingsInterest + otherIncome.fdInterest
    + otherIncome.dividends
    + Math.max(0, otherIncome.rentalIncome - Math.round(otherIncome.rentalIncome * 0.30));
  const income = Math.max(0, gross + otherAdded - STD - dedPerqs);

  const { tax: baseTax, rows } = calcSlabTax(income, NEW_SLABS);
  const rebate         = rebate87A(baseTax, income, 'new');
  const taxAfterRebate = baseTax - rebate;
  const surcharge      = calcSurcharge(taxAfterRebate, income, 'new');
  const specialTax     = oiResult.totalSpecialTax;
  const cess           = (taxAfterRebate + surcharge + specialTax) * CESS;

  return {
    stdDeduction:           STD,
    deduction80C:           0,
    deductionHRA:           0,
    deduction80D:           0,
    deductionNPS:           0,
    deductionHomeLoan:      0,
    deductionEducationLoan: 0,
    deductionPerquisites:   dedPerqs,
    otherIncomeAdded:       otherAdded,
    specialTax,
    taxableIncome:          income,
    baseTax,
    rebate,
    surcharge,
    cess,
    total: taxAfterRebate + surcharge + specialTax + cess,
    rows,
  };
}

// ─── Formatters ───────────────────────────────────────────────────

export function fmt(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export function pct(n: number, base: number): string {
  if (!base) return '0.00%';
  return ((n / base) * 100).toFixed(2) + '%';
}
