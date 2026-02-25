import React, { useState } from 'react'
import api from '../api'

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">AMGrant (mock) import</h1>
      <p className="text-sm text-gray-600">
        Upload a mocked AMGrant CSV to auto-populate overlapping project fields.
        This endpoint is management/admin-only.
      </p>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 space-y-3">
        <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />

        <button
          className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          disabled={!file}
          onClick={async () => {
            if (!file) return
            const form = new FormData()
            form.append('file', file)
            try {
              const res = await api.post('/integrations/amgrant/ingest', form, {
                headers: { 'Content-Type': 'multipart/form-data' }
              })
              setMsg(`Ingested. created=${res.data.created}, updated=${res.data.updated}`)
            } catch (e: any) {
              setMsg(e?.response?.data?.detail || 'Import failed')
            }
          }}
        >
          Upload & ingest
        </button>

        {msg ? <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{msg}</div> : null}

        <div className="text-xs text-gray-600">
          Expected columns: <code>title,institution,domain,ai_type,maturity_stage,status,risk_level,compliance_status,funding_amount_sgd</code>
        </div>
      </div>

      <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
        Tip: you can create a quick CSV in Excel, export as CSV, and upload it here.
      </div>
    </div>
  )
}
