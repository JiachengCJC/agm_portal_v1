import React, { useEffect, useMemo, useState } from 'react'
import api from '../api'
import { Card } from '../components/Card'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const PIE_COLORS = ['#2563eb', '#f59e0b', '#16a34a', '#dc2626', '#7c3aed', '#0891b2', '#ea580c', '#65a30d']

type CountByKey = { key: string; count: number }
type FundingByKey = {
  key: string
  amount_sgd: number
}
type ProjectCycle = {
  id: number
  title: string
  domain: string
  status: string
  start_time: string
  end_time?: string | null
  duration_days: number
  spent_sgd: number
}

type PortfolioSnapshot = {
  total_projects: number
  active_projects: number
  total_spent_sgd: number
  by_institution: CountByKey[]
  by_domain: CountByKey[]
  funding_by_domain: FundingByKey[]
  project_cycles: ProjectCycle[]
}

export default function Dashboard() {
  const [data, setData] = useState<PortfolioSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await api.get('/analytics/portfolio')
        setData(res.data)
        setError(null)
      } catch (e: any) {
        setError(e?.response?.data?.detail || 'Unable to load dashboard (management/admin only).')
      }
    })()
  }, [])

  const domainData = useMemo(() => data?.by_domain || [], [data])
  const fundingByDomain = useMemo(() => data?.funding_by_domain || [], [data])
  const projectCycles = useMemo(() => data?.project_cycles || [], [data])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Portfolio Intelligence Dashboard</h1>

      {error ? (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card title="Total projects" value={data.total_projects} />
            <Card title="Active projects" value={data.active_projects} subtitle="Status == Active" />
            <Card title="Total spent (SGD)" value={data.total_spent_sgd.toLocaleString()} subtitle="All projects combined" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
              <div className="text-sm font-semibold">Domain type distribution</div>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={domainData} dataKey="count" nameKey="key" label>
                      {domainData.map((entry, index) => (
                        <Cell key={`domain-cell-${entry.key}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
              <div className="text-sm font-semibold">Funding allocation by domain (SGD)</div>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fundingByDomain}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="key" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="amount_sgd" name="Spent (SGD)" radius={[8, 8, 0, 0]}>
                      {fundingByDomain.map((entry, index) => (
                        <Cell key={`funding-cell-${entry.key}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <div className="text-sm font-semibold">Project lifecycle table (each project timeline)</div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Project</th>
                    <th className="px-3 py-2">Domain</th>
                    <th className="px-3 py-2">Started</th>
                    <th className="px-3 py-2">Ended</th>
                    <th className="px-3 py-2">Duration (days)</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Spent (SGD)</th>
                  </tr>
                </thead>
                <tbody>
                  {projectCycles.length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-gray-600" colSpan={7}>No projects yet.</td>
                    </tr>
                  ) : projectCycles.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2 font-medium">{item.title}</td>
                      <td className="px-3 py-2">{item.domain}</td>
                      <td className="px-3 py-2">{new Date(item.start_time).toLocaleString()}</td>
                      <td className="px-3 py-2">{item.end_time ? new Date(item.end_time).toLocaleString() : 'In progress'}</td>
                      <td className="px-3 py-2">{item.duration_days}</td>
                      <td className="px-3 py-2">{item.status}</td>
                      <td className="px-3 py-2">{Number(item.spent_sgd || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-sm text-gray-600">Loading…</div>
      )}
    </div>
  )
}
