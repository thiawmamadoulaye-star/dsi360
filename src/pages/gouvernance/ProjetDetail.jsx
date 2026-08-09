// DSI 360 — Détail d'un projet IT : jalons, budget, avancement (Phase 5)
import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

const STATUT_PROJET = ['planifie', 'en_cours', 'en_retard', 'termine', 'abandonne']
const STATUT_JALON_LABELS = { a_venir: 'À venir', en_cours: 'En cours', atteint: 'Atteint', en_retard: 'En retard', abandonne: 'Abandonné' }
const STATUT_JALON_COULEURS = {
  a_venir: 'bg-gray-100 text-gray-700',
  en_cours: 'bg-blue-100 text-blue-800',
  atteint: 'bg-green-100 text-green-800',
  en_retard: 'bg-red-100 text-red-800',
  abandonne: 'bg-gray-200 text-gray-500',
}

export default function ProjetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tenantId, role } = useAuth()
  const [projet, setProjet] = useState(null)
  const [jalons, setJalons] = useState([])
  const [lignesBudget, setLignesBudget] = useState([])
  const [modalJalon, setModalJalon] = useState(false)
  const [modalBudget, setModalBudget] = useState(false)
  const peutEditer = role === 'dsi' || role === 'super_admin'

  const [formJalon, setFormJalon] = useState({ titre: '', date_prevue: '' })
  const [formBudget, setFormBudget] = useState({ categorie: 'capex', libelle: '', montant_prevu: '', montant_reel: '', periode: '' })

  const charger = useCallback(async () => {
    const { data: p } = await supabase.from('gouv_projets').select('*, chef:chef_projet_id(nom, prenom)').eq('id', id).single()
    setProjet(p)
    const { data: j } = await supabase.from('gouv_jalons').select('*').eq('projet_id', id).order('ordre')
    setJalons(j || [])
    const { data: b } = await supabase.from('gouv_budget_lignes').select('*').eq('projet_id', id).order('periode')
    setLignesBudget(b || [])
  }, [id])

  useEffect(() => { charger() }, [charger])

  async function changerStatutProjet(statut) {
    await supabase.from('gouv_projets').update({ statut }).eq('id', id)
    charger()
  }

  async function majCoutReel(valeur) {
    await supabase.from('gouv_projets').update({ cout_reel: Number(valeur) }).eq('id', id)
    charger()
  }

  async function ajouterJalon(e) {
    e.preventDefault()
    await supabase.from('gouv_jalons').insert({
      tenant_id: tenantId, projet_id: id, titre: formJalon.titre, date_prevue: formJalon.date_prevue || null,
      ordre: jalons.length,
    })
    setModalJalon(false)
    setFormJalon({ titre: '', date_prevue: '' })
    charger()
  }

  async function changerStatutJalon(jalonId, statut) {
    const champs = { statut }
    if (statut === 'atteint') champs.date_reelle = new Date().toISOString().slice(0, 10)
    await supabase.from('gouv_jalons').update(champs).eq('id', jalonId)
    charger()
  }

  async function ajouterLigneBudget(e) {
    e.preventDefault()
    await supabase.from('gouv_budget_lignes').insert({
      tenant_id: tenantId, projet_id: id,
      categorie: formBudget.categorie, libelle: formBudget.libelle,
      montant_prevu: Number(formBudget.montant_prevu) || 0,
      montant_reel: Number(formBudget.montant_reel) || 0,
      periode: formBudget.periode,
    })
    setModalBudget(false)
    setFormBudget({ categorie: 'capex', libelle: '', montant_prevu: '', montant_reel: '', periode: '' })
    charger()
  }

  if (!projet) return <p>Chargement…</p>

  const budgetTotal = (projet.budget_capex || 0) + (projet.budget_opex || 0)
  const consommation = budgetTotal > 0 ? Math.round(((projet.cout_reel || 0) / budgetTotal) * 100) : 0

  return (
    <div>
      <button onClick={() => navigate('/gouvernance/projets')} className="text-sm text-navy-700 mb-3">← Retour aux projets</button>

      <div className="bg-white rounded-lg shadow-card p-5 mb-4">
        <div className="flex justify-between items-start flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-navy-900">{projet.nom}</h1>
            <p className="text-sm text-gray-500">{projet.description}</p>
            <p className="text-sm text-gray-600 mt-1">Chef de projet : {projet.chef ? `${projet.chef.prenom || ''} ${projet.chef.nom}` : '—'}</p>
          </div>
          {peutEditer && (
            <select value={projet.statut} onChange={(e) => changerStatutProjet(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
              {STATUT_PROJET.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <p className="text-xs text-gray-500">Budget CAPEX</p>
            <p className="font-semibold">{new Intl.NumberFormat('fr-FR').format(projet.budget_capex || 0)} FCFA</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Budget OPEX</p>
            <p className="font-semibold">{new Intl.NumberFormat('fr-FR').format(projet.budget_opex || 0)} FCFA</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Coût réel</p>
            {peutEditer ? (
              <input
                type="number"
                defaultValue={projet.cout_reel || 0}
                onBlur={(e) => majCoutReel(e.target.value)}
                className="border rounded px-2 py-1 w-32"
              />
            ) : (
              <p className="font-semibold">{new Intl.NumberFormat('fr-FR').format(projet.cout_reel || 0)} FCFA</p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500">Consommation budgétaire</p>
            <p className={`font-semibold ${consommation > 100 ? 'text-red-600' : consommation > 85 ? 'text-amber-600' : ''}`}>{consommation}%</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-1">Avancement global (basé sur les jalons)</p>
          <div className="w-full bg-gray-100 rounded h-3">
            <div className="bg-navy-700 h-3 rounded" style={{ width: `${projet.avancement_pct}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-1">{projet.avancement_pct}%</p>
        </div>
      </div>

      {/* Jalons */}
      <div className="bg-white rounded-lg shadow-card p-5 mb-4">
        <div className="flex justify-between items-center mb-3">
          <p className="font-semibold text-navy-900">Jalons</p>
          {peutEditer && <button onClick={() => setModalJalon(true)} className="text-sm bg-navy-900 text-white rounded px-3 py-1.5">+ Ajouter</button>}
        </div>
        <div className="space-y-2">
          {jalons.map((j) => (
            <div key={j.id} className="flex justify-between items-center border-b pb-2">
              <div>
                <p className="text-sm font-medium">{j.titre}</p>
                <p className="text-xs text-gray-500">Prévu : {j.date_prevue || '—'} {j.date_reelle && `· Atteint : ${j.date_reelle}`}</p>
              </div>
              {peutEditer ? (
                <select value={j.statut} onChange={(e) => changerStatutJalon(j.id, e.target.value)} className="border rounded px-2 py-1 text-xs">
                  {Object.entries(STATUT_JALON_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              ) : (
                <span className={`px-2 py-0.5 rounded text-xs ${STATUT_JALON_COULEURS[j.statut]}`}>{STATUT_JALON_LABELS[j.statut]}</span>
              )}
            </div>
          ))}
          {jalons.length === 0 && <p className="text-gray-400 text-sm">Aucun jalon défini.</p>}
        </div>
      </div>

      {/* Lignes budgétaires */}
      <div className="bg-white rounded-lg shadow-card p-5">
        <div className="flex justify-between items-center mb-3">
          <p className="font-semibold text-navy-900">Détail budgétaire</p>
          {peutEditer && <button onClick={() => setModalBudget(true)} className="text-sm bg-navy-900 text-white rounded px-3 py-1.5">+ Ajouter une ligne</button>}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-900">
            <tr>
              <th className="text-left px-2 py-1">Catégorie</th>
              <th className="text-left px-2 py-1">Libellé</th>
              <th className="text-left px-2 py-1">Période</th>
              <th className="text-left px-2 py-1">Prévu</th>
              <th className="text-left px-2 py-1">Réel</th>
            </tr>
          </thead>
          <tbody>
            {lignesBudget.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-2 py-1 uppercase text-xs">{l.categorie}</td>
                <td className="px-2 py-1">{l.libelle}</td>
                <td className="px-2 py-1">{l.periode}</td>
                <td className="px-2 py-1">{new Intl.NumberFormat('fr-FR').format(l.montant_prevu || 0)}</td>
                <td className="px-2 py-1">{new Intl.NumberFormat('fr-FR').format(l.montant_reel || 0)}</td>
              </tr>
            ))}
            {lignesBudget.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-4">Aucune ligne budgétaire.</td></tr>}
          </tbody>
        </table>
      </div>

      {modalJalon && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-navy-900 mb-4">Nouveau jalon</h2>
            <form onSubmit={ajouterJalon} className="space-y-3">
              <input required placeholder="Titre du jalon" value={formJalon.titre} onChange={(e) => setFormJalon({ ...formJalon, titre: e.target.value })} className="w-full border rounded px-3 py-2" />
              <input type="date" value={formJalon.date_prevue} onChange={(e) => setFormJalon({ ...formJalon, date_prevue: e.target.value })} className="w-full border rounded px-3 py-2" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalJalon(false)} className="px-4 py-2 text-sm border rounded">Annuler</button>
                <button type="submit" className="px-4 py-2 text-sm bg-navy-900 text-white rounded">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalBudget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-navy-900 mb-4">Nouvelle ligne budgétaire</h2>
            <form onSubmit={ajouterLigneBudget} className="space-y-3">
              <select value={formBudget.categorie} onChange={(e) => setFormBudget({ ...formBudget, categorie: e.target.value })} className="w-full border rounded px-3 py-2">
                <option value="capex">CAPEX</option>
                <option value="opex">OPEX</option>
              </select>
              <input required placeholder="Libellé" value={formBudget.libelle} onChange={(e) => setFormBudget({ ...formBudget, libelle: e.target.value })} className="w-full border rounded px-3 py-2" />
              <input placeholder="Période (ex: 2026-Q3)" value={formBudget.periode} onChange={(e) => setFormBudget({ ...formBudget, periode: e.target.value })} className="w-full border rounded px-3 py-2" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Montant prévu" value={formBudget.montant_prevu} onChange={(e) => setFormBudget({ ...formBudget, montant_prevu: e.target.value })} className="w-full border rounded px-3 py-2" />
                <input type="number" placeholder="Montant réel" value={formBudget.montant_reel} onChange={(e) => setFormBudget({ ...formBudget, montant_reel: e.target.value })} className="w-full border rounded px-3 py-2" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalBudget(false)} className="px-4 py-2 text-sm border rounded">Annuler</button>
                <button type="submit" className="px-4 py-2 text-sm bg-navy-900 text-white rounded">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
