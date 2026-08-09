// DSI 360 — Garde de route générique par rôle (Phase 1)
import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { roleAutorise } from '../lib/roles'

/**
 * Encapsule une page et vérifie :
 *  1. que l'utilisateur est authentifié (sinon -> /login)
 *  2. que son rôle est autorisé pour cette route (sinon -> /acces-refuse)
 *
 * Usage :
 *   <ProtectedRoute roles={['dsi','it_manager','technicien']}>
 *     <Equipements />
 *   </ProtectedRoute>
 */
export default function ProtectedRoute({ roles, children }) {
  const { isAuthenticated, role, loading } = useAuth()

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-navy-700">Chargement…</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (roles && roles.length > 0 && !roleAutorise(role, roles)) {
    return <Navigate to="/acces-refuse" replace />
  }

  return children
}
