// DSI 360 — Gouvernance IT & PMO : contrats fournisseurs (Phase 5)
// Réutilise le référentiel CMDB central (cmdb_fournisseurs, cmdb_contrats).
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

const TYPE_LABELS = { maintenance: 'Maintenance', licence: 'Licence', support: 'Support', hebergement: 'Hébergement', autre: 'Autre' }
const STATUT_COULEURS = {
  actif: 'bg-green-100 text-green-800',
  expire: 'bg-red-100 text-red-800',
  resilie: 'bg-gray-200 text-gray-600',
  en_negociation: 'bg-amber-100 text-amber-800',
}

export default function Contrats() {
  const { tenantId, role } = useAuth()
  const [contrats, setContrats] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [modalContrat, setModalContrat] = useState(false)
  const [modalFournisseur, setModalFournisseur] = useState(false)
  const peutEditer = ['dsi', 'it_manager'].includes(role)

  const videContrat = { fournisseur_id: '', objet: '', type_contrat: 'maintenance', date_debut: '', date_fin: '', montant: '', devise: 'FCFA' }
  const [formContrat, setFormContrat] = useState(videContrat)
  const videFournisseur = { nom: '', contact_nom: '', contact_email: '', contact_tel: '', type_prestation: '' }
  const [formFournisseur, setFormFournisseur] = useState(videFournisseur)

  const charger = useCallback(async () => {
    if (!tenantId) return
    const { data: c } = await supabase
      .from('cmdb_contrats')
      .select('*, cmdb_fournisseurs(nom)')
      .eq('tenant_id', tenantId)
      .order('date_fin')
    setContrats(c || [])
    const { data: f } = await supabase.from('cmdb_fournisseurs').select('*').eq('tenant_id', tenantId).order('nom')
    setFournisseurs(f || [])
  }, [tenantId])

  useEffect(() => { charger() }, [charger])

  function joursRestants(dateFin) {
    if (!dateFin) return null
    return Math.ceil((new Date(dateFin) - new Date()) / (1000 * 60 * 60 * 24))
  }

  async function ajouterContrat(e) {
    e.preventDefault()
    await supabase.from('cmdb_contrats').insert({
      tenant_id: tenantId,
      fournisseur_id: formContrat.fournisseur_id || null,
      objet: formContrat.objet,
      type_contrat: formContrat.type_contrat,
      date_debut: formContrat.date_debut || null,
      date_fin: formContrat.date_fin || null,
      montant: Number(formContrat.montant) || null,
      devise: formContrat.devise,
    })
    setModalContrat(false)
    setFormContrat(videContrat)
    charger()
  }

  async function ajouterFournisseur(e) {
    e.preventDefault()
    await supabase.from('cmdb_fournisseurs').insert({ tenant_id: tenantId, ...formFournisseur })
    setModalFournisseur(false)
    setFormFournisseur(videFournisseur)
    charger()
  }

  async function changerStatutContrat(id, statut) {
    await supabase.from('cmdb_contrats').update({ statut }).eq('id', id)
    charger()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-bold text-navy-900">Contrats fournisseurs</h1>
        {peutEditer && (
          <div className="flex gap-2">
            <button onClick={() => setModalFournisseur(true)} className="border border-navy-300 text-navy-700 rounded px-4 py-2 text-sm">+ Fournisseur</button>
            <button onClick={() => setModalContrat(true)} className="bg-navy-900 text-white rounded px-4 py-2 text-sm">+ Nouveau contrat</button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-900">
            <tr>
              <th className="text-left px-3 py-2">Objet</th>
              <th className="text-left px-3 py-2">Fournisseur</th>
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-left px-3 py-2">Échéance</th>
              <th className="text-left px-3 py-2">Montant</th>
              <th className="text-left px-3 py-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {contrats.map((c) => {
              const jours = joursRestants(c.date_fin)
              return (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2">{c.objet}</td>
                  <td className="px-3 py-2">{c.cmdb_fournisseurs?.nom || '—'}</td>
                  <td className="px-3 py-2">{TYPE_LABELS[c.type_contrat]}</td>
                  <td className="px-3 py-2">
                    {c.date_fin}
                    {c.statut === 'actif' && jours != null && jours <= 60 && jours >= 0 && (
                      <span className="ml-2 text-xs text-amber-600 font-semibold">⚠ {jours}j</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{c.montant ? `${new Intl.NumberFormat('fr-FR').format(c.montant)} ${c.devise}` : '—'}</td>
                  <td className="px-3 py-2">
                    {peutEditer ? (
                      <select value={c.statut} onChange={(e) => changerStatutContrat(c.id, e.target.value)} className={`border rounded px-2 py-1 text-xs ${STATUT_COULEURS[c.statut]}`}>
                        <option value="actif">Actif</option>
                        <option value="expire">Expiré</option>
                        <option value="resilie">Résilié</option>
                        <option value="en_negociation">En négociation</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-xs ${STATUT_COULEURS[c.statut]}`}>{c.statut}</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {contrats.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-6">Aucun contrat enregistré.</td></tr>}
          </tbody>
        </table>
      </div>

      {modalFournisseur && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-navy-900 mb-4">Nouveau fournisseur</h2>
            <form onSubmit={ajouterFournisseur} className="space-y-3">
              <input required placeholder="Nom du fournisseur" value={formFournisseur.nom} onChange={(e) => setFormFournisseur({ ...formFournisseur, nom: e.target.value })} className="w-full border rounded px-3 py-2" />
              <input placeholder="Contact (nom)" value={formFournisseur.contact_nom} onChange={(e) => setFormFournisseur({ ...formFournisseur, contact_nom: e.target.value })} className="w-full border rounded px-3 py-2" />
              <input placeholder="Contact (email)" value={formFournisseur.contact_email} onChange={(e) => setFormFournisseur({ ...formFournisseur, contact_email: e.target.value })} className="w-full border rounded px-3 py-2" />
              <input placeholder="Contact (téléphone)" value={formFournisseur.contact_tel} onChange={(e) => setFormFournisseur({ ...formFournisseur, contact_tel: e.target.value })} className="w-full border rounded px-3 py-2" />
              <input placeholder="Type de prestation" value={formFournisseur.type_prestation} onChange={(e) => setFormFournisseur({ ...formFournisseur, type_prestation: e.target.value })} className="w-full border rounded px-3 py-2" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalFournisseur(false)} className="px-4 py-2 text-sm border rounded">Annuler</button>
                <button type="submit" className="px-4 py-2 text-sm bg-navy-900 text-white rounded">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalContrat && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-navy-900 mb-4">Nouveau contrat</h2>
            <form onSubmit={ajouterContrat} className="space-y-3">
              <select required value={formContrat.fournisseur_id} onChange={(e) => setFormContrat({ ...formContrat, fournisseur_id: e.target.value })} className="w-full border rounded px-3 py-2">
                <option value="">— Sélectionner un fournisseur —</option>
                {fournisseurs.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
              <input required placeholder="Objet du contrat" value={formContrat.objet} onChange={(e) => setFormContrat({ ...formContrat, objet: e.target.value })} className="w-full border rounded px-3 py-2" />
              <select value={formContrat.type_contrat} onChange={(e) => setFormContrat({ ...formContrat, type_contrat: e.target.value })} className="w-full border rounded px-3 py-2">
                {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date de début</label>
                  <input type="date" value={formContrat.date_debut} onChange={(e) => setFormContrat({ ...formContrat, date_debut: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date de fin</label>
                  <input type="date" value={formContrat.date_fin} onChange={(e) => setFormContrat({ ...formContrat, date_fin: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <input type="number" placeholder="Montant" value={formContrat.montant} onChange={(e) => setFormContrat({ ...formContrat, montant: e.target.value })} className="w-full border rounded px-3 py-2" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalContrat(false)} className="px-4 py-2 text-sm border rounded">Annuler</button>
                <button type="submit" className="px-4 py-2 text-sm bg-navy-900 text-white rounded">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
