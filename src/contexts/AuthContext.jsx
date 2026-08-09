// DSI 360 — Contexte d'authentification partagé par tous les modules (Phase 1)
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, fetchCurrentProfile } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null) // { id, tenant_id, role, nom, ... , tenants: {...} }
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async () => {
    const p = await fetchCurrentProfile()
    setProfile(p)
    if (p?.id) {
      await supabase
        .from('profiles')
        .update({ derniere_connexion: new Date().toISOString() })
        .eq('id', p.id)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      if (session) await loadProfile()
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session) {
          await loadProfile()
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  const value = {
    session,
    profile,               // profil DSI 360 : rôle, tenant, droits
    role: profile?.role,
    tenantId: profile?.tenant_id,
    tenant: profile?.tenants,
    loading,
    signIn,
    signOut,
    refreshProfile: loadProfile,
    isAuthenticated: !!session,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>')
  return ctx
}
