import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'

type ProjectPayload = {
  title: string
  institution: string
  domain: string
  ai_type: string
  maturity_stage: string
  status: string
  risk_level: string
  compliance_status: string
  approvals?: string | null
  data_sensitivity: string
  funding_amount_sgd?: number | null
  description?: string | null
}

const defaultPayload: ProjectPayload = {
  title: '',
  institution: 'SingHealth',
  domain: 'Radiology',
  ai_type: 'Computer Vision',
  maturity_stage: 'Discovery',
  status: 'Active',
  risk_level: 'Medium',
  compliance_status: 'Not Started',
  approvals: null,
  data_sensitivity: 'De-identified',
  funding_amount_sgd: null,
  description: ''
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-600">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  )
}

export default function ProjectForm() {
  const { id } = useParams()
  const editing = !!id
  const navigate = useNavigate()

  const [payload, setPayload] = useState<ProjectPayload>(defaultPayload)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editing) return
    api.get(`/projects/${id}`).then((res) => {
      const p = res.data
      setPayload({
        title: p.title,
        institution: p.institution,
        domain: p.domain,
        ai_type: p.ai_type,
        maturity_stage: p.maturity_stage,
        status: p.status,
        risk_level: p.risk_level,
        compliance_status: p.compliance_status,
        approvals: p.approvals,
        data_sensitivity: p.data_sensitivity,
        funding_amount_sgd: p.funding_amount_sgd ? Number(p.funding_amount_sgd) : null,
        description: p.description
      })
    })
  }, [editing, id])

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{editing ? 'Edit project' : 'New project'}</h1>
      </div>

      {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div> : null}

      <div className="grid gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 md:grid-cols-2">
        <Field label="Title">
          <input className="w-full rounded-lg border px-3 py-2" value={payload.title} onChange={(e) => setPayload({ ...payload, title: e.target.value })} />
        </Field>
        <Field label="Institution">
          <input className="w-full rounded-lg border px-3 py-2" value={payload.institution} onChange={(e) => setPayload({ ...payload, institution: e.target.value })} />
        </Field>
        <Field label="Domain">
          <input className="w-full rounded-lg border px-3 py-2" value={payload.domain} onChange={(e) => setPayload({ ...payload, domain: e.target.value })} />
        </Field>
        <Field label="AI type">
          <input className="w-full rounded-lg border px-3 py-2" value={payload.ai_type} onChange={(e) => setPayload({ ...payload, ai_type: e.target.value })} />
        </Field>
        <Field label="Maturity stage">
          <select className="w-full rounded-lg border px-3 py-2" value={payload.maturity_stage} onChange={(e) => setPayload({ ...payload, maturity_stage: e.target.value })}>
            {['Discovery', 'Development', 'Validation', 'Pilot', 'Production'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className="w-full rounded-lg border px-3 py-2" value={payload.status} onChange={(e) => setPayload({ ...payload, status: e.target.value })}>
            {['Active', 'On Hold', 'Completed', 'Cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Risk level">
          <select className="w-full rounded-lg border px-3 py-2" value={payload.risk_level} onChange={(e) => setPayload({ ...payload, risk_level: e.target.value })}>
            {['Low', 'Medium', 'High'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Compliance status">
          <select className="w-full rounded-lg border px-3 py-2" value={payload.compliance_status} onChange={(e) => setPayload({ ...payload, compliance_status: e.target.value })}>
            {['Not Started', 'In Progress', 'Approved', 'Needs Review'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Approvals (comma-separated)">
          <input className="w-full rounded-lg border px-3 py-2" value={payload.approvals || ''} onChange={(e) => setPayload({ ...payload, approvals: e.target.value || null })} />
        </Field>
        <Field label="Data sensitivity">
          <select className="w-full rounded-lg border px-3 py-2" value={payload.data_sensitivity} onChange={(e) => setPayload({ ...payload, data_sensitivity: e.target.value })}>
            {['De-identified', 'Identifiable', 'Synthetic', 'Unknown'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Funding (SGD)">
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={payload.funding_amount_sgd ?? ''}
            onChange={(e) => setPayload({ ...payload, funding_amount_sgd: e.target.value === '' ? null : Number(e.target.value) })}
            type="number"
            min={0}
          />
        </Field>
        <Field label="Description">
          <textarea className="w-full rounded-lg border px-3 py-2" rows={4} value={payload.description || ''} onChange={(e) => setPayload({ ...payload, description: e.target.value })} />
        </Field>
      </div>

      <div className="flex gap-2">
        <button
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white"
          onClick={async () => {
            setError(null)
            try {
              if (editing) {
                await api.patch(`/projects/${id}`, payload)
                navigate(`/projects/${id}`)
              } else {
                const res = await api.post('/projects', payload)
                navigate(`/projects/${res.data.id}`)
              }
            } catch (e: any) {
              setError(e?.response?.data?.detail || 'Save failed')
            }
          }}
        >
          Save
        </button>
        <button className="rounded-lg border bg-white px-4 py-2 text-sm" onClick={() => navigate(-1)}>Cancel</button>
      </div>
    </div>
  )
}
