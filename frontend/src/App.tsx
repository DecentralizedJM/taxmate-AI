import { useState, useRef, useEffect } from 'react'
import { calculateTaxApi, ZERO_INCOME_HEADS } from 'taxmate-ai'
import type { TaxCalculationOutput, IncomeHeads, DeductionsInput } from 'taxmate-ai'
import ErrorBoundary from './ErrorBoundary'
import ChatInterface from './components/ChatInterface'
import './App.css'

type AppMode = 'chat' | 'calculator'

const formatINR = (n: number) => `₹${(n / 1_00_000).toFixed(2)} L`

/** Input field with proper label association for accessibility */
function FormField({
  id,
  label,
  value,
  onChange,
  min = 0,
  step = 10000,
}: {
  id: string
  label: string
  value: number | undefined
  onChange: (value: number) => void
  min?: number
  step?: number
}) {
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        min={min}
        step={step}
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        placeholder="0"
        aria-describedby={`${id}-hint`}
      />
    </>
  )
}

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
    <section className="card form-card" aria-labelledby="income-heading">
      <h2 id="income-heading">Income (AY 2025-26)</h2>
      <div className="form-grid" role="group" aria-label="Income heads">
        <FormField id="salary" label="Salary" value={income.salary} onChange={(v) => update('salary', v)} />
        <FormField id="houseProperty" label="House Property" value={income.houseProperty} onChange={(v) => update('houseProperty', v)} />
        <FormField id="business" label="Business" value={income.business} onChange={(v) => update('business', v)} />
        <FormField id="capitalGainsOther" label="Capital Gains (other)" value={income.capitalGainsOther} onChange={(v) => update('capitalGainsOther', v)} />
        <FormField id="otherSources" label="Other Sources" value={income.otherSources} onChange={(v) => update('otherSources', v)} />
        <FormField id="vda" label="VDA / Crypto (Sec 115BBH)" value={income.vda} onChange={(v) => update('vda', v)} />
        <FormField id="stcgListedEquity" label="STCG Listed Equity (Sec 111A)" value={income.stcgListedEquity} onChange={(v) => update('stcgListedEquity', v)} />
        <FormField id="ltcgListedEquity" label="LTCG Listed Equity (Sec 112A)" value={income.ltcgListedEquity} onChange={(v) => update('ltcgListedEquity', v)} />
      </div>
      <h3 id="deductions-heading">Deductions (Old regime)</h3>
      <div className="form-grid" role="group" aria-labelledby="deductions-heading">
        <FormField id="section80C" label="80C (max 1.5L)" value={deductions.section80C} onChange={(v) => updateD('section80C', v)} />
        <FormField id="section80D" label="80D" value={deductions.section80D} onChange={(v) => updateD('section80D', v)} step={5000} />
        <FormField id="section80G" label="80G" value={deductions.section80G} onChange={(v) => updateD('section80G', v)} />
      </div>
      <button
        type="button"
        className="primary"
        onClick={onCalculate}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? 'Calculating…' : 'Calculate Tax'}
      </button>
    </section>
  )
}

function Result({ output, resultRef }: { output: TaxCalculationOutput; resultRef: React.RefObject<HTMLElement | null> }) {
  const nr = output.newRegime
  const or = output.oldRegime

  return (
    <section
      ref={resultRef}
      className="card result-card"
      aria-labelledby="result-heading"
      aria-live="polite"
      tabIndex={-1}
    >
      <h2 id="result-heading">Result (AY {output.assessmentYear})</h2>
      <p className="recommendation">
        Recommended: <strong>{output.recommendedRegime === 'new' ? 'New' : 'Old'} regime</strong>
        {' '}(save {formatINR(Math.abs(output.taxDifference))})
      </p>
      <div className="two-col">
        <div className="regime-block" aria-labelledby="new-regime-heading">
          <h3 id="new-regime-heading">New regime</h3>
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
        <div className="regime-block" aria-labelledby="old-regime-heading">
          <h3 id="old-regime-heading">Old regime</h3>
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

function TaxCalculator() {
  const [income, setIncome] = useState<IncomeHeads>({ ...ZERO_INCOME_HEADS, salary: 12_00_000, otherSources: 50_000 })
  const [deductions, setDeductions] = useState<DeductionsInput>({ section80C: 1_50_000, section80D: 25_000 })
  const [result, setResult] = useState<TaxCalculationOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const resultRef = useRef<HTMLElement>(null)

  // Focus result section when results are displayed
  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.focus()
    }
  }, [result])

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
      // Handle ValidationError or generic error
      const errorMessage = e instanceof Error ? e.message : 'Calculation failed'
      setError(errorMessage)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app" role="main">
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
      {error && (
        <p className="error" role="alert" aria-live="assertive">
          {error}
        </p>
      )}
      {result && <Result output={result} resultRef={resultRef} />}
      <footer className="disclaimer">
        This is an indicative calculator only. It is not professional tax or legal advice.
        Verify with the Income Tax Department or a qualified CA before filing.
      </footer>
    </main>
  )
}

function ModeSelector({ mode, onModeChange }: { mode: AppMode; onModeChange: (m: AppMode) => void }) {
  return (
    <nav className="mode-selector" role="tablist" aria-label="App mode">
      <button
        role="tab"
        aria-selected={mode === 'chat'}
        className={mode === 'chat' ? 'active' : ''}
        onClick={() => onModeChange('chat')}
      >
        💬 AI Chat
      </button>
      <button
        role="tab"
        aria-selected={mode === 'calculator'}
        className={mode === 'calculator' ? 'active' : ''}
        onClick={() => onModeChange('calculator')}
      >
        🧮 Calculator
      </button>
    </nav>
  )
}

function App() {
  const [mode, setMode] = useState<AppMode>('chat')

  return (
    <ErrorBoundary>
      <div className="app-wrapper">
        <ModeSelector mode={mode} onModeChange={setMode} />
        {mode === 'chat' ? (
          <ChatInterface />
        ) : (
          <TaxCalculator />
        )}
      </div>
    </ErrorBoundary>
  )
}

export default App
