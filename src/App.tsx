import { useState } from 'react'
import { Shell, type View } from './components/Shell'
import { SessionProvider, useSession } from './data/SessionContext'
import FoundationsPage from './pages/FoundationsPage'
import DashboardPage from './pages/DashboardPage'
import ProjectPage from './pages/ProjectPage'
import IssueDetailPage from './pages/IssueDetailPage'
import ClientPortalPage from './pages/ClientPortalPage'
import TaskDrawerPage from './pages/TaskDrawerPage'
import ProjectsListPage from './pages/ProjectsListPage'
import GanttPage from './pages/GanttPage'
import CalendarPage from './pages/CalendarPage'
import ListPage from './pages/ListPage'
import TimelinePage from './pages/TimelinePage'
import EpicsPage from './pages/EpicsPage'
import ReleasesPage from './pages/ReleasesPage'
import FiltersPage from './pages/FiltersPage'
import IssueNavigatorPage from './pages/IssueNavigatorPage'
import ReportsPage from './pages/ReportsPage'
import AutomationsPage from './pages/AutomationsPage'
import ConfigPage from './pages/ConfigPage'
import { CreateIssueModal } from './components/CreateIssueModal'
import { CatalogProvider } from './data/CatalogContext'
import LoginPage from './pages/LoginPage'
import ClientAccessPage from './pages/ClientAccessPage'
import ClientLoginPage from './pages/ClientLoginPage'
import DashboardHomePage from './pages/DashboardHomePage'
import TeamPage from './pages/TeamPage'
import MyTasksPage from './pages/MyTasksPage'
import RoleDashboard from './pages/RoleDashboard'
import ClientMessagesPage from './pages/ClientMessagesPage'
import TimesheetPage from './pages/TimesheetPage'
import HoursApprovalPage from './pages/HoursApprovalPage'
import BoardsListPage from './pages/BoardsListPage'
import ModulesPortfolioPage from './pages/ModulesPortfolioPage'
import { MOCK_USERS } from './data/session'
import InviteMemberModal from './components/InviteMemberModal'
import { SupabaseProbe } from './components/SupabaseProbe'

const ALL_VIEWS: View[] = [
  'home','foundations','projects-list','gantt','calendar','dashboard','project',
  'list','timeline','epics','releases','filters','navigator',
  'reports','automations','config','team','my-tasks',
  'issue','client','task-drawer',
  'login','role-dashboard','client-access','client-login','client-messages',
  'timesheet','hours-approval','boards-list','modules',
]

export const VIEW_LABELS: Record<View, string> = {
  home:'Início', foundations:'Design System', 'projects-list':'Projetos',
  gantt:'Gantt', calendar:'Calendário', dashboard:'Dashboard', project:'Kanban',
  list:'Lista', timeline:'Timeline', epics:'Épicos', releases:'Releases',
  filters:'Filtros', navigator:'Issue Navigator',
  reports:'Relatórios', automations:'Automações', config:'Configurações',
  team:'Time & Permissões', 'my-tasks':'Minha Fila',
  issue:'Issue Detail', client:'Portal Cliente', 'task-drawer':'Task Drawer',
  login:'Login — Gestão', 'role-dashboard':'Dashboard por Papel',
  'client-access':'Criar Acesso de Cliente', 'client-login':'Login — Portal',
  'client-messages':'Mensagens do Cliente',
  timesheet:'Lançar horas', 'hours-approval':'Aprovar horas',
  'boards-list':'Boards',
  modules:'Módulos',
}

export default function App() {
  return (
    <SessionProvider>
      <AppInner />
    </SessionProvider>
  )
}

function AppInner() {
  const { setActiveUser } = useSession()
  const [view, setView] = useState<View>('home')
  const [clientMustChangePwd, setClientMustChangePwd] = useState(false)

  if (view === 'login') {
    return (
      <LoginPage
        onSuccess={(roleStr) => {
          const roleMap: Record<string, string> = {
            'PMO': 'u_pmo', 'PM': 'u_pm', 'P.O': 'u_po', 'SM': 'u_sm',
            'TechLead': 'u_tl', 'Dev': 'u_dev', 'UX/UI': 'u_ux', 'QA': 'u_qa',
          }
          const matched = MOCK_USERS.find(u => u.user_id === (roleMap[roleStr] ?? 'u_pm'))
          if (matched) setActiveUser(matched.user_id)
          setView('home')
        }}
      />
    )
  }

  if (view === 'client-login') {
    return (
      <ClientLoginPage
        onSuccess={(_permission, mustChangePassword) => {
          setClientMustChangePwd(mustChangePassword)
          setView('client')
        }}
        onBack={() => setView('home')}
      />
    )
  }

  if (view === 'client-access') {
    return (
      <ClientAccessPage
        onBack={() => setView('home')}
      />
    )
  }

  if (view === 'foundations') {
    return (
      <div className="h-screen overflow-hidden flex flex-col" style={{ background:'var(--bg-page)' }}>
        <div className="flex-1 overflow-y-auto"><FoundationsPage /></div>
      </div>
    )
  }

  if (view === 'client') {
    return (
      <div className="fixed inset-0 flex flex-col" style={{ background:'#0e1016' }}>
        <div className="flex-1 overflow-hidden">
          <ClientPortalPage
            mustChangePassword={clientMustChangePwd}
            onPasswordChanged={() => setClientMustChangePwd(false)}
            onLogout={() => setView('client-login')}
          />
        </div>
      </div>
    )
  }

  return (
    <CatalogProvider>
      <ShellWithRole view={view} setView={setView} />
    </CatalogProvider>
  )
}

function ShellWithRole({ view, setView }: { view:View; setView:(v:View)=>void }) {
  const [createOpen, setCreate] = useState(false)
  const [inviteOpen, setInvite] = useState(false)
  const [selectedBoardId, setSelectedBoardId] = useState<string | undefined>()
  const [teamInitialTab, setTeamInitialTab] = useState<'membros'|'convites'|'permissoes'|'dashboards'>('membros')

  return (
    <>
      {createOpen && (
        <CreateIssueModal onClose={()=>setCreate(false)} onCreate={()=>setCreate(false)} />
      )}
      {inviteOpen && (
        <InviteMemberModal onClose={()=>setInvite(false)} />
      )}
      <Shell currentView={view} onViewChange={v => { if (v === 'team') setTeamInitialTab('membros'); setView(v) }} onCreateIssue={()=>setCreate(true)}>
        {view==='home'          && <div className="h-full min-w-0 w-full overflow-y-auto dark-shell"><DashboardHomePage onNav={v => {
          if (v === 'team:convites') { setTeamInitialTab('convites'); setView('team') }
          else if (v === 'team:membros') { setTeamInitialTab('membros'); setView('team') }
          else if (ALL_VIEWS.includes(v as View)) setView(v as View)
        }} onInvite={() => setInvite(true)} /></div>}
        {view==='projects-list' && <div className="h-full min-w-0 w-full overflow-y-auto dark-shell"><ProjectsListPage onNav={v => { if (ALL_VIEWS.includes(v as View)) setView(v as View) }} /></div>}
        {view==='gantt'         && <div className="h-full min-w-0 w-full overflow-hidden"><GanttPage/></div>}
        {view==='calendar'      && <div className="h-full min-w-0 w-full overflow-hidden"><CalendarPage/></div>}
        {view==='list'          && <div className="h-full min-w-0 w-full overflow-hidden dark-shell"><ListPage/></div>}
        {view==='timeline'      && <div className="h-full min-w-0 w-full overflow-hidden dark-shell"><TimelinePage/></div>}
        {view==='epics'         && <div className="h-full min-w-0 w-full overflow-y-auto dark-shell"><EpicsPage/></div>}
        {view==='releases'      && <div className="h-full min-w-0 w-full overflow-y-auto dark-shell"><ReleasesPage/></div>}
        {view==='filters'       && <div className="h-full min-w-0 w-full overflow-hidden dark-shell"><FiltersPage/></div>}
        {view==='navigator'     && <div className="h-full min-w-0 w-full overflow-hidden dark-shell"><IssueNavigatorPage/></div>}
        {view==='reports'       && <div className="h-full min-w-0 w-full overflow-y-auto dark-shell"><ReportsPage/></div>}
        {view==='automations'   && <div className="h-full min-w-0 w-full overflow-hidden dark-shell"><AutomationsPage/></div>}
        {view==='config'        && <div className="h-full min-w-0 w-full overflow-hidden dark-shell"><ConfigPage/></div>}
        {view==='team'          && <div className="h-full min-w-0 w-full overflow-y-auto dark-shell"><TeamPage onInvite={() => setInvite(true)} initialTab={teamInitialTab} /></div>}
        {view==='my-tasks'      && <div className="h-full min-w-0 w-full overflow-y-auto dark-shell"><MyTasksPage onNav={v => { if (ALL_VIEWS.includes(v as View)) setView(v as View) }} /></div>}
        {view==='dashboard'     && <div className="h-full min-w-0 w-full overflow-y-auto dark-shell" style={{ background:'var(--bg-page,#0d1321)' }}><DashboardPage onNav={v => { if (ALL_VIEWS.includes(v as View)) setView(v as View) }} /></div>}
        {view==='project'       && <div className="h-full min-w-0 w-full overflow-hidden dark-shell"><ProjectPage boardId={selectedBoardId} onBackToBoards={selectedBoardId ? () => setView('boards-list') : undefined} /></div>}
        {view==='issue'         && <div className="h-full min-w-0 w-full overflow-hidden dark-shell"><IssueDetailPage/></div>}
        {view==='task-drawer'   && <div className="h-full min-w-0 w-full overflow-hidden dark-shell"><TaskDrawerPage/></div>}
        {view==='role-dashboard'    && <div className="h-full min-w-0 w-full dark-shell"><RoleDashboard onBack={() => setView('home')} /></div>}
        {view==='client-messages'  && <div className="h-full min-w-0 w-full overflow-hidden dark-shell"><ClientMessagesPage /></div>}
        {view==='timesheet'        && <div className="h-full min-w-0 w-full overflow-y-auto dark-shell"><TimesheetPage /></div>}
        {view==='hours-approval'   && <div className="h-full min-w-0 w-full overflow-y-auto dark-shell"><HoursApprovalPage /></div>}
        {view==='boards-list'      && <div className="h-full min-w-0 w-full overflow-y-auto dark-shell"><BoardsListPage onSelectBoard={id => { setSelectedBoardId(id); setView('project') }} /></div>}
        {view==='modules'          && <div className="h-full min-w-0 w-full overflow-y-auto dark-shell"><ModulesPortfolioPage onNav={v => { if (ALL_VIEWS.includes(v as View)) setView(v as View) }} /></div>}
      </Shell>
    </>
  )
}
