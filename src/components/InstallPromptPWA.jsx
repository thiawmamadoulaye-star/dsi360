// DSI 360 — Bannière d'installation PWA Android/iOS (Phase 6)
// Capture l'événement `beforeinstallprompt` (Android/Chrome/Edge) pour
// proposer un bouton natif "Installer l'application". Sur iOS Safari,
// cet événement n'existe pas : on affiche des instructions manuelles.
import React, { useEffect, useState } from 'react'

function estIOS() {
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
}

function dejaInstallee() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export default function InstallPromptPWA() {
  const [promptEvent, setPromptEvent] = useState(null)
  const [visible, setVisible] = useState(false)
  const [instructionsIOS, setInstructionsIOS] = useState(false)

  useEffect(() => {
    if (dejaInstallee()) return

    function handler(e) {
      e.preventDefault()
      setPromptEvent(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS : pas d'événement natif, on propose les instructions après un délai
    if (estIOS()) {
      const t = setTimeout(() => setVisible(true), 3000)
      return () => { clearTimeout(t); window.removeEventListener('beforeinstallprompt', handler) }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function installer() {
    if (estIOS()) {
      setInstructionsIOS(true)
      return
    }
    if (!promptEvent) return
    promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted') {
      localStorage.setItem('dsi360_pwa_installee', '1')
    }
    setVisible(false)
  }

  function fermer() {
    setVisible(false)
    localStorage.setItem('dsi360_pwa_banniere_fermee', Date.now().toString())
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-navy-900 text-white rounded-lg shadow-xl p-4 z-50">
      {!instructionsIOS ? (
        <>
          <p className="font-semibold text-sm mb-1">📲 Installer DSI 360</p>
          <p className="text-xs text-navy-300 mb-3">
            Ajoutez DSI 360 à votre écran d'accueil pour un accès rapide, hors-ligne et en plein écran.
          </p>
          <div className="flex gap-2 justify-end">
            <button onClick={fermer} className="text-xs px-3 py-1.5 text-navy-300">Plus tard</button>
            <button onClick={installer} className="text-xs px-3 py-1.5 bg-gold-500 text-navy-900 font-semibold rounded">
              Installer
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="font-semibold text-sm mb-1">📲 Installer sur iOS</p>
          <p className="text-xs text-navy-300 mb-2">
            Appuyez sur <strong>Partager</strong> (icône carré + flèche) puis sur
            <strong> « Sur l'écran d'accueil »</strong>.
          </p>
          <button onClick={fermer} className="text-xs px-3 py-1.5 bg-gold-500 text-navy-900 font-semibold rounded">
            Compris
          </button>
        </>
      )}
    </div>
  )
}
