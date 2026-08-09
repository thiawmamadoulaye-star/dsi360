// DSI 360 — Module ParcIT : Équipements (inventaire complet)
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { peutEditerDonneesOperationnelles } from '../../lib/roles'
import { STATUTS, STATUT_LABELS, STATUT_COULEURS, calculerAgeAns } from './parcitConstants'
import { COLONNES_DISPONIBLES, CLE_PARAMETRE_COLONNES } from './colonnesConfig'
import { equipementsVersCSV, telechargerFichier } from './csvUtils'
import NouvelEquipementModal from './NouvelEquipementModal'
import EquipementDetailModal from './EquipementDetailModal'
import ColonnesModal from './ColonnesModal'
import ImporterModal from './ImporterModal'

const TAILLE_PAGE = 25

export default function Equipements() {
  const { tenantId, role } = useAuth()
  const [equipements, setEquipements] = useState([])
  const [loading, setLoading] = useState(true)
  const [seuilObsolescence, setSeuilObsolescence] = useState(5)
  const [colonnesVisibles, setColonnesVisibles] = useState(COLONNES_DISPONIBLES.filter((c) => c.parDefaut).map((c) => c.cle))

  const [recherche, setRecherche] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [filtreMarque, setFiltreMarque] = useState('tous')
  const [filtreType, setFiltreType] = useState('tous')
  const [filtreOS, setFiltreOS] = useState('tous')
  const [obsoletesUniquement, setObsoletesUniquement] = useState(false)

  const [tri, setTri] = useState({ cle: 'code_actif', sens: 'asc' })
  const [page, setPage] = useState(1)
  const [selection, setSelection] = useState(new Set())

  const [modalAjout, setModalAjout] = useState(false)
  const [modalColonnes, setModalColonnes] = useState(false)
  const [modalImport, setModalImport] = useState(false)
  const [equipementDetail, setEquipementDetail] = useState(null)

  const peutEditer = peutEditerDonneesOperationnelles(role)

  const charger = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('cmdb_equipements')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) console.error(error)
    setEquipements((data || []).map((e) => ({ ...e, age_ans: calculerAgeAns(e.date_bios) })))
    setLoading(false)
    setSelection(new Set())
  }, [tenantId])

  useEffect(() => { charger() }, [charger])

  useEffect(() => {
    if (!tenantId) return
    supabase.from('parametres_tenant').select('cle, valeur').eq('tenant_id', tenantId)
      .in('cle', [CLE_PARAMETRE_COLONNES, 'obsolescence_bios_seuil_annees'])
      .then(({ data }) => {
        data?.forEach((p) => {
          if (p.cle === CLE_PARAMETRE_COLONNES && Array.isArray(p.valeur)) setColonnesVisibles(p.valeur)
          if (p.cle === 'obsolescence_bios_seuil_annees') setSeuilObsolescence(Number(p.valeur) || 5)
        })
      })
  }, [tenantId])

  const marques = useMemo(() => [...new Set(equipements.map((e) => e.marque).filter(Boolean))].sort(), [equipements])
  const types = useMemo(() => [...new Set(equipements.map((e) => e.type_equipement).filter(Boolean))].sort(), [equipements])
  const systemesOS = useMemo(() => [...new Set(equipements.map((e) => e.os).filter(Boolean))].sort(), [equipements])

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return equipements.filter((e) => {
      if (filtreStatut !== 'tous' && e.statut !== filtreStatut) return false
      if (filtreMarque !== 'tous' && e.marque !== filtreMarque) return false
      if (filtreType !== 'tous' && e.type_equipement !== filtreType) return false
      if (filtreOS !== 'tous' && e.os !== filtreOS) return false
      if (obsoletesUniquement) {
        const estObs = e.statut === 'obsolete' || (e.age_ans != null && e.age_ans > seuilObsolescence)
        if (!estObs) return false
      }
      if (q) {
        const cible = [e.code_actif, e.utilisateur_nom_libre, e.localisation, e.numero_serie, e.processeur, e.marque, e.modele]
          .filter(Boolean).join(' ').toLowerCase()
        if (!cible.includes(q)) return false
      }
      return true
    })
  }, [equipements, recherche, filtreStatut, filtreMarque, filtreType, filtreOS, obsoletesUniquement, seuilObsolescence])

  const tries = useMemo(() => {
    const copie = [...filtres]
    copie.sort((a, b) => {
      let va = a[tri.cle], vb = b[tri.cle]
      if (va == null) va = ''
      if (vb == null) vb = ''
      if (typeof va === 'number' && typeof vb === 'number') return tri.sens === 'asc' ? va - vb : vb - va
      return tri.sens === 'asc'
        ? String(va).localeCompare(String(vb), 'fr')
        : String(vb).localeCompare(String(va), 'fr')
    })
    return copie
  }, [filtres, tri])

  const totalPages = Math.max(1, Math.ceil(tries.length / TAILLE_PAGE))
  const pageActuelle = Math.min(page, totalPages)
  const pageItems = tries.slice((pageActuelle - 1) * TAILLE_PAGE, pageActuelle * TAILLE_PAGE)

  function changerTri(cle) {
    setTri((prev) => prev.cle === cle ? { cle, sens: prev.sens === 'asc' ? 'desc' : 'asc' } : { cle, sens: 'asc' })
  }

  function toggleSelection(id) {
    setSelection((prev) => {
      const nouveau = new Set(prev)
      nouveau.has(id) ? nouveau.delete(id) : nouveau.add(id)
      return nouveau
    })
  }

  function toggleSelectionPage() {
    const idsPage = pageItems.map((e) => e.id)
    const touslesSelectionnes = idsPage.every((id) => selection.has(id))
    setSelection((prev) => {
      const nouveau = new Set(prev)
      idsPage.forEach((id) => touslesSelectionnes ? nouveau.delete(id) : nouveau.add(id))
      return nouveau
    })
  }

  async function supprimerSelection() {
    if (selection.size === 0) return
    if (!confirm(`Supprimer les ${selection.size} équipement(s) sélectionné(s) ? Ils seront déplacés vers la corbeille.`)) return
    const { error } = await supabase.rpc('fn_soft_delete_equipements_bulk', { p_ids: Array.from(selection) })
    if (error) { alert('Erreur : ' + error.message); return }
    charger()
  }

  const colonnesAffichees = COLONNES_DISPONIBLES.filter((c) => colonnesVisibles.includes(c.cle))

  function exporterCSV() {
    const csv = equipementsVersCSV(tries, colonnesAffichees)
    telechargerFichier(csv, 'parc_informatique.csv', 'text/csv;charset=utf-8;')
  }

  function exporterJSON() {
    telechargerFichier(JSON.stringify(tries, null, 2), 'parc_informatique.json', 'application/json')
  }

  function estObsolete(e) {
    return e.statut === 'obsolete' || (e.age_ans != null && e.age_ans > seuilObsolescence)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Parc informatique</h1>
          <p className="text-sm text-gray-500">{tries.length} équipement(s) sur {equipements.length}.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setModalColonnes(true)} className="border border-navy-300 text-navy-700 rounded px-3 py-2 text-sm">Colonnes</button>
          {peutEditer && <button onClick={() => setModalImport(true)} className="border border-navy-300 text-navy-700 rounded px-3 py-2 text-sm">Importer</button>}
          <button onClick={exporterJSON} className="border border-navy-300 text-navy-700 rounded px-3 py-2 text-sm">JSON</button>
          <button onClick={exporterCSV} className="border border-navy-300 text-navy-700 rounded px-3 py-2 text-sm">CSV</button>
          {peutEditer && <button onClick={() => setModalAjout(true)} className="bg-navy-900 text-white rounded px-4 py-2 text-sm">+ Ajouter</button>}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card p-3 mb-3 space-y-2">
        <div className="flex gap-2 flex-wrap items-center">
          <input
            value={recherche}
            onChange={(e) => { setRecherche(e.target.value); setPage(1) }}
            placeholder="Rechercher nom, utilisateur, localité, n° série, processeur…"
            className="flex-1 min-w-[240px] border rounded px-3 py-2 text-sm"
          />
          <button
            onClick={() => { setObsoletesUniquement((v) => !v); setPage(1) }}
            className={`text-sm px-3 py-2 rounded border ${obsoletesUniquement ? 'bg-red-600 text-white border-red-600' : 'border-amber-400 text-amber-700'}`}
          >
            ⚠ Obsolètes uniquement
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={filtreStatut} onChange={(e) => { setFiltreStatut(e.target.value); setPage(1) }} className="border rounded px-2 py-1.5 text-sm">
            <option value="tous">Tous les statuts</option>
            {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filtreMarque} onChange={(e) => { setFiltreMarque(e.target.value); setPage(1) }} className="border rounded px-2 py-1.5 text-sm">
            <option value="tous">Tous les fabricants</option>
            {marques.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filtreType} onChange={(e) => { setFiltreType(e.target.value); setPage(1) }} className="border rounded px-2 py-1.5 text-sm">
            <option value="tous">Tous les types</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filtreOS} onChange={(e) => { setFiltreOS(e.target.value); setPage(1) }} className="border rounded px-2 py-1.5 text-sm">
            <option value="tous">Tous les OS</option>
            {systemesOS.map((os) => <option key={os} value={os}>{os}</option>)}
          </select>
        </div>
      </div>

      {selection.size > 0 && peutEditer && (
        <div className="bg-navy-900 text-white rounded-lg px-4 py-2 mb-3 flex items-center justify-between">
          <span className="text-sm">{selection.size} sélectionné(s)</span>
          <button onClick={supprimerSelection} className="bg-red-600 text-white text-sm px-3 py-1.5 rounded">Supprimer la sélection</button>
        </div>
      )}

      {loading ? (
        <p>Chargement…</p>
      ) : (
        <div className="bg-white rounded-lg shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-navy-900">
              <tr>
                {peutEditer && (
                  <th className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={pageItems.length > 0 && pageItems.every((e) => selection.has(e.id))}
                      onChange={toggleSelectionPage}
                    />
                  </th>
                )}
                {colonnesAffichees.map((c) => (
                  <th key={c.cle} className="text-left px-3 py-2 cursor-pointer select-none whitespace-nowrap" onClick={() => changerTri(c.cle)}>
                    {c.label} {tri.cle === c.cle ? (tri.sens === 'asc' ? '▲' : '▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((e) => (
                <tr key={e.id} className="border-t hover:bg-navy-50">
                  {peutEditer && (
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selection.has(e.id)} onChange={() => toggleSelection(e.id)} />
                    </td>
                  )}
                  {colonnesAffichees.map((c) => (
                    <td key={c.cle} className="px-3 py-2 cursor-pointer whitespace-nowrap" onClick={() => setEquipementDetail(e)}>
                      {renduCellule(e, c.cle, estObsolete)}
                    </td>
                  ))}
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr><td colSpan={colonnesAffichees.length + 1} className="text-center text-gray-400 py-6">Aucun équipement ne correspond aux critères.</td></tr>
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-3 py-2 border-t text-sm">
            <span className="text-gray-500">Page {pageActuelle} / {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={pageActuelle <= 1} onClick={() => setPage((p) => p - 1)} className="border rounded px-3 py-1 disabled:opacity-40">Précédent</button>
              <button disabled={pageActuelle >= totalPages} onClick={() => setPage((p) => p + 1)} className="border rounded px-3 py-1 disabled:opacity-40">Suivant</button>
            </div>
          </div>
        </div>
      )}

      {modalAjout && (
        <NouvelEquipementModal onClose={() => setModalAjout(false)} onCreated={() => { setModalAjout(false); charger() }} />
      )}
      {modalColonnes && (
        <ColonnesModal
          colonnesVisibles={colonnesVisibles}
          onClose={() => setModalColonnes(false)}
          onSaved={(nv) => { setColonnesVisibles(nv); setModalColonnes(false) }}
        />
      )}
      {modalImport && (
        <ImporterModal onClose={() => setModalImport(false)} onImported={() => { setModalImport(false); charger() }} />
      )}
      {equipementDetail && (
        <EquipementDetailModal
          equipement={equipementDetail}
          onClose={() => setEquipementDetail(null)}
          onUpdated={() => { setEquipementDetail(null); charger() }}
          onDeleted={() => { setEquipementDetail(null); charger() }}
        />
      )}
    </div>
  )
}

function renduCellule(e, cle, estObsolete) {
  if (cle === 'statut') {
    return (
      <span className={`px-2 py-0.5 rounded text-xs ${STATUT_COULEURS[e.statut] || 'bg-gray-100 text-gray-700'}`}>
        {STATUT_LABELS[e.statut] || e.statut}
      </span>
    )
  }
  if (cle === 'code_actif') {
    return (
      <span className="font-medium">
        {estObsolete(e) && <span className="text-amber-500 mr-1" title="Équipement obsolète">⚠</span>}
        {e.code_actif || '—'}
      </span>
    )
  }
  if (cle === 'os_complet') return [e.os, e.os_version].filter(Boolean).join(' ') || '—'
  if (cle === 'utilisateur') return e.utilisateur_nom_libre || '—'
  if (cle === 'age_ans') return e.age_ans != null ? `${e.age_ans} an(s)` : '—'
  if (cle === 'cout_acquisition') return e.cout_acquisition ? new Intl.NumberFormat('fr-FR').format(e.cout_acquisition) : '—'
  return e[cle] || '—'
}
