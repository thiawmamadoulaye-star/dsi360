// DSI 360 — Utilitaires génériques fichiers (CSV/JSON) réutilisés par tous les modules
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

export function normaliserEntete(txt) {
  return (txt || '')
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
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

export function tableauVersCSV(entetes, lignes) {
  const toutes = [entetes, ...lignes]
  return toutes.map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
}
