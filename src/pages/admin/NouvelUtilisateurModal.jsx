// DSI 360 — Administration : modale de création d'utilisateur (Edge Function)
import React, { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { ROLE_LABELS, ROLES } from '../../lib/roles'

const ROLES_CREABLES = Object.values(ROLES).filter((r) => r !== ROLES.SUPER_ADMIN)

export default function NouvelUtilisateurModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    email: '', password: '', nom: '', prenom: '', role: ROLES.TECHNICIEN, poste: '',
  })
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErreur('')
    setEnCours(true)

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setErreur(data.error || 'Une erreur est survenue.')
        setEnCours(false)
        return
      }
      onCreated()
    } catch (e) {
      setErreur("Erreur réseau, réessayez.")
      setEnCours(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-bold text-navy-900 mb-4">Nouvel utilisateur</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Prénom</label>
              <input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Nom</label>
              <input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="w-full border rounded px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Adresse e-mail</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="prenom.nom@cabinet.sn" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Mot de passe temporaire</label>
            <input required type="text" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Au moins 8 caractères" />
            <p className="text-xs text-gray-500 mt-1">Communiquez ce mot de passe à l'utilisateur ; il pourra le modifier ensuite.</p>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Rôle</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full border rounded px-3 py-2">
              {ROLES_CREABLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Poste (optionnel)</label>
            <input value={form.poste} onChange={(e) => setForm({ ...form, poste: e.target.value })} className="w-full border rounded px-3 py-2" />
          </div>

          {erreur && <p className="text-sm text-red-600">{erreur}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded">Annuler</button>
            <button type="submit" disabled={enCours} className="px-4 py-2 text-sm bg-navy-900 text-white rounded disabled:opacity-60">
              {enCours ? 'Création…' : "Créer l'utilisateur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
