import { useState } from 'react'
import { calculateTaxApi, ZERO_INCOME_HEADS } from 'taxmate-ai'
import type { TaxCalculationOutput, IncomeHeads, DeductionsInput } from 'taxmate-ai'
import './App.css'

const formatINR = (n: number) => `₹${(n / 1_00_000).toFixed(2)} L`

function IncomeForm({
  income,
  deductions,
  onIncomeChange,
  onDeductionsChange,
  onCalculate,
  loading,
}: {
  income: IncomeHeads
  deductions: DeductionsInput
  onIncomeChange: (v: IncomeHeads) => void
  onDeductionsChange: (v: DeductionsInput) => void
  onCalculate: () => void
  loading: boolean
}) {
  const update = (key: keyof IncomeHeads, value: number) =>
    onIncomeChange({ ...income, [key]: value })
  const updateD = (key: keyof DeductionsInput, value: number) =>
    onDeductionsChange({ ...deductions, [key]: value })

  return (
    <section className="card form-card">
      <h2>Income (AY 2025-26)</h2>
      <div className="form-grid">
        <label>Salary</label>
        <input type="number" min={0} step={10000} value={income.salary || ''} onChange={e => update('salary', Number(e.target.value) || 0)} placeholder="0" />
        <label>House Property</label>
        <input type="number" min={0} step={10000} value={income.houseProperty || ''} onChange={e => update('houseProperty', Number(e.target.value) || 0)} placeholder="0" />
        <label>Business</label>
        <input type="number" min={0} step={10000} value={income.business || ''} onChange={e => update('business', Number(e.target.value) || 0)} placeholder="0" />
        <label>Capital Gains (other)</label>
        <input type="number" min={0} step={10000} value={income.capitalGainsOther || ''} onChange={e => update('capitalGainsOther', Number(e.target.value) || 0)} placeholder="0" />
        <label>Other Sources</label>
        <input type="number" min={0} step={10000} value={income.otherSources || ''} onChange={e => update('otherSources', Number(e.target.value) || 0)} placeholder="0" />
        <label>VDA / Crypto (Sec 115BBH)</label>
        <input type="number" min={0} step={10000} value={income.vda || ''} onChange={e => update('vda', Number(e.target.value) || 0)} placeholder="0" />
        <label>STCG Listed Equity (Sec 111A)</label>
        <input type="number" min={0} step={10000} value={income.stcgListedEquity || ''} onChange={e => update('stcgListedEquity', Number(e.target.value) || 0)} placeholder="0" />
        <label>LTCG Listed Equity (Sec 112A)</label>
        <input type="number" min={0} step={10000} value={income.ltcgListedEquity || ''} onChange={e => update('ltcgListedEquity', Number(e.target.value) || 0)} placeholder="0" />
      </div>
      <h3>Deductions (Old regime)</h3>
      <div className="form-grid">
        <label>80C (max 1.5L)</label>
        <input type="number" min={0} step={10000} value={deductions.section80C ?? ''} onChange={e => updateD('section80C', Number(e.target.value) || 0)} placeholder="0" />
        <label>80D</label>
        <input type="number" min={0} step={5000} value={deductions.section80D ?? ''} onChange={e => updateD('section80D', Number(e.target.value) || 0)} placeholder="0" />
        <label>80G</label>
        <input type="number" min={0} step={10000} value={deductions.section80G ?? ''} onChange={e => updateD('section80G', Number(e.target.value) || 0)} placeholder="0" />
      </div>
      <button type="button" className="primary" onClick={onCalculate} disabled={loading}>
        {loading ? 'Calculating…' : 'Calculate Tax'}
      </button>
    </section>
  )
}

function Result({ output }: { output: TaxCalculationOutput }) {
  const nr = output.newRegime
  const or = output.oldRegime

  return (
    <section className="card result-card">
      <h2>Result (AY {output.assessmentYear})</h2>
      <p className="recommendation">
        Recommended: <strong>{output.recommendedRegime === 'new' ? 'New' : 'Old'} regime</strong>
        {' '}(save {formatINR(Math.abs(output.taxDifference))})
      </p>
      <div className="two-col">
        <div className="regime-block">
          <h3>New regime</h3>
          <ul>
            <li>Gross: {formatINR(nr.grossIncome)}</li>
            <li>Std deduction: {formatINR(nr.standardDeduction)}</li>
            <li>Total income: {formatINR(nr.totalIncome)}</li>
            <li>Tax (slabs): {formatINR(nr.taxOnSlabs)}</li>
            <li>Rebate 87A: {formatINR(nr.rebate87A)}</li>
            <li>Special tax: {formatINR(nr.specialTax)}</li>
            <li>Cess (4%): {formatINR(nr.healthEducationCess)}</li>
            <li><strong>Total tax: {formatINR(nr.totalTaxLiability)}</strong></li>
          </ul>
        </div>
        <div className="regime-block">
          <h3>Old regime</h3>
          <ul>
            <li>Gross: {formatINR(or.grossIncome)}</li>
            <li>Std deduction: {formatINR(or.standardDeduction)}</li>
            <li>Ch. VI-A: {formatINR(or.chapter6ADeductions)}</li>
            <li>Total income: {formatINR(or.totalIncome)}</li>
            <li>Tax (slabs): {formatINR(or.taxOnSlabs)}</li>
            <li>Rebate 87A: {formatINR(or.rebate87A)}</li>
            <li>Special tax: {formatINR(or.specialTax)}</li>
            <li>Cess (4%): {formatINR(or.healthEducationCess)}</li>
            <li><strong>Total tax: {formatINR(or.totalTaxLiability)}</strong></li>
          </ul>
        </div>
      </div>
      <details className="slab-details">
        <summary>Slab breakdown (New regime)</summary>
        <ul>
          {nr.slabBreakdown.map((s, i) => (
            <li key={i}>{s.slab.label}: {formatINR(s.taxableInSlab)} → {formatINR(s.taxInSlab)}</li>
          ))}
        </ul>
      </details>
      {(nr.specialTaxBreakdown.vda || nr.specialTaxBreakdown.stcgListedEquity || nr.specialTaxBreakdown.ltcgListedEquity) && (
        <details className="slab-details">
          <summary>Special tax breakdown</summary>
          <ul>
            {nr.specialTaxBreakdown.vda && <li>VDA: {formatINR(nr.specialTaxBreakdown.vda.income)} @ 30% → {formatINR(nr.specialTaxBreakdown.vda.tax)}</li>}
            {nr.specialTaxBreakdown.stcgListedEquity && <li>STCG: {formatINR(nr.specialTaxBreakdown.stcgListedEquity.income)} @ 20% → {formatINR(nr.specialTaxBreakdown.stcgListedEquity.tax)}</li>}
            {nr.specialTaxBreakdown.ltcgListedEquity && <li>LTCG: {formatINR(nr.specialTaxBreakdown.ltcgListedEquity.income)} (exempt {formatINR(nr.specialTaxBreakdown.ltcgListedEquity.exemptAmount)}) → {formatINR(nr.specialTaxBreakdown.ltcgListedEquity.tax)}</li>}
          </ul>
        </details>
      )}
    </section>
  )
}

function App() {
  const [income, setIncome] = useState<IncomeHeads>({ ...ZERO_INCOME_HEADS, salary: 12_00_000, otherSources: 50_000 })
  const [deductions, setDeductions] = useState<DeductionsInput>({ section80C: 1_50_000, section80D: 25_000 })
  const [result, setResult] = useState<TaxCalculationOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCalculate = () => {
    setError(null)
    setLoading(true)
    try {
      const out = calculateTaxApi({
        incomeHeads: income,
        deductions,
        assesseeType: 'individual',
      })
      setResult(out)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Calculation failed')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header>
        <h1>TaxMate AI</h1>
        <p>Indian Income Tax · AY 2025-26 (FY 2024-25)</p>
      </header>
      <IncomeForm
        income={income}
        deductions={deductions}
        onIncomeChange={setIncome}
        onDeductionsChange={setDeductions}
        onCalculate={handleCalculate}
        loading={loading}
      />
      {error && <p className="error">{error}</p>}
      {result && <Result output={result} />}
    </div>
  )
}

export default App
