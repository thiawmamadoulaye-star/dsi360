// DSI 360 — Point d'entrée de l'application (Phase 6 : enregistrement du Service Worker PWA)
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Enregistrement du Service Worker (vite-plugin-pwa génère ce module virtuel).
// `onNeedRefresh` permet d'avertir l'utilisateur qu'une nouvelle version est
// disponible (utile après chaque déploiement Netlify).
registerSW({
  onNeedRefresh() {
    console.info('DSI 360 : une nouvelle version est disponible. Rechargez la page pour l\'appliquer.')
  },
  onOfflineReady() {
    console.info('DSI 360 : application prête pour un usage hors-ligne.')
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
