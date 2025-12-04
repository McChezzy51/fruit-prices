import { useEffect, useMemo, useState } from 'react'
import './App.css'

function parseCsv(text) {
  const rows = []
  let currentRow = []
  let currentValue = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = i + 1 < text.length ? text[i + 1] : ''

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentValue)
      currentValue = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++
      }
      currentRow.push(currentValue)
      rows.push(currentRow)
      currentRow = []
      currentValue = ''
      continue
    }

    if (char !== '\r') {
      currentValue += char
    }
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue)
    rows.push(currentRow)
  }

  return rows
}

function App() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let isCancelled = false
    async function load() {
      try {
        setLoading(true)
        setError('')
        const res = await fetch('/data/Fruit-Prices-2022.csv', { cache: 'no-store' })
        if (!res.ok) {
          throw new Error(`Failed to load CSV: ${res.status} ${res.statusText}`)
        }
        const text = await res.text()
        const raw = parseCsv(text)
        if (!raw.length) {
          throw new Error('CSV is empty')
        }
        const headerRow = raw[0]
        const dataRows = raw.slice(1).filter(r => r.some(c => (c ?? '').trim() !== ''))
        const normalized = dataRows.map(r => {
          const obj = {}
          for (let i = 0; i < headerRow.length; i++) {
            obj[headerRow[i]] = r[i] ?? ''
          }
          return obj
        })
        if (!isCancelled) {
          setRows(normalized)
        }
      } catch (e) {
        if (!isCancelled) {
          setError(e.message || 'Unknown error')
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      isCancelled = true
    }
  }, [])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(row => {
      const fruit = String(row['Fruit'] || '').toLowerCase()
      const form = String(row['Form'] || '').toLowerCase()
      return fruit.includes(q) || form.includes(q)
    })
  }, [rows, query])

  return (
    <>
      <h1>Fruit Prices (USDA ERS 2022)</h1>
      <p className="subtitle">
        Data source: USDA Economic Research Service
      </p>

      <div className="toolbar">
        <input
          className="searchInput"
          type="search"
          placeholder="Search by fruit or form…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && <div className="status">Loading…</div>}
      {error && !loading && <div className="status error">Error: {error}</div>}

      {!loading && !error && (
        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th>Fruit price</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => {
                const fruit = String(row['Fruit'] ?? '')
                const form = String(row['Form'] ?? '')
                const priceRaw = String(row['RetailPrice'] ?? '')
                const unit = String(row['RetailPriceUnit'] ?? '')
                const price = Number.parseFloat(priceRaw)
                const priceDisplay = Number.isFinite(price) ? price.toFixed(2) : priceRaw
                return (
                  <tr key={idx}>
                    <td>{fruit}{form ? ` (${form})` : ''}: ${priceDisplay} {unit}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!filteredRows.length && (
            <div className="status">No results match your search.</div>
          )}
        </div>
      )}
    </>
  )
}

export default App
