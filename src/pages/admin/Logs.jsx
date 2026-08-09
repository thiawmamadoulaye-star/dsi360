// DSI 360 — Administration : Journal des accès et des actions (Phase 1)
// Visible par : DSI, Contrôleur interne, Super Admin (voir RLS logs_audit)
import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

export default function Logs() {
  const { tenantId } = useAuth()
  const [logs, setLogs] = useState([])

  useEffect(() => {
    if (!tenantId) return
    async function load() {
      const { data } = await supabase
        .from('logs_audit')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(200)
      setLogs(data || [])
    }
    load()
  }, [tenantId])

  return (
    <div>
      <h1 className="text-xl font-bold text-navy-900 mb-4">Journal d'audit</h1>
      <div className="bg-white rounded-lg shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-900">
            <tr>
              <th className="text-left px-3 py-2">Date</th>
              <th className="text-left px-3 py-2">Action</th>
              <th className="text-left px-3 py-2">Table</th>
              <th className="text-left px-3 py-2">Utilisateur</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-3 py-2">{new Date(l.created_at).toLocaleString('fr-FR')}</td>
                <td className="px-3 py-2">{l.action}</td>
                <td className="px-3 py-2">{l.table_cible}</td>
                <td className="px-3 py-2">{l.user_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
