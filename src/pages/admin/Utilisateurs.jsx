// DSI 360 — Administration : Gestion des utilisateurs et des rôles
import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { ROLE_LABELS, ROLES } from '../../lib/roles'
import NouvelUtilisateurModal from './NouvelUtilisateurModal'

export default function Utilisateurs() {
  const { tenantId, role } = useAuth()
  const [utilisateurs, setUtilisateurs] = useState([])
  const [modalOuverte, setModalOuverte] = useState(false)
  const peutCreer = role === ROLES.DSI || role === ROLES.SUPER_ADMIN

  useEffect(() => {
    if (!tenantId) return
    charger()
  }, [tenantId])

  async function charger() {
    const { data } = await supabase.from('profiles').select('*').eq('tenant_id', tenantId).order('nom')
    setUtilisateurs(data || [])
  }

  async function changerRole(userId, nouveauRole) {
    const { error } = await supabase.from('profiles').update({ role: nouveauRole }).eq('id', userId)
    if (error) alert("Erreur : " + error.message)
    else charger()
  }

  async function changerStatut(userId, statutActuel) {
    const nouveauStatut = statutActuel === 'actif' ? 'inactif' : 'actif'
    const { error } = await supabase.from('profiles').update({ statut: nouveauStatut }).eq('id', userId)
    if (error) alert("Erreur : " + error.message)
    else charger()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-bold text-navy-900">Utilisateurs & rôles</h1>
        {peutCreer && (
          <button onClick={() => setModalOuverte(true)} className="bg-navy-900 text-white rounded px-4 py-2 text-sm">
            + Nouvel utilisateur
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-900">
            <tr>
              <th className="text-left px-3 py-2">Nom</th>
              <th className="text-left px-3 py-2">E-mail</th>
              <th className="text-left px-3 py-2">Rôle</th>
              <th className="text-left px-3 py-2">Statut</th>
              {peutCreer && <th className="text-left px-3 py-2">Action</th>}
            </tr>
          </thead>
          <tbody>
            {utilisateurs.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">{u.prenom} {u.nom}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">
                  <select value={u.role} onChange={(e) => changerRole(u.id, e.target.value)} disabled={!peutCreer} className="border rounded px-2 py-1">
                    {Object.values(ROLES).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${u.statut === 'actif' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                    {u.statut}
                  </span>
                </td>
                {peutCreer && (
                  <td className="px-3 py-2">
                    <button onClick={() => changerStatut(u.id, u.statut)} className="text-xs text-navy-700 underline">
                      {u.statut === 'actif' ? 'Désactiver' : 'Réactiver'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {utilisateurs.length === 0 && (
              <tr><td colSpan={5} className="text-center text-gray-400 py-6">Aucun utilisateur.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOuverte && (
        <NouvelUtilisateurModal onClose={() => setModalOuverte(false)} onCreated={() => { setModalOuverte(false); charger() }} />
      )}
    </div>
  )
}
