# Assumptions and Implementation Notes

This document details the assumptions and implementation choices made in TaxMate AI.

## Assessment Year

- **AY 2025-26** (Financial Year 2024-25)
- Budget 2024 amendments applied

## Rounding

- All tax and cess amounts are **rounded to the nearest rupee** using `Math.round()`.
- This matches common practice but is not explicitly verified against Income Tax Department rounding rules.

## Total Income

- If deductions exceed gross income (e.g., in old regime with large 80C), total income is **clamped to ₹0** (not negative).
- A total income of 0 results in 0 tax.

## Standard Deduction

- **New regime:** ₹75,000 (Budget 2024 amendment)
- **Old regime:** ₹50,000
- Applied only to salary income; capped at actual salary.

## Rebate u/s 87A

- **New regime:** Full tax rebate if total income ≤ ₹7,00,000
- **Old regime:** Full tax rebate if total income ≤ ₹5,00,000
- Rebate applies only to tax on slabs (and special tax), not to surcharge (not implemented) or cess.

## Tax Slabs

### New Regime (Budget 2024)

| Slab (₹) | Rate |
|----------|------|
| 0 – 3,00,000 | Nil |
| 3,00,001 – 7,00,000 | 5% |
| 7,00,001 – 10,00,000 | 10% |
| 10,00,001 – 12,00,000 | 15% |
| 12,00,001 – 15,00,000 | 20% |
| Above 15,00,000 | 30% |

### Old Regime

| Slab (₹) | Rate |
|----------|------|
| 0 – 2,50,000 | Nil |
| 2,50,001 – 5,00,000 | 5% |
| 5,00,001 – 10,00,000 | 20% |
| Above 10,00,000 | 30% |

## Special Tax Rates

- **VDA/Crypto (Section 115BBH):** Flat 30%, no deductions, no loss set-off
- **STCG on listed equity (Section 111A):** Flat 20%
- **LTCG on listed equity (Section 112A):** 12.5% on gains exceeding ₹1,25,000

## Presumptive Taxation

- **Section 44AD:** 8% of turnover (digital) or 6% (cash)
- **Section 44ADA:** 50% of gross receipts

## Deduction Caps (Statutory)

- **80C/80CCC/80CCD(1) combined:** ₹1,50,000
- **80CCD(1B):** ₹50,000
- **80D:** ₹25,000 (self + family, non-senior citizen; can be higher with parents/seniors)
- **80TTA:** ₹10,000

## Health & Education Cess

- **4%** on total tax after rebate

## What Is NOT Implemented

- **Surcharge** on high incomes (not yet implemented)
- **Senior citizen / super senior citizen** age-based slabs
- **Section 80EEA, 80EEB** (housing loan, EV loan)
- **HRA exemption** calculation (user should provide net taxable salary)
- **Loss set-off** across heads (user should provide net figures)
- **TDS/advance tax** – only final tax liability is computed
- **Company/firm/trust** taxation

## Disclaimer

This is an indicative calculator and **not an official Income Tax Department implementation**. Results should be verified with a qualified Chartered Accountant or the Income Tax Department before filing.
