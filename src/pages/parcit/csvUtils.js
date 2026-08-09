// DSI 360 — ParcIT : utilitaires import/export CSV & JSON (sans dépendance externe)

export function parserCSV(texte) {
  const lignes = []
  let i = 0, champ = '', ligne = [], dansGuillemets = false
  while (i < texte.length) {
    const c = texte[i]
    if (dansGuillemets) {
      if (c === '"') {
        if (texte[i + 1] === '"') { champ += '"'; i += 2; continue }
        dansGuillemets = false; i++; continue
      }
      champ += c; i++; continue
    } else {
      if (c === '"') { dansGuillemets = true; i++; continue }
      if (c === ',' || c === ';') { ligne.push(champ); champ = ''; i++; continue }
      if (c === '\r') { i++; continue }
      if (c === '\n') { ligne.push(champ); lignes.push(ligne); ligne = []; champ = ''; i++; continue }
      champ += c; i++; continue
    }
  }
  if (champ.length || ligne.length) { ligne.push(champ); lignes.push(ligne) }
  return lignes.filter((l) => l.some((v) => (v ?? '').toString().trim() !== ''))
}

function normaliserEntete(txt) {
  return (txt || '')
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export const CORRESPONDANCE_ENTETES = {
  code_actif: 'code_actif', nom: 'code_actif', code: 'code_actif', code_inventaire: 'code_actif',
  type: 'type_equipement', type_equipement: 'type_equipement', type_de_materiel: 'type_equipement', type_materiel: 'type_equipement',
  marque: 'marque', fabricant: 'marque',
  modele: 'modele', model: 'modele',
  numero_de_serie: 'numero_serie', numero_serie: 'numero_serie', n_serie: 'numero_serie', serial: 'numero_serie',
  processeur: 'processeur', cpu: 'processeur',
  ram: 'ram_go', ram_go: 'ram_go', memoire_ram: 'ram_go', memoire: 'ram_go',
  os: 'os', systeme_d_exploitation: 'os', systeme_exploitation: 'os',
  version_os: 'os_version', version_du_systeme: 'os_version', version_systeme: 'os_version',
  localisation: 'localisation', localite: 'localisation', site: 'localisation',
  statut: 'statut', etat: 'statut',
  date_d_acquisition: 'date_acquisition', date_acquisition: 'date_acquisition',
  date_bios: 'date_bios', date_du_bios: 'date_bios',
  cout: 'cout_acquisition', cout_d_acquisition: 'cout_acquisition', cout_acquisition: 'cout_acquisition', prix: 'cout_acquisition',
  utilisateur: 'utilisateur_nom_libre', utilisateur_assigne: 'utilisateur_nom_libre', assigne_a: 'utilisateur_nom_libre',
}

const STATUTS_VALIDES = ['en_service', 'en_cours_utilisation', 'en_stock', 'en_maintenance', 'obsolete', 'reforme', 'perdu_vole']

function parserDate(valeur) {
  if (!valeur) return null
  const v = valeur.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)
  const m1 = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m1) return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`
  const m2 = v.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (m2) return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`
  return null
}

function normaliserStatut(valeur) {
  const v = normaliserEntete(valeur)
  if (STATUTS_VALIDES.includes(v)) return v
  if (v.includes('service') && v.includes('hors')) return 'en_maintenance'
  if (v.includes('correct') || v.includes('service')) return 'en_service'
  if (v.includes('stock')) return 'en_stock'
  if (v.includes('obsolet')) return 'obsolete'
  if (v.includes('reform')) return 'reforme'
  if (v.includes('perdu') || v.includes('vol')) return 'perdu_vole'
  return 'en_service'
}

export function csvVersEquipements(texte) {
  const lignes = parserCSV(texte)
  if (lignes.length < 2) return []
  const entetes = lignes[0].map((e) => CORRESPONDANCE_ENTETES[normaliserEntete(e)] || null)

  const resultats = []
  for (const ligne of lignes.slice(1)) {
    const obj = {}
    entetes.forEach((cle, idx) => {
      if (!cle) return
      let val = (ligne[idx] ?? '').toString().trim()
      if (!val) return
      if (cle === 'date_acquisition' || cle === 'date_bios') {
        const d = parserDate(val)
        if (d) obj[cle] = d
        return
      }
      if (cle === 'ram_go' || cle === 'cout_acquisition') {
        const nettoye = val.replace(/[^\d.,]/g, '').replace(',', '.')
        const n = parseFloat(nettoye)
        if (!isNaN(n)) obj[cle] = n
        return
      }
      if (cle === 'statut') { obj[cle] = normaliserStatut(val); return }
      obj[cle] = val
    })
    if (!obj.type_equipement) obj.type_equipement = 'Autre'
    if (!obj.statut) obj.statut = 'en_service'
    if (Object.keys(obj).length > 2) resultats.push(obj)
  }
  return resultats
}

export function telechargerFichier(contenu, nomFichier, type) {
  const blob = new Blob([contenu], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomFichier
  a.click()
  URL.revokeObjectURL(url)
}

export function equipementsVersCSV(equipements, colonnes) {
  const entetes = colonnes.map((c) => c.label)
  const lignes = equipements.map((eq) => colonnes.map((c) => valeurColonne(eq, c.cle)))
  const toutes = [entetes, ...lignes]
  return toutes.map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
}

export function valeurColonne(eq, cle) {
  if (cle === 'os_complet') return [eq.os, eq.os_version].filter(Boolean).join(' ')
  if (cle === 'utilisateur') return eq.utilisateur_nom_libre || ''
  if (cle === 'statut') return STATUT_LABEL_SAFE(eq.statut)
  return eq[cle] ?? ''
}

function STATUT_LABEL_SAFE(v) {
  const labels = {
    en_service: 'En service', en_cours_utilisation: "En cours d'utilisation", en_stock: 'En stock',
    en_maintenance: 'En maintenance', obsolete: 'Obsolète', reforme: 'Réformé', perdu_vole: 'Perdu / Volé',
  }
  return labels[v] || v
}
