// DSI 360 — Portail unique de navigation entre modules (Phase 1)
import React, { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { modulesVisibles } from '../modules.config'
import { ROLE_LABELS } from '../lib/roles'
import ChatbotWidget from '../components/chatbot/ChatbotWidget'
import InstallPromptPWA from '../components/InstallPromptPWA'

export default function PortalLayout() {
  const { profile, role, tenant, signOut } = useAuth()
  const [sidebarOuverte, setSidebarOuverte] = useState(true)
  const modules = modulesVisibles(role)

  return (
    <div className="flex h-screen bg-navy-50">
      {/* Sidebar */}
      <aside
        className={`bg-navy-900 text-white transition-all duration-200 ${
          sidebarOuverte ? 'w-64' : 'w-16'
        } flex flex-col`}
      >
        <div className="flex items-center gap-2 px-4 py-4 border-b border-navy-700">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt="Logo" className="h-8 w-8 rounded" />
          ) : (
            <div className="h-8 w-8 rounded bg-gold-500 flex items-center justify-center font-bold text-navy-900">
              AT
            </div>
          )}
          {sidebarOuverte && (
            <div>
              <p className="font-bold leading-tight">DSI 360</p>
              <p className="text-xs text-navy-300">{tenant?.nom || 'AL_AMANA_TECH_SECURITE'}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {modules.map((m) => (
            <NavLink
              key={m.key}
              to={m.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm hover:bg-navy-800 ${
                  isActive ? 'bg-navy-800 border-l-4 border-gold-500' : ''
                }`
              }
            >
              <span>{sidebarOuverte ? m.label : m.label.charAt(0)}</span>
            </NavLink>
          ))}
        </nav>

        <button
          onClick={() => setSidebarOuverte((v) => !v)}
          className="text-xs text-navy-300 px-4 py-2 border-t border-navy-700 text-left"
        >
          {sidebarOuverte ? '« Réduire' : '»'}
        </button>
      </aside>

      {/* Contenu */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between bg-white shadow-card px-6 py-3">
          <div>
            <p className="text-sm text-gray-500">Bienvenue,</p>
            <p className="font-semibold text-navy-900">
              {profile?.prenom} {profile?.nom} — {ROLE_LABELS[role] || role}
            </p>
          </div>
          <button
            onClick={signOut}
            className="text-sm text-navy-700 border border-navy-300 rounded px-3 py-1 hover:bg-navy-50"
          >
            Se déconnecter
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Phase 6 : assistant chatbot + bannière d'installation PWA, disponibles sur tout le portail */}
      <ChatbotWidget />
      <InstallPromptPWA />
    </div>
  )
}
