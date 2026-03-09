import React, { useEffect, useState } from 'react'
import api from '../api'
import { useAuth } from '../auth'

type UserRow = {
  id: number
  email: string
  full_name?: string | null
  role: 'researcher' | 'management' | 'admin'
}

export default function UserManagement() {
  const auth = useAuth()
  const canManageUsers = auth.role === 'admin' || auth.role === 'management'

  const [users, setUsers] = useState<UserRow[]>([])
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'researcher' | 'management' | 'admin'>('researcher')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await api.get('/auth/users')
      setUsers(res.data)
      setError(null)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Unable to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canManageUsers) {
      setLoading(false)
      return
    }
    loadUsers().catch(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageUsers])

  if (!canManageUsers) {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
        Only management/admin can create and manage user accounts.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">User Management</h1>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <div className="text-sm font-semibold">Create account</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            className="rounded-lg border px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="rounded-lg border px-3 py-2"
            placeholder="Full name (optional)"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <input
            className="rounded-lg border px-3 py-2"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <select
            className="rounded-lg border px-3 py-2"
            value={role}
            onChange={(e) => setRole(e.target.value as 'researcher' | 'management' | 'admin')}
          >
            <option value="researcher">researcher</option>
            <option value="management">management</option>
            <option value="admin">admin</option>
          </select>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving}
            onClick={async () => {
              if (!email.trim() || !password.trim()) {
                setError('Email and password are required.')
                return
              }
              setSaving(true)
              setError(null)
              setSuccess(null)
              try {
                await api.post('/auth/register', {
                  email: email.trim(),
                  password: password.trim(),
                  full_name: fullName.trim() || null,
                  role,
                })
                setEmail('')
                setFullName('')
                setPassword('')
                setRole('researcher')
                setSuccess('Account created successfully.')
                await loadUsers()
              } catch (e: any) {
                setError(e?.response?.data?.detail || 'Unable to create account')
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving ? 'Creating…' : 'Create account'}
          </button>
        </div>

        {error ? <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div> : null}
        {success ? <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700 ring-1 ring-green-200">{success}</div> : null}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <div className="text-sm font-semibold">Existing accounts</div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-600">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Full name</th>
                <th className="px-3 py-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-3 py-3 text-gray-600" colSpan={3}>Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td className="px-3 py-3 text-gray-600" colSpan={3}>No users found.</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">{u.full_name || '—'}</td>
                  <td className="px-3 py-2">{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
