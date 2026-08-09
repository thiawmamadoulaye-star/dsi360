// DSI 360 — Administration : layout avec navigation par onglets
import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const ONGLETS = [
  { path: '/admin/utilisateurs', label: 'Utilisateurs & rôles', roles: ['dsi', 'super_admin'] },
  { path: '/admin/logs', label: "Journal d'audit", roles: ['dsi', 'super_admin', 'controleur_interne'] },
  { path: '/admin/corbeille', label: 'Corbeille', roles: ['dsi', 'super_admin', 'it_manager'] },
  { path: '/admin/parametres', label: 'Paramètres du site', roles: ['dsi', 'super_admin'] },
]

export default function AdminLayout() {
  const { role } = useAuth()
  const onglets = ONGLETS.filter((o) => o.roles.includes(role))

  return (
    <div>
      <div className="flex gap-1 mb-4 border-b overflow-x-auto">
        {onglets.map((o) => (
          <NavLink
            key={o.path}
            to={o.path}
            className={({ isActive }) =>
              `px-4 py-2 text-sm whitespace-nowrap border-b-2 ${
                isActive ? 'border-navy-900 text-navy-900 font-semibold' : 'border-transparent text-gray-500'
              }`
            }
          >
            {o.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
