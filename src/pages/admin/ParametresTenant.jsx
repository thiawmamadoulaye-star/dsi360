// DSI 360 — Administration : Paramètres du site (identité du tenant)
import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

export default function ParametresTenant() {
  const { tenantId, refreshProfile } = useAuth()
  const [form, setForm] = useState({ nom: '', logo_url: '', couleur_primaire: '', couleur_secondaire: '' })
  const [enregistrement, setEnregistrement] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!tenantId) return
    supabase.from('tenants').select('*').eq('id', tenantId).single().then(({ data }) => {
      if (data) setForm({
        nom: data.nom || '',
        logo_url: data.logo_url || '',
        couleur_primaire: data.couleur_primaire || '#0d0f21',
        couleur_secondaire: data.couleur_secondaire || '#c9a227',
      })
    })
  }, [tenantId])

  async function enregistrer(e) {
    e.preventDefault()
    setEnregistrement(true)
    setMessage('')
    const { error } = await supabase.from('tenants').update({
      nom: form.nom,
      logo_url: form.logo_url || null,
      couleur_primaire: form.couleur_primaire,
      couleur_secondaire: form.couleur_secondaire,
    }).eq('id', tenantId)
    setEnregistrement(false)
    if (error) {
      setMessage("Erreur : " + error.message)
    } else {
      setMessage('Paramètres enregistrés. Rechargez la page pour voir les changements.')
      refreshProfile?.()
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-navy-900 mb-4">Paramètres du site</h1>
      <form onSubmit={enregistrer} className="bg-white rounded-lg shadow-card p-5 max-w-lg space-y-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Nom de l'organisation</label>
          <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">URL du logo (optionnel)</label>
          <input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="https://…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Couleur primaire</label>
            <input type="color" value={form.couleur_primaire} onChange={(e) => setForm({ ...form, couleur_primaire: e.target.value })} className="w-full h-10 border rounded" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Couleur secondaire</label>
            <input type="color" value={form.couleur_secondaire} onChange={(e) => setForm({ ...form, couleur_secondaire: e.target.value })} className="w-full h-10 border rounded" />
          </div>
        </div>
        {message && <p className="text-sm text-navy-700">{message}</p>}
        <button type="submit" disabled={enregistrement} className="bg-navy-900 text-white rounded px-4 py-2 text-sm disabled:opacity-60">
          {enregistrement ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}
