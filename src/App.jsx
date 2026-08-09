// DSI 360 — Routeur racine (Phase 1 : socle + ParcIT migré + Administration)
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import PortalLayout from './layouts/PortalLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

// Module ParcIT migré tel quel dans le nouveau socle (Phase 1)
import Equipements from './pages/parcit/Equipements'
import ParametresParcIT from './pages/parcit/Parametres'

// Administration (utilisateurs, logs, corbeille) — DSI / super_admin
import Utilisateurs from './pages/admin/Utilisateurs'
import Logs from './pages/admin/Logs'
import Corbeille from './pages/admin/Corbeille'

// Module Helpdesk ITSM (Phase 2)
import Tickets from './pages/helpdesk/Tickets'
import TicketDetail from './pages/helpdesk/TicketDetail'
import CategoriesServices from './pages/helpdesk/CategoriesServices'

// Module Cybersécurité & Audit SI (Phase 3)
import Missions from './pages/audit-securite/Missions'
import MissionDetail from './pages/audit-securite/MissionDetail'
import RegistreRisques from './pages/audit-securite/RegistreRisques'
import Vulnerabilites from './pages/audit-securite/Vulnerabilites'

// Module Data Privacy / Conformité (Phase 4)
import DPTableauBord from './pages/data-privacy/TableauBord'
import DPTraitements from './pages/data-privacy/Traitements'
import DPViolations from './pages/data-privacy/Violations'
import DPIA from './pages/data-privacy/DPIA'
import DPPlanConformite from './pages/data-privacy/PlanConformite'

// Module Gouvernance IT & PMO (Phase 5)
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

          <Route
            element={
              <ProtectedRoute>
                <PortalLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Module ParcIT (Phase 1) */}
            <Route
              path="/parcit"
              element={
                <ProtectedRoute roles={[ROLES.DSI, ROLES.IT_MANAGER, ROLES.TECHNICIEN, ROLES.RSSI]}>
                  <Equipements />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parcit/parametres"
              element={
                <ProtectedRoute roles={[ROLES.DSI, ROLES.IT_MANAGER]}>
                  <ParametresParcIT />
                </ProtectedRoute>
              }
            />

            {/* Administration (Phase 1) */}
            <Route
              path="/admin/utilisateurs"
              element={
                <ProtectedRoute roles={[ROLES.DSI, ROLES.SUPER_ADMIN]}>
                  <Utilisateurs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/logs"
              element={
                <ProtectedRoute roles={[ROLES.DSI, ROLES.CONTROLEUR_INTERNE, ROLES.SUPER_ADMIN]}>
                  <Logs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/corbeille"
              element={
                <ProtectedRoute roles={[ROLES.DSI, ROLES.IT_MANAGER, ROLES.SUPER_ADMIN]}>
                  <Corbeille />
                </ProtectedRoute>
              }
            />

            {/* Module Helpdesk ITSM (Phase 2) */}
            <Route
              path="/helpdesk"
              element={
                <ProtectedRoute roles={[ROLES.DSI, ROLES.IT_MANAGER, ROLES.TECHNICIEN]}>
                  <Tickets />
                </ProtectedRoute>
              }
            />
            <Route
              path="/helpdesk/categories"
              element={
                <ProtectedRoute roles={[ROLES.DSI, ROLES.IT_MANAGER]}>
                  <CategoriesServices />
                </ProtectedRoute>
              }
            />
            <Route
              path="/helpdesk/:id"
              element={
                <ProtectedRoute roles={[ROLES.DSI, ROLES.IT_MANAGER, ROLES.TECHNICIEN]}>
                  <TicketDetail />
                </ProtectedRoute>
              }
            />

            {/* Module Cybersécurité & Audit SI (Phase 3) */}
            <Route
              path="/audit-securite"
              element={
                <ProtectedRoute roles={[ROLES.DSI, ROLES.RSSI, ROLES.CONTROLEUR_INTERNE]}>
                  <Missions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit-securite/risques"
              element={
                <ProtectedRoute roles={[ROLES.DSI, ROLES.RSSI, ROLES.CONTROLEUR_INTERNE]}>
                  <RegistreRisques />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit-securite/vulnerabilites"
              element={
                <ProtectedRoute roles={[ROLES.DSI, ROLES.RSSI, ROLES.IT_MANAGER, ROLES.CONTROLEUR_INTERNE]}>
                  <Vulnerabilites />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit-securite/:id"
              element={
                <ProtectedRoute roles={[ROLES.DSI, ROLES.RSSI, ROLES.CONTROLEUR_INTERNE]}>
                  <MissionDetail />
                </ProtectedRoute>
              }
            />

            {/* Module Data Privacy / Conformité (Phase 4) */}
            <Route
              path="/data-privacy"
              element={
                <ProtectedRoute roles={[ROLES.DSI, ROLES.DPO, ROLES.CONTROLEUR_INTERNE]}>
                  <DPTableauBord />
                </ProtectedRoute>
              }
            />
            <Route
              path="/data-privacy/traitements"
              element={
                <ProtectedRoute roles={[ROLES.DSI, ROLES.DPO, ROLES.CONTROLEUR_INTERNE]}>
                  <DPTraitements />
                </ProtectedRoute>
              }
            />
            <Route
              path="/data-privacy/violations"
              element={
                <ProtectedRoute roles={[ROLES.DSI, ROLES.DPO, ROLES.CONTROLEUR_INTERNE]}>
                  <DPViolations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/data-privacy/dpia"
              element={
                <ProtectedRoute roles={[ROLES.DSI, ROLES.DPO, ROLES.CONTROLEUR_INTERNE]}>
                  <DPIA />
                </ProtectedRoute>
              }
            />
            <Route
              path="/data-privacy/plan-action"
              element={
                <ProtectedRoute roles={[ROLES.DSI, ROLES.DPO, ROLES.CONTROLEUR_INTERNE]}>
                  <DPPlanConformite />
                </ProtectedRoute>
              }
            />

            {/* Module Gouvernance IT & PMO (Phase 5) */}
            <Route
              path="/gouvernance"
              element={
                <ProtectedRoute roles={[ROLES.DSI, ROLES.SUPER_ADMIN]}>
                  <GouvTableauBord />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gouvernance/projets"
              element={
                <ProtectedRoute roles={[ROLES.DSI, ROLES.SUPER_ADMIN]}>
                  <GouvProjets />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gouvernance/projets/:id"
              element={
                <ProtectedRoute roles={[ROLES.DSI, ROLES.SUPER_ADMIN]}>
                  <GouvProjetDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gouvernance/contrats"
              element={
                <ProtectedRoute roles={[ROLES.DSI, ROLES.SUPER_ADMIN, ROLES.IT_MANAGER]}>
                  <GouvContrats />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gouvernance/comites"
              element={
                <ProtectedRoute roles={[ROLES.DSI, ROLES.SUPER_ADMIN]}>
                  <GouvComites />
                </ProtectedRoute>
              }
            />

            {/* Toutes les phases du plan de développement DSI 360 sont livrées */}
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
