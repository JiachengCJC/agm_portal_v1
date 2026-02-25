import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function Login() {
  const auth = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('management@example.com')
  const [password, setPassword] = useState('password')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-gray-600">Demo users are pre-seeded (password: <code>password</code>).</p>

      <div className="mt-4 space-y-3">
        <div>
          <label className="text-xs text-gray-600">Email</label>
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Password</label>
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
          />
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <button
          className="w-full rounded-lg bg-gray-900 px-3 py-2 text-white disabled:opacity-50"
          disabled={loading}
          onClick={async () => {
            setLoading(true)
            setError(null)
            try {
              await auth.login(email, password)
              navigate('/projects')
            } catch (e: any) {
              setError(e?.response?.data?.detail || 'Login failed')
            } finally {
              setLoading(false)
            }
          }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
          Try:
          <ul className="mt-1 list-disc pl-5">
            <li><code>management@example.com</code> (can view Dashboard & Import)</li>
            <li><code>researcher@example.com</code> (sees only own projects)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
