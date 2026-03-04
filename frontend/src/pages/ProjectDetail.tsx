import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../auth'

type Project = any

type ProjectUpdate = {
  id: number
  status: string
  note: string
  created_at: string
}

type FundingEvent = {
  id: number
  amount_sgd: number
  note?: string | null
  created_at: string
}

export default function ProjectDetail() {
  const { id } = useParams()
  const auth = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [updates, setUpdates] = useState<ProjectUpdate[]>([])
  const [fundingEvents, setFundingEvents] = useState<FundingEvent[]>([])
  const [note, setNote] = useState('')
  const [fundingAmount, setFundingAmount] = useState('')
  const [fundingNote, setFundingNote] = useState('')
  const [fundingSaving, setFundingSaving] = useState(false)
  const [fundingError, setFundingError] = useState<string | null>(null)
  const [ending, setEnding] = useState(false)
  const [endError, setEndError] = useState<string | null>(null)

  async function load() {
    const res = await api.get(`/projects/${id}`)
    setProject(res.data)
    const up = await api.get(`/projects/${id}/updates`)
    setUpdates(up.data)
    const funding = await api.get(`/projects/${id}/funding`)
    setFundingEvents(funding.data)
  }

  useEffect(() => {
    load().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!project) return <div className="text-sm text-gray-600">Loading…</div>

  const completionUpdate = updates.find((u) => u.status === 'Completed')
  const createdAt = project.created_at ? new Date(project.created_at) : null
  const endedAt = completionUpdate
    ? new Date(completionUpdate.created_at)
    : (project.end_date ? new Date(project.end_date) : null)
  const canMarkEnded = auth.role === 'researcher' && project.status !== 'Completed'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{project.title}</h1>
          <div className="text-sm text-gray-600">{project.institution} • {project.domain} • {project.ai_type}</div>
        </div>
        <div className="flex gap-2">
          {canMarkEnded ? (
            <button
              className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={ending}
              onClick={async () => {
                const completionNote = window.prompt('Optional: add a completion note.')
                if (completionNote === null) return
                setEnding(true)
                setEndError(null)
                try {
                  await api.post(
                    `/projects/${project.id}/end`,
                    completionNote.trim() ? { note: completionNote.trim() } : {},
                  )
                  await load()
                } catch (e: any) {
                  setEndError(e?.response?.data?.detail || 'Unable to mark project as ended')
                } finally {
                  setEnding(false)
                }
              }}
            >
              {ending ? 'Ending…' : 'Mark as Ended'}
            </button>
          ) : null}
          <Link className="rounded-lg border bg-white px-3 py-2 text-sm" to={`/projects/${project.id}/edit`}>Edit</Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">Maturity stage</div>
          <div className="mt-1 font-semibold">{project.maturity_stage}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">Data sensitivity</div>
          <div className="mt-1 font-semibold">{project.data_sensitivity}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">Current spent amount (SGD)</div>
          <div className="mt-1 font-semibold">{Number(project.funding_amount_sgd || 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">Project status</div>
          <div className="mt-1 font-semibold">{project.status}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">Started at</div>
          <div className="mt-1 font-semibold">{createdAt ? createdAt.toLocaleString() : '—'}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">Ended at</div>
          <div className="mt-1 font-semibold">{endedAt ? endedAt.toLocaleString() : 'Not ended'}</div>
        </div>
      </div>

      {endError ? (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{endError}</div>
      ) : null}

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <div className="text-sm font-semibold">Amount spending updates</div>
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <input
            className="rounded-lg border px-3 py-2"
            type="number"
            min={0.01}
            step="0.01"
            placeholder="Add amount (SGD)"
            value={fundingAmount}
            onChange={(e) => setFundingAmount(e.target.value)}
          />
          <input
            className="rounded-lg border px-3 py-2"
            placeholder="Note (optional)"
            value={fundingNote}
            onChange={(e) => setFundingNote(e.target.value)}
          />
          <button
            className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={fundingSaving}
            onClick={async () => {
              const amount = Number(fundingAmount)
              if (!Number.isFinite(amount) || amount <= 0) {
                setFundingError('Please enter a valid amount greater than 0.')
                return
              }
              setFundingSaving(true)
              setFundingError(null)
              try {
                await api.post(`/projects/${id}/funding`, {
                  amount_sgd: amount,
                  note: fundingNote.trim() || null,
                })
                setFundingAmount('')
                setFundingNote('')
                await load()
              } catch (e: any) {
                setFundingError(e?.response?.data?.detail || 'Unable to add funding update')
              } finally {
                setFundingSaving(false)
              }
            }}
          >
            {fundingSaving ? 'Saving…' : 'Add amount'}
          </button>
        </div>

        {fundingError ? (
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{fundingError}</div>
        ) : null}

        <div className="mt-4 space-y-2">
          {fundingEvents.length === 0 ? (
            <div className="text-sm text-gray-600">No amount updates yet.</div>
          ) : fundingEvents.map((item) => (
            <div key={item.id} className="rounded-xl bg-gray-50 p-3">
              <div className="text-xs text-gray-500">{new Date(item.created_at).toLocaleString()}</div>
              <div className="mt-1 text-sm font-semibold">+ SGD {Number(item.amount_sgd || 0).toLocaleString()}</div>
              {item.note ? <div className="mt-1 text-sm">{item.note}</div> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <div className="text-sm font-semibold">Status updates</div>
        <div className="mt-3 flex gap-2">
          <input className="w-full rounded-lg border px-3 py-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a short update…" />
          <button
            className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white"
            onClick={async () => {
              if (!note.trim()) return
              await api.post(`/projects/${id}/updates`, { status: 'Update', note })
              setNote('')
              await load()
            }}
          >
            Add
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {updates.length === 0 ? (
            <div className="text-sm text-gray-600">No updates yet.</div>
          ) : updates.map((u) => (
            <div key={u.id} className="rounded-xl bg-gray-50 p-3">
              <div className="text-xs text-gray-500">{new Date(u.created_at).toLocaleString()}</div>
              <div className="mt-1 text-xs font-semibold text-gray-600">{u.status}</div>
              <div className="mt-1 text-sm">{u.note}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <div className="text-sm font-semibold">Description</div>
        <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{project.description || '—'}</div>
      </div>
    </div>
  )
}
