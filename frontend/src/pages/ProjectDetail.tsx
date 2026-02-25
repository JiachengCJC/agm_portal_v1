import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../api'

type Project = any

type ProjectUpdate = {
  id: number
  status: string
  note: string
  created_at: string
}

export default function ProjectDetail() {
  const { id } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [updates, setUpdates] = useState<ProjectUpdate[]>([])
  const [note, setNote] = useState('')

  async function load() {
    const res = await api.get(`/projects/${id}`)
    setProject(res.data)
    const up = await api.get(`/projects/${id}/updates`)
    setUpdates(up.data)
  }

  useEffect(() => {
    load().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!project) return <div className="text-sm text-gray-600">Loading…</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{project.title}</h1>
          <div className="text-sm text-gray-600">{project.institution} • {project.domain} • {project.ai_type}</div>
        </div>
        <Link className="rounded-lg border bg-white px-3 py-2 text-sm" to={`/projects/${project.id}/edit`}>Edit</Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">Maturity stage</div>
          <div className="mt-1 font-semibold">{project.maturity_stage}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">Risk</div>
          <div className="mt-1 font-semibold">{project.risk_level}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">Compliance</div>
          <div className="mt-1 font-semibold">{project.compliance_status}</div>
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
