// DSI 360 — Page de connexion (Phase 1)
import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)

  const from = location.state?.from?.pathname || '/dashboard'

  async function handleSubmit(e) {
    e.preventDefault()
    setErreur('')
    setChargement(true)
    const { error } = await signIn(email, password)
    setChargement(false)
    if (error) {
      setErreur('Identifiants incorrects ou compte inactif. Contactez votre DSI.')
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900">
      <div className="bg-white rounded-lg shadow-card w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="mx-auto h-14 w-14 rounded-full bg-gold-500 flex items-center justify-center font-bold text-navy-900 text-xl">
            AT
          </div>
          <h1 className="mt-3 text-xl font-bold text-navy-900">DSI 360</h1>
          <p className="text-xs text-gray-500">
            AL_AMANA_TECH_SECURITE — Gouvernance IT · Cybersécurité · Data Privacy
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Adresse e-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-500"
              placeholder="prenom.nom@cabinet.sn"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>

          {erreur && <p className="text-sm text-red-600">{erreur}</p>}

          <button
            type="submit"
            disabled={chargement}
            className="w-full bg-navy-900 text-white rounded py-2 font-semibold hover:bg-navy-800 disabled:opacity-60"
          >
            {chargement ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
