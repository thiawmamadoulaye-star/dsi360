// DSI 360 — Routeur racine
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import PortalLayout from './layouts/PortalLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

import Equipements from './pages/parcit/Equipements'
import ParametresParcIT from './pages/parcit/Parametres'

import Utilisateurs from './pages/admin/Utilisateurs'
import Logs from './pages/admin/Logs'
import Corbeille from './pages/admin/Corbeille'
import AdminLayout from './pages/admin/AdminLayout'
import ParametresTenant from './pages/admin/ParametresTenant'

import Tickets from './pages/helpdesk/Tickets'
import TicketDetail from './pages/helpdesk/TicketDetail'
import CategoriesServices from './pages/helpdesk/CategoriesServices'

import Missions from './pages/audit-securite/Missions'
import MissionDetail from './pages/audit-securite/MissionDetail'
import RegistreRisques from './pages/audit-securite/RegistreRisques'
import Vulnerabilites from './pages/audit-securite/Vulnerabilites'

import DPTableauBord from './pages/data-privacy/TableauBord'
import DPTraitements from './pages/data-privacy/Traitements'
import DPViolations from './pages/data-privacy/Violations'
import DPIA from './pages/data-privacy/DPIA'
import DPPlanConformite from './pages/data-privacy/PlanConformite'

import GouvTableauBord from './pages/gouvernance/TableauBord'
import GouvProjets from './pages/gouvernance/Projets'
import GouvProjetDetail from './pages/gouvernance/ProjetDetail'
import GouvContrats from './pages/gouvernance/Contrats'
import GouvComites from './pages/gouvernance/Comites'

import { ROLES } from './lib/roles'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/acces-refuse" element={<div className="p-8">Accès refusé pour votre rôle.</div>} />

          <Route element={<ProtectedRoute><PortalLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/parcit" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.IT_MANAGER, ROLES.TECHNICIEN, ROLES.RSSI]}><Equipements /></ProtectedRoute>} />
            <Route path="/parcit/parametres" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.IT_MANAGER]}><ParametresParcIT /></ProtectedRoute>} />

            <Route path="/admin" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.SUPER_ADMIN, ROLES.CONTROLEUR_INTERNE, ROLES.IT_MANAGER]}><AdminLayout /></ProtectedRoute>}>
              <Route path="utilisateurs" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.SUPER_ADMIN]}><Utilisateurs /></ProtectedRoute>} />
              <Route path="logs" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.CONTROLEUR_INTERNE, ROLES.SUPER_ADMIN]}><Logs /></ProtectedRoute>} />
              <Route path="corbeille" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.IT_MANAGER, ROLES.SUPER_ADMIN]}><Corbeille /></ProtectedRoute>} />
              <Route path="parametres" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.SUPER_ADMIN]}><ParametresTenant /></ProtectedRoute>} />
            </Route>

            <Route path="/helpdesk" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.IT_MANAGER, ROLES.TECHNICIEN]}><Tickets /></ProtectedRoute>} />
            <Route path="/helpdesk/categories" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.IT_MANAGER]}><CategoriesServices /></ProtectedRoute>} />
            <Route path="/helpdesk/:id" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.IT_MANAGER, ROLES.TECHNICIEN]}><TicketDetail /></ProtectedRoute>} />

            <Route path="/audit-securite" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.RSSI, ROLES.CONTROLEUR_INTERNE]}><Missions /></ProtectedRoute>} />
            <Route path="/audit-securite/risques" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.RSSI, ROLES.CONTROLEUR_INTERNE]}><RegistreRisques /></ProtectedRoute>} />
            <Route path="/audit-securite/vulnerabilites" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.RSSI, ROLES.IT_MANAGER, ROLES.CONTROLEUR_INTERNE]}><Vulnerabilites /></ProtectedRoute>} />
            <Route path="/audit-securite/:id" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.RSSI, ROLES.CONTROLEUR_INTERNE]}><MissionDetail /></ProtectedRoute>} />

            <Route path="/data-privacy" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.DPO, ROLES.CONTROLEUR_INTERNE]}><DPTableauBord /></ProtectedRoute>} />
            <Route path="/data-privacy/traitements" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.DPO, ROLES.CONTROLEUR_INTERNE]}><DPTraitements /></ProtectedRoute>} />
            <Route path="/data-privacy/violations" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.DPO, ROLES.CONTROLEUR_INTERNE]}><DPViolations /></ProtectedRoute>} />
            <Route path="/data-privacy/dpia" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.DPO, ROLES.CONTROLEUR_INTERNE]}><DPIA /></ProtectedRoute>} />
            <Route path="/data-privacy/plan-action" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.DPO, ROLES.CONTROLEUR_INTERNE]}><DPPlanConformite /></ProtectedRoute>} />

            <Route path="/gouvernance" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.SUPER_ADMIN]}><GouvTableauBord /></ProtectedRoute>} />
            <Route path="/gouvernance/projets" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.SUPER_ADMIN]}><GouvProjets /></ProtectedRoute>} />
            <Route path="/gouvernance/projets/:id" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.SUPER_ADMIN]}><GouvProjetDetail /></ProtectedRoute>} />
            <Route path="/gouvernance/contrats" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.SUPER_ADMIN, ROLES.IT_MANAGER]}><GouvContrats /></ProtectedRoute>} />
            <Route path="/gouvernance/comites" element={<ProtectedRoute roles={[ROLES.DSI, ROLES.SUPER_ADMIN]}><GouvComites /></ProtectedRoute>} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
