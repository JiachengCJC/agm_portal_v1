import React, { useEffect, useMemo, useState } from 'react'
import api from '../api'
import { Card } from '../components/Card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Legend } from 'recharts'

type CountByKey = { key: string; count: number }

type PortfolioSnapshot = {
  total_projects: number
  active_projects: number
  by_institution: CountByKey[]
  by_maturity_stage: CountByKey[]
  by_risk_level: CountByKey[]
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

  const stageData = useMemo(() => data?.by_maturity_stage || [], [data])
  const riskData = useMemo(() => data?.by_risk_level || [], [data])

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
            <Card title="Institutions" value={data.by_institution.length} subtitle="Unique institutions" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
              <div className="text-sm font-semibold">Maturity pipeline</div>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageData}>
                    <XAxis dataKey="key" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
              <div className="text-sm font-semibold">Risk distribution</div>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskData} dataKey="count" nameKey="key" label />
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-sm text-gray-600">Loading…</div>
      )}
    </div>
  )
}
