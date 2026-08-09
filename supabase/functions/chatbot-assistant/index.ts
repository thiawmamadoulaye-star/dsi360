// DSI 360 — Edge Function : moteur de l'assistant chatbot (Phase 6)
// Approche à 3 niveaux (sans dépendance à une API LLM externe obligatoire) :
//   1. Intentions "compteurs en direct" (ex: "combien de tickets ouverts ?")
//      → interroge fn_chatbot_contexte_tenant() et formule une réponse.
//   2. FAQ (table chatbot_faq) → correspondance par mots-clés.
//   3. Repli : message générique invitant à contacter le support/DSI.
//
// Option avancée : si le secret OPENAI_API_KEY est configuré, les questions
// non résolues par les niveaux 1/2 peuvent être transmises à un modèle de
// langage externe pour une réponse plus naturelle (voir bloc optionnel).
//
// Déploiement : supabase functions deploy chatbot-assistant

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') // optionnel

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function normaliser(txt: string) {
  return txt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// --- Niveau 1 : intentions "compteurs en direct" ---
const INTENTIONS = [
  {
    cle: 'tickets_ouverts',
    motsCles: ['ticket', 'incident', 'demande ouverte', 'helpdesk'],
    reponse: (ctx: any) => `Vous avez actuellement **${ctx.tickets_ouverts}** ticket(s) ouvert(s), dont **${ctx.tickets_escalades}** escaladé(s) pour dépassement de SLA.`,
  },
  {
    cle: 'equipements_obsoletes',
    motsCles: ['obsolete', 'parc', 'bios', 'equipement'],
    reponse: (ctx: any) => `**${ctx.equipements_obsoletes}** équipement(s) sont actuellement marqués obsolètes dans votre parc informatique.`,
  },
  {
    cle: 'risques_critiques',
    motsCles: ['risque', 'cyber', 'critique', 'securite'],
    reponse: (ctx: any) => `Il y a **${ctx.risques_critiques}** risque(s) cyber classé(s) Élevé ou Critique actuellement ouverts dans le registre.`,
  },
  {
    cle: 'violations_cdp',
    motsCles: ['violation', 'cdp', 'donnees personnelles', 'fuite'],
    reponse: (ctx: any) => ctx.violations_cdp_en_retard > 0
      ? `⚠️ Attention : **${ctx.violations_cdp_en_retard}** violation(s) ont dépassé le délai de notification CDP de 72h ! **${ctx.violations_ouvertes}** violation(s) au total sont ouvertes.`
      : `Vous avez **${ctx.violations_ouvertes}** violation(s) de données ouverte(s), aucune n'est en retard sur le délai CDP de 72h.`,
  },
  {
    cle: 'projets_retard',
    motsCles: ['projet', 'retard', 'pmo', 'gouvernance'],
    reponse: (ctx: any) => `**${ctx.projets_en_retard}** projet(s) IT sont actuellement en retard sur le portefeuille.`,
  },
  {
    cle: 'contrats_echeance',
    motsCles: ['contrat', 'fournisseur', 'echeance', 'renouvellement'],
    reponse: (ctx: any) => `**${ctx.contrats_a_echeance}** contrat(s) fournisseur arrivent à échéance dans les 60 prochains jours.`,
  },
  {
    cle: 'maturite_audit',
    motsCles: ['maturite', 'audit', 'score'],
    reponse: (ctx: any) => ctx.maturite_audit_moyenne != null
      ? `La maturité moyenne de vos missions d'audit est de **${ctx.maturite_audit_moyenne} / 5**.`
      : `Aucune mission d'audit n'a encore été évaluée pour calculer une maturité moyenne.`,
  },
]

function detecterIntention(question: string) {
  const q = normaliser(question)
  for (const intention of INTENTIONS) {
    if (intention.motsCles.some((mc) => q.includes(normaliser(mc)))) {
      return intention
    }
  }
  return null
}

serve(async (req) => {
  try {
    const { question, conversation_id, tenant_id } = await req.json()

    if (!question || !tenant_id) {
      return json({ reponse: "Je n'ai pas bien compris votre question. Pouvez-vous reformuler ?" })
    }

    let reponse: string | null = null
    let intentionDetectee = 'inconnue'

    // Niveau 1 : intentions "compteurs en direct"
    const intention = detecterIntention(question)
    if (intention) {
      const { data: ctx, error } = await supabaseAdmin.rpc('fn_chatbot_contexte_tenant', { p_tenant_id: tenant_id })
      if (!error && ctx) {
        reponse = intention.reponse(ctx)
        intentionDetectee = intention.cle
      }
    }

    // Niveau 2 : FAQ
    if (!reponse) {
      const { data: faqs } = await supabaseAdmin
        .from('chatbot_faq')
        .select('*')
        .or(`tenant_id.is.null,tenant_id.eq.${tenant_id}`)
        .eq('actif', true)
        .order('ordre')

      const q = normaliser(question)
      const match = (faqs || []).find((f: any) => f.mots_cles.some((mc: string) => q.includes(normaliser(mc))))
      if (match) {
        reponse = match.reponse
        intentionDetectee = match.question_type
      }
    }

    // Niveau 3 optionnel : appel à un LLM externe si configuré (repli avancé)
    if (!reponse && OPENAI_API_KEY) {
      reponse = await appelerLLMExterne(question)
      intentionDetectee = 'llm_externe'
    }

    // Niveau 3 par défaut : message de repli
    if (!reponse) {
      reponse = "Je n'ai pas trouvé de réponse précise à votre question. Pour un sujet spécifique, contactez votre DSI ou consultez le module concerné dans le menu."
    }

    // Journalisation de l'échange (si une conversation est fournie)
    if (conversation_id) {
      await supabaseAdmin.from('chatbot_messages').insert([
        { conversation_id, tenant_id, role: 'user', contenu: question, intention_detectee: intentionDetectee },
        { conversation_id, tenant_id, role: 'assistant', contenu: reponse, intention_detectee: intentionDetectee },
      ])
      await supabaseAdmin.from('chatbot_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversation_id)
    }

    return json({ reponse, intention: intentionDetectee })
  } catch (e) {
    console.error(e)
    return json({ reponse: "Une erreur technique est survenue. Réessayez dans un instant." }, 200)
  }
})

async function appelerLLMExterne(question: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Tu es l\'assistant de la plateforme DSI 360 (gouvernance IT, cybersécurité, data privacy). Réponds brièvement et professionnellement en français.' },
          { role: 'user', content: question },
        ],
        max_tokens: 200,
      }),
    })
    const data = await res.json()
    return data.choices?.[0]?.message?.content || null
  } catch {
    return null
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
