import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'

type Project = {
  id: number
  title: string
  institution: string
  domain: string
  ai_type: string
  maturity_stage: string
  status: string
  risk_level: string
  compliance_status: string
  updated_at: string
}

export default function Projects() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<Project[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  const filtered = useMemo(() => rows, [rows])

  async function load() {
    setLoading(true)
    const res = await api.get('/projects', { params: q ? { q } : {} })
    setRows(res.data)
    setLoading(false)
  }

  useEffect(() => {
    load().catch(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Project Registry</h1>
        <Link className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white" to="/projects/new">New project</Link>
      </div>

      <div className="flex gap-2">
        <input
          className="w-full rounded-lg border px-3 py-2"
          placeholder="Search title/domain/institution…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="rounded-lg border bg-white px-3 py-2 text-sm" onClick={() => load()}>Search</button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-600">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Institution</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Risk</th>
              <th className="px-4 py-3">Compliance</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-4 text-gray-600" colSpan={6}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-4 text-gray-600" colSpan={6}>No projects yet.</td></tr>
            ) : filtered.map((p) => (
              <tr
                key={p.id}
                className="cursor-pointer border-t hover:bg-gray-50"
                onClick={() => navigate(`/projects/${p.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(`/projects/${p.id}`)
                  }
                }}
                role="link"
                tabIndex={0}
              >
                <td className="px-4 py-3">
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-gray-500">{p.domain} • {p.ai_type}</div>
                </td>
                <td className="px-4 py-3">{p.institution}</td>
                <td className="px-4 py-3">{p.maturity_stage}</td>
                <td className="px-4 py-3">{p.risk_level}</td>
                <td className="px-4 py-3">{p.compliance_status}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(p.updated_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
