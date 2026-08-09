// DSI 360 — Chatbot assistant flottant (Phase 6)
// Bouton flottant disponible sur toutes les pages du portail. Envoie les
// questions à l'Edge Function `chatbot-assistant`, qui répond soit via des
// compteurs en direct (ex. "combien de tickets ouverts ?"), soit via la FAQ,
// soit via un message de repli invitant à contacter le support.
import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

const SUGGESTIONS = [
  'Combien de tickets sont ouverts ?',
  "Quelle est la maturité de mon dernier audit ?",
  'Ai-je des violations de données en retard CDP ?',
  "C'est quoi le seuil d'obsolescence ?",
]

export default function ChatbotWidget() {
  const { profile, tenantId } = useAuth()
  const [ouvert, setOuvert] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [saisie, setSaisie] = useState('')
  const [enCours, setEnCours] = useState(false)
  const finRef = useRef(null)

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, ouvert])

  async function ouvrirEtInitialiser() {
    setOuvert(true)
    if (conversationId) return
    const { data, error } = await supabase
      .from('chatbot_conversations')
      .insert({ tenant_id: tenantId, user_id: profile.id })
      .select()
      .single()
    if (!error) {
      setConversationId(data.id)
      setMessages([
        { role: 'assistant', contenu: `Bonjour ${profile?.prenom || ''} 👋 Je suis l'assistant DSI 360. Posez-moi une question sur vos tickets, votre parc, vos audits ou votre conformité.` },
      ])
    }
  }

  async function envoyer(texte) {
    const question = (texte ?? saisie).trim()
    if (!question || enCours) return
    setSaisie('')
    setEnCours(true)
    setMessages((prev) => [...prev, { role: 'user', contenu: question }])

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question, conversation_id: conversationId, tenant_id: tenantId }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', contenu: data.reponse || "Désolé, je n'ai pas de réponse pour l'instant." }])
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', contenu: "Une erreur est survenue. Réessayez dans un instant." }])
    } finally {
      setEnCours(false)
    }
  }

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => (ouvert ? setOuvert(false) : ouvrirEtInitialiser())}
        className="fixed bottom-4 right-4 md:right-4 z-40 bg-gold-500 text-navy-900 rounded-full w-14 h-14 shadow-xl flex items-center justify-center text-2xl hover:scale-105 transition-transform"
        aria-label="Assistant DSI 360"
      >
        {ouvert ? '✕' : '💬'}
      </button>

      {ouvert && (
        <div className="fixed bottom-20 right-4 z-40 w-[calc(100%-2rem)] max-w-sm h-[480px] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden border border-navy-100">
          <div className="bg-navy-900 text-white px-4 py-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gold-500 text-navy-900 font-bold flex items-center justify-center text-xs">AT</div>
            <div>
              <p className="font-semibold text-sm">Assistant DSI 360</p>
              <p className="text-xs text-navy-300">AL_AMANA_TECH_SECURITE</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-navy-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  m.role === 'user' ? 'bg-navy-900 text-white' : 'bg-white text-navy-900 shadow-card'
                }`}>
                  {m.contenu}
                </div>
              </div>
            ))}
            {enCours && (
              <div className="flex justify-start">
                <div className="bg-white rounded-lg px-3 py-2 text-sm text-gray-400 shadow-card">…</div>
              </div>
            )}
            <div ref={finRef} />
          </div>

          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => envoyer(s)} className="text-xs bg-navy-100 text-navy-800 rounded-full px-2.5 py-1 hover:bg-navy-200">
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); envoyer() }}
            className="border-t p-2 flex gap-2"
          >
            <input
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              placeholder="Posez votre question…"
              className="flex-1 border rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
            <button type="submit" disabled={enCours} className="bg-navy-900 text-white rounded-full w-9 h-9 flex items-center justify-center disabled:opacity-50">
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  )
}
