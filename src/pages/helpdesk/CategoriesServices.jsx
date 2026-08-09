// DSI 360 — Helpdesk ITSM : catalogue de services + SLA (Phase 2)
// Accessible à DSI et IT Manager uniquement (gestion des SLA du catalogue).
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

export default function CategoriesServices() {
  const { tenantId } = useAuth()
  const [categories, setCategories] = useState([])
  const [nom, setNom] = useState('')
  const [slaHeures, setSlaHeures] = useState(24)

  const charger = useCallback(async () => {
    if (!tenantId) return
    const { data } = await supabase
      .from('itsm_categories_services')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('nom')
    setCategories(data || [])
  }, [tenantId])

  useEffect(() => { charger() }, [charger])

  async function ajouter(e) {
    e.preventDefault()
    if (!nom.trim()) return
    await supabase.from('itsm_categories_services').insert({
      tenant_id: tenantId,
      nom: nom.trim(),
      sla_heures: slaHeures,
    })
    setNom('')
    setSlaHeures(24)
    charger()
  }

  async function modifierSla(id, valeur) {
    await supabase.from('itsm_categories_services').update({ sla_heures: valeur }).eq('id', id)
    charger()
  }

  async function supprimer(id) {
    if (!confirm('Supprimer cette catégorie de service ?')) return
    await supabase.from('itsm_categories_services').delete().eq('id', id)
    charger()
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-navy-900 mb-4">Catalogue de services & SLA</h1>

      <form onSubmit={ajouter} className="bg-white rounded-lg shadow-card p-4 mb-4 flex gap-3 items-end flex-wrap">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Nom du service</label>
          <input value={nom} onChange={(e) => setNom(e.target.value)} className="border rounded px-3 py-2 text-sm" placeholder="Ex : Support poste de travail" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">SLA (heures)</label>
          <input type="number" value={slaHeures} onChange={(e) => setSlaHeures(Number(e.target.value))} className="border rounded px-3 py-2 text-sm w-24" />
        </div>
        <button type="submit" className="bg-navy-900 text-white rounded px-4 py-2 text-sm">Ajouter</button>
      </form>

      <div className="bg-white rounded-lg shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-900">
            <tr>
              <th className="text-left px-3 py-2">Service</th>
              <th className="text-left px-3 py-2">SLA (heures)</th>
              <th className="text-left px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2">{c.nom}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    defaultValue={c.sla_heures}
                    onBlur={(e) => modifierSla(c.id, Number(e.target.value))}
                    className="border rounded px-2 py-1 w-20"
                  />
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => supprimer(c.id)} className="text-red-600 text-xs underline">Supprimer</button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan={3} className="text-center text-gray-400 py-6">Aucune catégorie de service définie.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
