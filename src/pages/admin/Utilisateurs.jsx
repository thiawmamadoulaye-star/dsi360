// DSI 360 — Administration : Gestion des utilisateurs et des rôles (Phase 1)
import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { ROLE_LABELS, ROLES } from '../../lib/roles'

export default function Utilisateurs() {
  const { tenantId } = useAuth()
  const [utilisateurs, setUtilisateurs] = useState([])

  useEffect(() => {
    if (!tenantId) return
    charger()
  }, [tenantId])

  async function charger() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('nom')
    setUtilisateurs(data || [])
  }

  async function changerRole(userId, nouveauRole) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: nouveauRole })
      .eq('id', userId)
    if (error) {
      alert("Erreur : " + error.message) // ex. bloqué par le trigger anti-élévation
    } else {
      charger()
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-navy-900 mb-4">Utilisateurs & rôles</h1>
      <div className="bg-white rounded-lg shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-900">
            <tr>
              <th className="text-left px-3 py-2">Nom</th>
              <th className="text-left px-3 py-2">E-mail</th>
              <th className="text-left px-3 py-2">Rôle</th>
              <th className="text-left px-3 py-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {utilisateurs.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">{u.prenom} {u.nom}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">
                  <select
                    value={u.role}
                    onChange={(e) => changerRole(u.id, e.target.value)}
                    className="border rounded px-2 py-1"
                  >
                    {Object.values(ROLES).map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">{u.statut}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
