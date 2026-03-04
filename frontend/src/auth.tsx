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

//AuthProvider is defined in auth.tsx. When it loads, it immediately checks localStorage for a saved token (agm_token).
/*
1. Setting Up the State (The App's Memory)
token: This is your digital ID card (JWT). When the app first loads, it checks localStorage 
(the browser's built-in memory) to see if the user already logged in previously. 
This is why you don't get logged out when you refresh the page.

role & email: If a token is found, it decodes it to instantly figure out who the user is 
(email) and what permissions they have (role, like "researcher" or "management").

2. Reacting to Changes (useEffect)
useEffect is a watcher. The [token] at the end means: "Hey React, keep an eye on the token variable. 
If it EVER changes, run this code."

If the token exists (User logs in): It saves the token to the browser's localStorage and 
decodes the new role and email.

If the token is null (User logs out): It deletes the token from the browser's memory and 
wipes the role and email.

3. Creating the Broadcasting Package (useMemo)
This bundles all the user data (token, role, email) and the actions (login, logout) 
into a single package called value.

useMemo is a performance optimization. It tells React: "Only recreate this package 
if the token, role, or email changes." This prevents the rest of your app from pointlessly re-rendering.

The login function: It takes the email and password, sends them to your backend (/auth/token), 
and if successful, takes the new token and calls setToken(). 
(This immediately triggers the useEffect watcher mentioned above!).

The logout function: It simply sets the token to null (which also triggers the watcher to clean up).

4. Broadcasting the Package (return)
This takes the value package we just created and "provides" it to children.

children represents the rest of your application (your Dashboard, Projects page, Navbar, etc.). 
Because the app is wrapped in this <AuthContext.Provider>, 
any page can instantly access the current user's email or trigger the logout function without 
having to pass the data down manually.
*/
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
