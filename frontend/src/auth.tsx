import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from './api'

type UserRole = 'researcher' | 'management' | 'admin'

type AuthState = {
  token: string | null
  role: UserRole | null
  email: string | null
}

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function decodeRoleFromJwt(token: string): UserRole | null {
  try {
    const payload = token.split('.')[1]
    const json = JSON.parse(atob(payload))
    return (json.role as UserRole) || null
  } catch {
    return null
  }
}

function decodeEmailFromJwt(token: string): string | null {
  try {
    const payload = token.split('.')[1]
    const json = JSON.parse(atob(payload))
    return (json.sub as string) || null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('agm_token'))
  const [role, setRole] = useState<UserRole | null>(token ? decodeRoleFromJwt(token) : null)
  const [email, setEmail] = useState<string | null>(token ? decodeEmailFromJwt(token) : null)

  useEffect(() => {
    if (token) {
      localStorage.setItem('agm_token', token)
      setRole(decodeRoleFromJwt(token))
      setEmail(decodeEmailFromJwt(token))
    } else {
      localStorage.removeItem('agm_token')
      setRole(null)
      setEmail(null)
    }
  }, [token])

  const value = useMemo<AuthContextValue>(() => ({
    token,
    role,
    email,
    login: async (email: string, password: string) => {
      const data = new URLSearchParams()
      data.set('username', email)
      data.set('password', password)

      const res = await api.post('/auth/token', data, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
      setToken(res.data.access_token)
    },
    logout: () => setToken(null)
  }), [token, role, email])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
