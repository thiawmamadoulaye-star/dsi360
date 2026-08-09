// DSI 360 — Suivi des vulnérabilités (Phase 3)
// Lié optionnellement à un équipement du référentiel CMDB (ParcIT).
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { peutEditerDonneesOperationnelles } from '../../lib/roles'

const CRITICITE_COULEURS = {
  faible: 'bg-green-100 text-green-800',
  moyenne: 'bg-amber-100 text-amber-800',
  elevee: 'bg-orange-100 text-orange-800',
  critique: 'bg-red-100 text-red-800',
}

export default function Vulnerabilites() {
  const { tenantId, role } = useAuth()
  const [vulns, setVulns] = useState([])
  const [equipements, setEquipements] = useState([])
  const [modalOuverte, setModalOuverte] = useState(false)
  const [form, setForm] = useState({ description: '', cve_reference: '', criticite: 'moyenne', equipement_id: '' })
  const peutEditer = peutEditerDonneesOperationnelles(role) || role === 'rssi'

  const charger = useCallback(async () => {
    if (!tenantId) return
    const { data } = await supabase
      .from('cyber_vulnerabilites')
      .select('*, cmdb_equipements(code_actif, type_equipement)')
      .eq('tenant_id', tenantId)
      .order('date_detection', { ascending: false })
    setVulns(data || [])
  }, [tenantId])

  useEffect(() => {
    charger()
    if (tenantId) {
      supabase.from('cmdb_equipements').select('id, code_actif, type_equipement').eq('tenant_id', tenantId).is('deleted_at', null)
        .then(({ data }) => setEquipements(data || []))
    }
  }, [tenantId, charger])

  async function ajouter(e) {
    e.preventDefault()
    await supabase.from('cyber_vulnerabilites').insert({
      tenant_id: tenantId,
      description: form.description,
      cve_reference: form.cve_reference || null,
      criticite: form.criticite,
      equipement_id: form.equipement_id || null,
    })
    setModalOuverte(false)
    setForm({ description: '', cve_reference: '', criticite: 'moyenne', equipement_id: '' })
    charger()
  }

  async function changerStatut(id, statut) {
    const champs = { statut }
    if (statut === 'corrigee') champs.date_remediation = new Date().toISOString().slice(0, 10)
    await supabase.from('cyber_vulnerabilites').update(champs).eq('id', id)
    charger()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-bold text-navy-900">Suivi des vulnérabilités</h1>
        {peutEditer && (
          <button onClick={() => setModalOuverte(true)} className="bg-navy-900 text-white rounded px-4 py-2 text-sm">
            + Signaler une vulnérabilité
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-900">
            <tr>
              <th className="text-left px-3 py-2">Description</th>
              <th className="text-left px-3 py-2">CVE</th>
              <th className="text-left px-3 py-2">Équipement</th>
              <th className="text-left px-3 py-2">Criticité</th>
              <th className="text-left px-3 py-2">Détectée le</th>
              <th className="text-left px-3 py-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {vulns.map((v) => (
              <tr key={v.id} className="border-t">
                <td className="px-3 py-2">{v.description}</td>
                <td className="px-3 py-2">{v.cve_reference || '—'}</td>
                <td className="px-3 py-2">{v.cmdb_equipements?.code_actif || '—'}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${CRITICITE_COULEURS[v.criticite]}`}>{v.criticite}</span>
                </td>
                <td className="px-3 py-2">{v.date_detection}</td>
                <td className="px-3 py-2">
                  <select value={v.statut} onChange={(e) => changerStatut(v.id, e.target.value)} className="border rounded px-2 py-1 text-xs">
                    <option value="ouverte">Ouverte</option>
                    <option value="en_remediation">En remédiation</option>
                    <option value="corrigee">Corrigée</option>
                    <option value="risque_accepte">Risque accepté</option>
                  </select>
                </td>
              </tr>
            ))}
            {vulns.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-6">Aucune vulnérabilité enregistrée.</td></tr>}
          </tbody>
        </table>
      </div>

      {modalOuverte && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-navy-900 mb-4">Signaler une vulnérabilité</h2>
            <form onSubmit={ajouter} className="space-y-3">
              <textarea required placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded px-3 py-2" rows={2} />
              <input placeholder="Référence CVE (optionnel)" value={form.cve_reference} onChange={(e) => setForm({ ...form, cve_reference: e.target.value })} className="w-full border rounded px-3 py-2" />
              <select value={form.criticite} onChange={(e) => setForm({ ...form, criticite: e.target.value })} className="w-full border rounded px-3 py-2">
                <option value="faible">Faible</option>
                <option value="moyenne">Moyenne</option>
                <option value="elevee">Élevée</option>
                <option value="critique">Critique</option>
              </select>
              <select value={form.equipement_id} onChange={(e) => setForm({ ...form, equipement_id: e.target.value })} className="w-full border rounded px-3 py-2">
                <option value="">— Équipement non lié —</option>
                {equipements.map((eq) => <option key={eq.id} value={eq.id}>{eq.code_actif} ({eq.type_equipement})</option>)}
              </select>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOuverte(false)} className="px-4 py-2 text-sm border rounded">Annuler</button>
                <button type="submit" className="px-4 py-2 text-sm bg-navy-900 text-white rounded">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
