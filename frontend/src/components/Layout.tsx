import React from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import AssistantChat from './AssistantChat'

export default function Layout() {
  const auth = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-semibold">AGM Portal MVP</Link>
          <nav className="flex items-center gap-4 text-sm">
            <NavLink to="/projects" className={({ isActive }) => isActive ? 'font-semibold' : 'text-gray-600'}>
              Projects
            </NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'font-semibold' : 'text-gray-600'}>
              Dashboard
            </NavLink>
            <NavLink to="/import" className={({ isActive }) => isActive ? 'font-semibold' : 'text-gray-600'}>
              Import
            </NavLink>
            <span className="text-gray-500">{auth.email || ''}</span>
            <button
              className="rounded-md bg-gray-900 px-3 py-1.5 text-white"
              onClick={() => {
                auth.logout()
                navigate('/login')
              }}
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
        <section className="min-w-0">
          <Outlet />
        </section>
        <div className="mt-6 lg:mt-0">
          <AssistantChat />
        </div>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-gray-500">
        MVP for DSA3101-style AI Project Management & Analytics Portal.
      </footer>
    </div>
  )
}
