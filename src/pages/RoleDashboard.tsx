import { useState } from 'react'
import { T } from '../components/ds/tokens'
import { getActiveUser, type RoleContext } from '../data/session'

interface Props { onBack?: () => void }

// ── Shared primitives ──────────────────────────────────────────────────────

function KpiCard({ label, value, sub, disclaimer, color, trend }: {
  label: string; value: string | number; sub?: string; disclaimer?: string; color?: string; trend?: string
}) {
  return (
    <div style={{
      background: T.bgSurface, border: `1px solid ${T.border}`,
      borderRadius: 10, padding: '16px 18px', minWidth: 0,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ fontSize: 10, color: T.text3, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color ?? T.text1, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.text3, marginTop: 4, fontWeight: 500 }}>{sub}</div>}
      {trend && <div style={{ fontSize: 10, color: trend.startsWith('+') ? T.success : T.crit, marginTop: 6, fontWeight: 600 }}>{trend}</div>}
      {disclaimer && (
        <div
          title={disclaimer}
          style={{
            marginTop: 'auto', paddingTop: 7,
            fontSize: 9, color: T.text3,
            whiteSpace: 'normal', wordBreak: 'break-word',
            borderTop: `1px solid ${T.border}`,
            fontStyle: 'italic', letterSpacing: '0.01em', lineHeight: 1.4,
          }}
        >{disclaimer}</div>
      )}
    </div>
  )
}

function KpiRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: 12,
      width: '100%',
      minWidth: 0,
    }}>
      {children}
    </div>
  )
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {children}
      </div>
      {action}
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: T.bgSurface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, minWidth: 0, overflowX: 'auto', ...style }}>
      {children}
    </div>
  )
}

function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500,
      color, background: bg, border: `1px solid ${color}30`,
    }}>{label}</span>
  )
}

function Bar({ value, color = T.accent }: { value: number; color?: string }) {
  return (
    <div style={{ background: T.border, borderRadius: 4, height: 6, width: '100%' }}>
      <div style={{ background: color, borderRadius: 4, height: 6, width: `${Math.min(value, 100)}%`, transition: 'width 0.3s' }} />
    </div>
  )
}

function Row({ cols, header }: { cols: React.ReactNode[]; header?: boolean }) {
  return (
    <div style={{
      display: 'flex', gap: 8, padding: header ? '6px 0 8px' : '9px 0',
      borderBottom: `1px solid ${T.border}`, alignItems: 'center',
      opacity: header ? 0.6 : 1,
    }}>
      {cols.map((c, i) => (
        <div key={i} style={{ flex: 1, minWidth: 0, overflow: 'hidden', fontSize: header ? 10 : 12, color: header ? T.text3 : T.text2, fontWeight: header ? 700 : 400, textTransform: header ? 'uppercase' : 'none', letterSpacing: header ? '0.04em' : 'normal' }}>
          {c}
        </div>
      ))}
    </div>
  )
}

function Avatar({ name, color }: { name: string; color?: string }) {
  const initials = name.split(' ').map(p => p[0]).slice(0, 2).join('')
  const bg = color ?? '#3b4f72'
  return (
    <div style={{
      width: 26, height: 26, borderRadius: '50%', background: bg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>{initials}</div>
  )
}

function AlertTag({ label }: { label: string }) {
  return (
    <span style={{
      padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
      background: `${T.warn}22`, color: T.warn, border: `1px solid ${T.warn}40`,
    }}>{label}</span>
  )
}

function CritTag({ label }: { label: string }) {
  return (
    <span style={{
      padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
      background: `${T.crit}22`, color: T.crit, border: `1px solid ${T.crit}40`,
    }}>{label}</span>
  )
}

function MiniSparkBars({ bars, color = T.accent }: { bars: number[]; color?: string }) {
  const max = Math.max(...bars, 1)
  return (
    <svg width="100%" height="48" viewBox={`0 0 ${bars.length * 26} 48`} preserveAspectRatio="none">
      {bars.map((v, i) => {
        const h = Math.max((v / max) * 36, 2)
        return <rect key={i} x={i * 26 + 3} y={40 - h} width={20} height={h} rx={2} fill={color} opacity={0.5 + 0.5 * (i / bars.length)} />
      })}
    </svg>
  )
}

function CentralQuestion({ question }: { question: string }) {
  return (
    <div style={{
      background: `${T.accent}12`, border: `1px solid ${T.accent}30`,
      borderRadius: 8, padding: '8px 14px', marginBottom: 20,
      fontSize: 12, color: T.accent, fontWeight: 500, fontStyle: 'italic',
    }}>
      "{question}"
    </div>
  )
}

function ActionBtn({ label, onClick, variant = 'ghost' }: { label: string; onClick?: () => void; variant?: 'ghost' | 'primary' | 'danger' }) {
  const styles: Record<string, React.CSSProperties> = {
    ghost:   { background: 'none', border: `1px solid ${T.border}`,     color: T.text2 },
    primary: { background: T.accent, border: `1px solid ${T.accent}`,   color: '#fff' },
    danger:  { background: 'none', border: `1px solid ${T.crit}40`,     color: T.crit },
  }
  return (
    <button
      onClick={onClick}
      style={{
        ...styles[variant], borderRadius: 5, padding: '3px 10px',
        fontSize: 11, cursor: 'pointer', fontWeight: 500,
      }}
    >{label}</button>
  )
}

// ── 1. ADMIN DASHBOARD ─────────────────────────────────────────────────────

function AdminDashboard() {
  const [tempPwd, setTempPwd] = useState<string | null>(null)
  const [pwdUser, setPwdUser] = useState<string>('')

  const users = [
    { id: 'u1', name: 'Carla Mendes',  email: 'carla@altech.io',  role: 'ProjectManager', status: 'active',   lastLogin: 'Hoje 09:41' },
    { id: 'u2', name: 'Rafael Costa',  email: 'rafael@altech.io', role: 'Dev',            status: 'active',   lastLogin: 'Ontem' },
    { id: 'u3', name: 'Bia Santos',    email: 'bia@altech.io',    role: 'QA',             status: 'blocked',  lastLogin: 'há 3d' },
    { id: 'u4', name: 'Lucas Ferreira',email: 'lucas@altech.io',  role: 'UX',             status: 'inactive', lastLogin: 'há 14d' },
    { id: 'u5', name: 'Ana Lima',      email: 'ana@altech.io',    role: 'ScrumMaster',    status: 'active',   lastLogin: 'Hoje 08:12' },
  ]

  const modules = [
    { name: 'Gestão de Projetos', active: true  },
    { name: 'Gantt & Timeline',   active: true  },
    { name: 'Relatórios',         active: true  },
    { name: 'Automações',         active: false, upsell: true },
    { name: 'BI & Dashboards',    active: false, upsell: true },
    { name: 'Integrações',        active: false, upsell: true },
  ]

  const audit = [
    { ts: 'Hoje 11:02', who: 'Admin',  action: 'Bloqueou usuário Bia Santos — motivo: inatividade prolongada' },
    { ts: 'Hoje 09:30', who: 'Admin',  action: 'Convidou rafael@altech.io como Dev' },
    { ts: 'Ontem 17:44',who: 'Admin',  action: 'Redefiniu senha de Lucas Ferreira (password_must_change=true)' },
    { ts: 'Ontem 14:00',who: 'Admin',  action: 'Ativou módulo Relatórios para tenant Altech Agency' },
  ]

  function genPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
    return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  function handleResetPwd(name: string) {
    setPwdUser(name)
    setTempPwd(genPassword())
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <CentralQuestion question="Minha empresa está corretamente administrada?" />

      <KpiRow>
        <KpiCard label="Usuários da empresa" value={18}  sub="12 ativos"          disclaimer="total de contas registradas no tenant" />
        <KpiCard label="Projetos criados"     value={6}   sub="4 em andamento"    disclaimer="criados neste tenant, incluindo arquivados" />
        <KpiCard label="Boards criados"       value={11}                           disclaimer="boards de Kanban ativos no tenant" />
        <KpiCard label="Módulos ativos"       value={3}   sub="de 6 disponíveis"  disclaimer="módulos habilitados para este tenant" />
        <KpiCard label="Usuários bloqueados"  value={1}   color={T.crit}           disclaimer="contas temporariamente suspensas" />
        <KpiCard label="Convites pendentes"   value={2}   color={T.warn}           disclaimer="convites enviados ainda não aceitos" />
      </KpiRow>

      {/* Gestão de Usuários */}
      <Card>
        <SectionTitle action={<ActionBtn label="+ Convidar membro" variant="primary" />}>
          Gestão de usuários
        </SectionTitle>
        <Row header cols={['Usuário', 'Papel', 'Status', 'Último login', 'Ações']} />
        {users.map(u => (
          <Row key={u.id} cols={[
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar name={u.name} color={u.status === 'blocked' ? '#5a2a2a' : u.status === 'inactive' ? '#3a3a3a' : '#2a3a5a'} />
              <div>
                <div style={{ fontSize: 12, color: T.text1, fontWeight: 500 }}>{u.name}</div>
                <div style={{ fontSize: 10, color: T.text3 }}>{u.email}</div>
              </div>
            </div>,
            <span style={{ fontSize: 11, color: T.text3 }}>{u.role}</span>,
            <Chip
              label={u.status === 'active' ? 'Ativo' : u.status === 'blocked' ? 'Bloqueado' : 'Inativo'}
              color={u.status === 'active' ? T.success : u.status === 'blocked' ? T.crit : T.text3}
              bg={u.status === 'active' ? `${T.success}18` : u.status === 'blocked' ? `${T.crit}18` : `${T.text3}18`}
            />,
            <span style={{ fontSize: 11, color: T.text3 }}>{u.lastLogin}</span>,
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <ActionBtn label="Editar" />
              {u.status === 'active'   && <ActionBtn label="Bloquear" variant="danger" />}
              {u.status === 'blocked'  && <ActionBtn label="Desbloquear" variant="primary" />}
              {u.status === 'inactive' && <ActionBtn label="Desativar" variant="danger" />}
              <ActionBtn label="Redefinir senha" onClick={() => handleResetPwd(u.name)} />
            </div>,
          ]} />
        ))}
      </Card>

      {/* Temp password display */}
      {tempPwd && (
        <div style={{
          background: `${T.warn}15`, border: `1px solid ${T.warn}40`,
          borderRadius: 8, padding: 14,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.warn, marginBottom: 6 }}>
            ⚠ Senha temporária — {pwdUser}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <code style={{ fontSize: 14, fontWeight: 700, color: T.text1, background: T.bgSurface2, padding: '4px 10px', borderRadius: 4, letterSpacing: '0.12em' }}>
              {tempPwd}
            </code>
            <span style={{ fontSize: 11, color: T.text3 }}>password_must_change = true · registrado em auditoria</span>
          </div>
          <div style={{ fontSize: 10, color: T.warn, marginTop: 6 }}>Esta senha é exibida uma única vez. Copie agora e compartilhe com o usuário por canal seguro.</div>
          <button onClick={() => setTempPwd(null)} style={{ marginTop: 8, fontSize: 10, color: T.text3, background: 'none', border: 'none', cursor: 'pointer' }}>× Fechar</button>
        </div>
      )}

      {/* Módulos */}
      <Card>
        <SectionTitle>Módulos do tenant</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
          {modules.map(m => (
            <div key={m.name} style={{
              background: T.bgSurface2, borderRadius: 8, padding: '10px 12px',
              border: `1px solid ${m.active ? T.accent + '30' : T.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 0,
            }}>
              <span style={{ fontSize: 12, color: m.active ? T.text1 : T.text3 }}>{m.name}</span>
              {m.active
                ? <Chip label="Ativo" color={T.success} bg={`${T.success}18`} />
                : <button style={{ fontSize: 10, color: T.accent, background: 'none', border: `1px solid ${T.accent}40`, borderRadius: 4, padding: '2px 6px', cursor: 'pointer' }}>
                    Solicitar ativação
                  </button>
              }
            </div>
          ))}
        </div>
      </Card>

      {/* Auditoria */}
      <Card>
        <SectionTitle>Atividade administrativa recente</SectionTitle>
        {audit.map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: i < audit.length - 1 ? `1px solid ${T.border}` : 'none', fontSize: 12 }}>
            <span style={{ color: T.text3, whiteSpace: 'nowrap', minWidth: 90 }}>{a.ts}</span>
            <span style={{ color: T.text3, minWidth: 44, fontWeight: 600 }}>{a.who}</span>
            <span style={{ color: T.text2 }}>{a.action}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ── 2. PMO DASHBOARD ───────────────────────────────────────────────────────

function PMODashboard() {
  const projects = [
    { name: 'Website Relaunch',         rag: '🟢', ragLabel: 'Saudável',  reason: '',                                      sprint: 'S14', prog: 72, delivery: '94%' },
    { name: 'Infra & Engenharia',       rag: '🟡', ragLabel: 'Em Risco',  reason: 'Design sign-off atrasado 4 dias',       sprint: 'S11', prog: 45, delivery: '71%' },
    { name: 'Pesquisa de Usuário',      rag: '🔴', ragLabel: 'Bloqueado', reason: 'Aguardando credenciais de ambiente',    sprint: 'S7',  prog: 28, delivery: '52%' },
    { name: 'Mobile App Rebrand',       rag: '🟡', ragLabel: 'Em Risco',  reason: 'Dependência externa sem resposta 8d',  sprint: 'S13', prog: 61, delivery: '80%' },
  ]

  const blockers = [
    { id: 'PM-142', desc: 'Integração pagamento bloqueada',       owner: 'Carlos M.',   impact: 'Projeto A',  days: 3 },
    { id: 'PM-115', desc: 'Deploy infra pendente aprovação',      owner: 'Ana Lima',    impact: 'Projeto B',  days: 5 },
    { id: 'PM-099', desc: 'Entrevistas usuário sem resposta',     owner: 'Bia Santos',  impact: 'Pesquisa',   days: 8 },
    { id: 'PM-102', desc: 'Credenciais de ambiente ausentes',     owner: 'Rafael C.',   impact: 'Infra',      days: 2 },
  ]

  const velocity = [18, 22, 19, 25, 21, 23]
  const sprints  = ['S9', 'S10', 'S11', 'S12', 'S13', 'S14']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <CentralQuestion question="Quais projetos precisam de atenção?" />

      <KpiRow>
        <KpiCard label="Projetos ativos"      value={4}     disclaimer="projetos com sprint ativa ou em andamento" />
        <KpiCard label="Em risco / atrasados" value={2}     color={T.warn}    disclaimer="projetos com RAG amarelo ou vermelho" />
        <KpiCard label="Previsibilidade"      value="71%"   sub="Planejado x real"  disclaimer="% do planejado efetivamente entregue" />
        <KpiCard label="Concluído no prazo"   value="68%"   color={T.success} trend="+3% vs sprint anterior" disclaimer="% de entregas dentro do prazo previsto" />
      </KpiRow>

      {/* RAG Health */}
      <Card>
        <SectionTitle>Saúde por RAG — portfólio</SectionTitle>
        <Row header cols={['Projeto', 'Saúde', 'Motivo (obrigatório em ⚠/🔴)', 'Sprint', 'Progresso', 'Entrega']} />
        {projects.map(p => (
          <Row key={p.name} cols={[
            <span style={{ fontWeight: 500, color: T.text1 }}>{p.name}</span>,
            <Chip
              label={p.ragLabel}
              color={p.rag === '🟢' ? T.success : p.rag === '🟡' ? T.warn : T.crit}
              bg={p.rag === '🟢' ? `${T.success}18` : p.rag === '🟡' ? `${T.warn}18` : `${T.crit}18`}
            />,
            p.reason
              ? <span style={{ fontSize: 11, color: T.warn, fontStyle: 'italic' }}>{p.reason}</span>
              : <span style={{ fontSize: 11, color: T.text3 }}>—</span>,
            <span style={{ color: T.text3 }}>{p.sprint}</span>,
            <div><Bar value={p.prog} color={p.prog > 65 ? T.success : p.prog > 40 ? T.warn : T.crit} /><span style={{ fontSize: 10, color: T.text3 }}>{p.prog}%</span></div>,
            <span style={{ color: T.text2 }}>{p.delivery}</span>,
          ]} />
        ))}
      </Card>

      {/* Blockers */}
      <Card>
        <SectionTitle>Bloqueadores críticos</SectionTitle>
        <Row header cols={['ID', 'Descrição', 'Responsável', 'Impacto', 'Dias bloqueado', 'Próxima ação']} />
        {blockers.map(b => (
          <Row key={b.id} cols={[
            <span style={{ color: T.crit, fontWeight: 600 }}>{b.id}</span>,
            <span style={{ color: T.text1 }}>{b.desc}</span>,
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Avatar name={b.owner} /><span>{b.owner}</span>
            </div>,
            <span style={{ color: T.text3 }}>{b.impact}</span>,
            <Chip label={`${b.days}d`} color={b.days >= 5 ? T.crit : T.warn} bg={b.days >= 5 ? `${T.crit}18` : `${T.warn}18`} />,
            <ActionBtn label="Planejar" />,
          ]} />
        ))}
      </Card>

      {/* Ritmo de entrega */}
      <Card>
        <SectionTitle>Ritmo de entrega — velocity por sprint</SectionTitle>
        <MiniSparkBars bars={velocity} color={T.accent} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {sprints.map((s, i) => (
            <span key={s} style={{ fontSize: 10, color: i === sprints.length - 1 ? T.accent : T.text3, fontWeight: i === sprints.length - 1 ? 700 : 400 }}>{s}</span>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: T.text3 }}>
          Velocidade média: <strong style={{ color: T.text1 }}>21,3 pts/sprint</strong> · Maturidade do processo em evolução contínua — sem ranking individual
        </div>
      </Card>
    </div>
  )
}

// ── 3. PROJECT MANAGER DASHBOARD ──────────────────────────────────────────

function ProjectManagerDashboard() {
  const sprint = [
    { key: 'PM-148', title: 'Tela de onboarding',     assignee: 'Carla', status: 'Em Dev',   pts: 3, blocked: false },
    { key: 'PM-145', title: 'Integração Slack',        assignee: 'Rafael', status: 'Bloqueado',pts: 5, blocked: true },
    { key: 'PM-144', title: 'Dark mode toggle',        assignee: 'Lucas', status: 'Em Review', pts: 1, blocked: false },
    { key: 'PM-140', title: 'Notificações push',       assignee: 'Ana',   status: 'A Fazer',   pts: 3, blocked: false },
    { key: 'PM-139', title: 'Filtro de projetos',      assignee: 'Bia',   status: 'Done',      pts: 2, blocked: false },
  ]

  const blockers = [
    { id: 'PM-145', desc: 'Integração Slack travada — aguardando token de API',     risk: 'Alto', days: 4, action: 'Escalar para TechLead' },
    { id: 'PM-102', desc: 'Dependência externa sem resposta',                        risk: 'Alto', days: 3, action: 'Follow-up com parceiro hoje' },
    { id: 'PM-115', desc: 'Deploy de ambiente de homologação pendente',             risk: 'Médio', days: 2, action: 'Verificar com DevOps' },
  ]

  const milestones = [
    { name: 'Beta interno',    date: '01 ago', done: true  },
    { name: 'Beta público',    date: '08 ago', done: false },
    { name: 'GA Release',      date: '22 ago', done: false },
    { name: 'Mobile Alpha',    date: '05 set', done: false },
  ]

  const load = [
    { name: 'Carla M.',  assigned: 4, capacity: 5 },
    { name: 'Rafael C.', assigned: 5, capacity: 5 },
    { name: 'Lucas F.',  assigned: 2, capacity: 5 },
    { name: 'Ana Lima',  assigned: 3, capacity: 4 },
  ]

  const statusColors: Record<string, string> = {
    'Em Dev': T.accent, 'Bloqueado': T.crit, 'Em Review': T.warn, 'A Fazer': T.text3, 'Done': T.success,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <CentralQuestion question="O que preciso destravar neste projeto?" />

      <KpiRow>
        <KpiCard label="Progresso sprint" value="4/16" sub="tasks done" color={T.accent} disclaimer="tasks concluídas ÷ total comprometido na sprint" />
        <KpiCard label="Dias restantes"   value={13}   sub="Sprint 14"                   disclaimer="dias até o fim da sprint corrente" />
        <KpiCard label="Itens bloqueados" value={2}    color={T.crit}                    disclaimer="demandas atualmente bloqueadas neste projeto" />
        <KpiCard label="Risco de escopo"  value="Médio" color={T.warn} sub="3 dependências abertas" disclaimer="variação de escopo vs. o planejado" />
      </KpiRow>

      {/* Sprint board por status */}
      <Card>
        <SectionTitle>Sprint 14 — board por status</SectionTitle>
        <Row header cols={['Key', 'Título', 'Assignee', 'Status', 'Pts', 'Bloqueio']} />
        {sprint.map(i => (
          <Row key={i.key} cols={[
            <span style={{ color: T.accent, fontWeight: 600 }}>{i.key}</span>,
            <span style={{ color: T.text1 }}>{i.title}</span>,
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Avatar name={i.assignee} /><span>{i.assignee}</span></div>,
            <Chip label={i.status} color={statusColors[i.status] ?? T.text3} bg={`${statusColors[i.status] ?? T.text3}18`} />,
            <span style={{ color: T.text3 }}>{i.pts}pt</span>,
            i.blocked ? <CritTag label="Bloqueado" /> : <span style={{ color: T.text3 }}>—</span>,
          ]} />
        ))}
      </Card>

      {/* Bloqueadores & Riscos */}
      <Card>
        <SectionTitle>Bloqueadores & riscos — ação necessária do PM</SectionTitle>
        {blockers.map(b => (
          <div key={b.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
            <span style={{ color: T.crit, fontWeight: 700, minWidth: 60 }}>{b.id}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: T.text1 }}>{b.desc}</div>
              <div style={{ fontSize: 11, color: T.accent, marginTop: 4 }}>→ {b.action}</div>
            </div>
            <Chip label={b.risk} color={b.risk === 'Alto' ? T.crit : T.warn} bg={b.risk === 'Alto' ? `${T.crit}18` : `${T.warn}18`} />
            <span style={{ fontSize: 11, color: T.crit }}>{b.days}d</span>
          </div>
        ))}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Carga do Time */}
        <Card>
          <SectionTitle>Carga do time</SectionTitle>
          {load.map(m => (
            <div key={m.name} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: T.text2 }}>{m.name}</span>
                <span style={{ fontSize: 11, color: m.assigned >= m.capacity ? T.crit : T.text3 }}>{m.assigned}/{m.capacity}</span>
              </div>
              <Bar value={(m.assigned / m.capacity) * 100} color={m.assigned >= m.capacity ? T.crit : T.accent} />
            </div>
          ))}
        </Card>

        {/* Marcos */}
        <Card>
          <SectionTitle>Prazo & marcos</SectionTitle>
          {milestones.map(m => (
            <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 16 }}>{m.done ? '✅' : '⬜'}</span>
              <span style={{ flex: 1, fontSize: 12, color: m.done ? T.text3 : T.text1, textDecoration: m.done ? 'line-through' : 'none' }}>{m.name}</span>
              <span style={{ fontSize: 11, color: T.text3 }}>{m.date}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// ── 4. PRODUCT MANAGER DASHBOARD ──────────────────────────────────────────

function ProductManagerDashboard() {
  const cohorts = [
    { label: 'D1',  ret: 82 },
    { label: 'D7',  ret: 64 },
    { label: 'D14', ret: 51 },
    { label: 'D30', ret: 38 },
  ]

  const features = [
    { name: 'Dashboards v2', adoption: 74, eligible: 120, target: 80 },
    { name: 'Automações',    adoption: 31, eligible: 98,  target: 60 },
    { name: 'Relatórios',    adoption: 89, eligible: 140, target: 75 },
    { name: 'Mobile App',    adoption: 18, eligible: 85,  target: 50 },
  ]

  const funnel = [
    { label: 'Visitantes únicos',  n: 4820 },
    { label: 'Cadastros',          n: 1240 },
    { label: 'Ativação (ação-chave)',n: 680 },
    { label: 'Retidos D7+',        n: 418 },
  ]

  const roadmap = [
    { theme: 'Crescimento',    items: ['Onboarding guiado', 'Referral interno'] },
    { theme: 'Evolução UX',    items: ['Redesign dashboard', 'Acessibilidade A11y'] },
    { theme: 'Sustentação',    items: ['Performance queries', 'Bug funcional crítico'] },
  ]

  const max = funnel[0].n

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <CentralQuestion question="O produto gera valor real?" />

      <KpiRow>
        <KpiCard label="MAU (Ativos mensais)"  value="4.820" sub="usuários únicos · jul/25" trend="+8% MoM"  disclaimer="usuários únicos ativos nos últimos 30 dias" />
        <KpiCard label="Stickiness (DAU/MAU)"  value="31%"   sub="média D7"  trend="+2pp"                   disclaimer="frequência de uso: ativos diários ÷ mensais" />
        <KpiCard label="Churn (usuários)"      value="2,4%"  color={T.warn}  sub="por tenant, sem billing" trend="-0,3pp" disclaimer="taxa de abandono por tenant — sem impacto billing" />
        <KpiCard label="Adoção média features" value="53%"   sub="sobre base elegível" color={T.accent}     disclaimer="% de adoção médio sobre base elegível por feature" />
      </KpiRow>

      {/* Funil de Ativação */}
      <Card>
        <SectionTitle>Funil de conversão & ativação</SectionTitle>
        {funnel.map((f, i) => (
          <div key={f.label} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: T.text2 }}>{f.label}</span>
              <span style={{ fontSize: 12, color: T.text1, fontWeight: 600 }}>{f.n.toLocaleString('pt-BR')}</span>
            </div>
            <Bar value={(f.n / max) * 100} color={i === 0 ? T.accent : i === funnel.length - 1 ? T.success : `${T.accent}cc`} />
          </div>
        ))}
        <div style={{ fontSize: 11, color: T.text3, marginTop: 8 }}>Conversão visitante → ativo D7: <strong style={{ color: T.text1 }}>8,7%</strong></div>
      </Card>

      {/* Adoção por Feature */}
      <Card>
        <SectionTitle>Adoção de features — sobre base elegível</SectionTitle>
        {features.map(f => (
          <div key={f.name} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: T.text2 }}>{f.name}</span>
              <span style={{ fontSize: 11, color: f.adoption >= f.target ? T.success : f.adoption >= f.target * 0.7 ? T.warn : T.crit, fontWeight: 600 }}>
                {f.adoption}% <span style={{ color: T.text3, fontWeight: 400 }}>/ meta {f.target}%</span>
              </span>
            </div>
            <Bar value={f.adoption} color={f.adoption >= f.target ? T.success : f.adoption >= f.target * 0.7 ? T.warn : T.crit} />
          </div>
        ))}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Retenção por coorte */}
        <Card>
          <SectionTitle>Retenção por coorte (D1–D30)</SectionTitle>
          {cohorts.map(c => (
            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: T.text3, minWidth: 28 }}>{c.label}</span>
              <Bar value={c.ret} color={c.ret > 60 ? T.success : c.ret > 40 ? T.warn : T.crit} />
              <span style={{ fontSize: 12, fontWeight: 600, color: T.text1, minWidth: 32 }}>{c.ret}%</span>
            </div>
          ))}
        </Card>

        {/* Roadmap estratégico */}
        <Card>
          <SectionTitle>Alocação estratégica de valor</SectionTitle>
          {roadmap.map(r => (
            <div key={r.theme} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, marginBottom: 6 }}>{r.theme}</div>
              {r.items.map(item => (
                <div key={item} style={{ fontSize: 12, color: T.text2, marginBottom: 4, paddingLeft: 10, borderLeft: `2px solid ${T.accent}40` }}>
                  {item}
                </div>
              ))}
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// ── 5. PRODUCT OWNER DASHBOARD ────────────────────────────────────────────

function ProductOwnerDashboard() {
  const backlog = [
    { key: 'PM-147', title: 'Relatório exportar CSV',    tags: ['Sem Critério de Aceite', 'Refinamento Pendente'], prio: T.warn },
    { key: 'PM-145', title: 'Integração Slack',          tags: ['Dependência Aberta', 'Sem Estimativa'],           prio: T.crit },
    { key: 'PM-140', title: 'Notificações push',         tags: ['Sem Épico', 'Sem Responsável'],                   prio: T.warn },
    { key: 'PM-135', title: 'Dark mode — acessibilidade', tags: ['Evidência Pendente'],                             prio: T.text3 },
  ]

  const ready = [
    { key: 'PM-148', title: 'Tela de onboarding',    pts: 3, assignee: 'Carla M.' },
    { key: 'PM-144', title: 'Dark mode toggle',       pts: 1, assignee: 'Lucas F.' },
    { key: 'PM-139', title: 'Filtro de projetos',     pts: 2, assignee: 'Bia S.' },
  ]

  const team = [
    { name: 'Carla M.',   items: 4, status: 'saudável' },
    { name: 'Rafael C.',  items: 5, status: 'atenção'  },
    { name: 'Lucas F.',   items: 2, status: 'saudável' },
    { name: 'Ana Lima',   items: 0, status: 'crítico'  },
    { name: 'Bia Santos', items: 3, status: 'saudável' },
  ]

  const teamColor = (s: string) => s === 'saudável' ? T.success : s === 'atenção' ? T.warn : T.crit

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <CentralQuestion question="O backlog está claro, priorizado, refinado e pronto?" />

      <KpiRow>
        <KpiCard label="Cobertura Ready"       value="2,3 sprints" sub="pts prontos ÷ velocidade" color={T.success} disclaimer="pontos prontos ÷ velocidade média da sprint" />
        <KpiCard label="Saúde do backlog"      value="68%"         sub="itens saudáveis / avaliáveis" color={T.warn} disclaimer="itens saudáveis ÷ total de itens avaliáveis" />
        <KpiCard label="Progresso funcional"   value="41%"         sub="considera aceite, não só Done" disclaimer="considera critério de aceite, não só status Done" />
        <KpiCard label="Bugs funcionais crit."  value={3}           color={T.crit}                    disclaimer="bugs com impacto direto no aceite do PO" />
      </KpiRow>

      {/* Backlog com alertas */}
      <Card>
        <SectionTitle>Backlog com alertas críticos</SectionTitle>
        <div style={{ fontSize: 11, color: T.text3, marginBottom: 10 }}>
          Itens saudáveis = sem tags críticas + prioridade + vínculo hierárquico + descrição suficiente + critério de aceite + sem dependência aberta
        </div>
        {backlog.map(b => (
          <div key={b.key} style={{ padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 14, color: b.prio }}>●</span>
              <span style={{ color: T.accent, fontWeight: 600 }}>{b.key}</span>
              <span style={{ color: T.text1, flex: 1 }}>{b.title}</span>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', paddingLeft: 24 }}>
              {b.tags.map(t => <AlertTag key={t} label={t} />)}
            </div>
          </div>
        ))}
      </Card>

      {/* Ready para sprint */}
      <Card>
        <SectionTitle>Ready para próxima sprint (sem alertas)</SectionTitle>
        <Row header cols={['Key', 'Título', 'Pts', 'Responsável']} />
        {ready.map(r => (
          <Row key={r.key} cols={[
            <span style={{ color: T.accent, fontWeight: 600 }}>{r.key}</span>,
            <span style={{ color: T.text1 }}>{r.title}</span>,
            <Chip label={`${r.pts} pts`} color={T.success} bg={`${T.success}18`} />,
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Avatar name={r.assignee} /><span>{r.assignee}</span></div>,
          ]} />
        ))}
        <div style={{ marginTop: 10, fontSize: 11, color: T.text3 }}>
          ⚠ Aceite do PO não substitui QA técnico — itens prontos aguardam validação técnica independente.
        </div>
      </Card>

      {/* Time atuando */}
      <Card>
        <SectionTitle>Time atuando no projeto</SectionTitle>
        <KpiRow>
          {team.map(m => (
            <div key={m.name} style={{
              background: T.bgSurface2, borderRadius: 8, padding: '10px 14px',
              border: `1px solid ${teamColor(m.status)}30`, textAlign: 'center', minWidth: 100,
            }}>
              <Avatar name={m.name} color={m.status === 'crítico' ? '#5a2a2a' : m.status === 'atenção' ? '#4a3a1a' : '#1a3a2a'} />
              <div style={{ fontSize: 11, color: T.text2, marginTop: 6 }}>{m.name}</div>
              <div style={{ fontSize: 10, color: T.text3 }}>{m.items} demandas</div>
              <Chip label={m.status} color={teamColor(m.status)} bg={`${teamColor(m.status)}18`} />
              {m.status === 'crítico' && <div style={{ fontSize: 9, color: T.crit, marginTop: 4 }}>Sem responsável</div>}
            </div>
          ))}
        </KpiRow>
      </Card>
    </div>
  )
}

// ── 6. SCRUM MASTER DASHBOARD ─────────────────────────────────────────────

function ScrumMasterDashboard() {
  const impediments = [
    { id: 'PM-142', desc: 'Integração pagamento bloqueada',      owner: 'Carlos M.',  status: 'Aguardando decisão PM', days: 4, tags: ['Aguardando Decisão', 'Risco Sprint Goal'] },
    { id: 'PM-115', desc: 'Deploy infra pendente aprovação',     owner: 'Ana Lima',   status: 'Aguardando TI externo', days: 6, tags: ['Dependência Externa', 'Parado há 6 dias'] },
    { id: 'PM-099', desc: 'Entrevistas usuário sem resposta',    owner: 'Sem dono',   status: 'Sem responsável',       days: 9, tags: ['Sem Responsável', 'Impedimento Aberto'] },
  ]

  const wipItems = [
    { key: 'PM-148', title: 'Tela de onboarding',     column: 'Em Dev',   days: 7, alert: true  },
    { key: 'PM-147', title: 'Exportar CSV',           column: 'Em Review', days: 4, alert: false },
    { key: 'PM-145', title: 'Integração Slack',       column: 'Bloqueado', days: 9, alert: true  },
    { key: 'PM-144', title: 'Dark mode toggle',       column: 'Em Review', days: 2, alert: false },
  ]

  const ceremonies = [
    { name: 'Daily Standup',     date: 'Amanhã 09:00', done: false },
    { name: 'Sprint Review',     date: '08 ago 10:00', done: false },
    { name: 'Retrospectiva',     date: '08 ago 11:30', done: false },
    { name: 'Sprint Planning',   date: '09 ago 09:00', done: false },
    { name: 'Refinamento',       date: 'Hoje 15:00',   done: false },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <CentralQuestion question="O time está fluindo e o que impede a sprint de avançar?" />

      <KpiRow>
        <KpiCard label="Saúde da sprint"      value="68%"  sub="progresso" color={T.warn}   disclaimer="% de conclusão em relação à meta da sprint" />
        <KpiCard label="Impedimentos ativos"  value={3}    color={T.crit}                    disclaimer="impedimentos formais sem resolução registrada" />
        <KpiCard label="Risco sprint goal"    value="Médio" color={T.warn} sub="2 itens em risco" disclaimer="itens que ameaçam atingir o objetivo da sprint" />
        <KpiCard label="WIP atual"            value={7}    sub="limite: 6" color={T.crit}    disclaimer="itens em andamento vs. limite acordado pelo time" />
      </KpiRow>

      {/* Impedimentos por responsável */}
      <Card>
        <SectionTitle>Impedimentos por responsável — foco em remoção de bloqueios</SectionTitle>
        {impediments.map(imp => (
          <div key={imp.id} style={{ padding: '12px 0', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ color: T.crit, fontWeight: 700, minWidth: 64 }}>{imp.id}</span>
              <span style={{ flex: 1, color: T.text1, fontWeight: 500 }}>{imp.desc}</span>
              <Chip label={`${imp.days}d`} color={imp.days >= 5 ? T.crit : T.warn} bg={imp.days >= 5 ? `${T.crit}18` : `${T.warn}18`} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 74, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Avatar name={imp.owner} />
                <span style={{ fontSize: 11, color: T.text3 }}>{imp.owner}</span>
              </div>
              <span style={{ fontSize: 11, color: T.text3 }}>·</span>
              <span style={{ fontSize: 11, color: T.warn }}>{imp.status}</span>
              {imp.tags.map(t => <AlertTag key={t} label={t} />)}
            </div>
          </div>
        ))}
        <div style={{ marginTop: 10, fontSize: 11, color: T.text3, fontStyle: 'italic' }}>
          Foco em fluxo e remoção de bloqueios — visão de time, nunca ranking individual
        </div>
      </Card>

      {/* Aging WIP */}
      <Card>
        <SectionTitle>Itens parados / Aging WIP</SectionTitle>
        <Row header cols={['Key', 'Título', 'Coluna', 'Dias parado', 'Alerta']} />
        {wipItems.map(w => (
          <Row key={w.key} cols={[
            <span style={{ color: T.accent, fontWeight: 600 }}>{w.key}</span>,
            <span style={{ color: T.text1 }}>{w.title}</span>,
            <Chip label={w.column} color={w.column === 'Bloqueado' ? T.crit : w.column === 'Em Review' ? T.warn : T.accent} bg={`${w.column === 'Bloqueado' ? T.crit : w.column === 'Em Review' ? T.warn : T.accent}18`} />,
            <span style={{ color: w.days >= 6 ? T.crit : w.days >= 3 ? T.warn : T.text3 }}>{w.days}d</span>,
            w.alert ? <CritTag label="Parado há +X dias" /> : <span style={{ color: T.text3 }}>—</span>,
          ]} />
        ))}
      </Card>

      {/* Cerimônias */}
      <Card>
        <SectionTitle>Cerimônias & facilitação</SectionTitle>
        {ceremonies.map(c => (
          <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 16 }}>{c.done ? '✅' : '📅'}</span>
            <span style={{ flex: 1, fontSize: 12, color: T.text1 }}>{c.name}</span>
            <span style={{ fontSize: 11, color: T.text3 }}>{c.date}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ── 7. TECH LEAD DASHBOARD ────────────────────────────────────────────────

function TechLeadDashboard() {
  const dora = [
    { label: 'Deployment Frequency',  value: '3,2/dia',  status: 'Elite',   color: T.success },
    { label: 'Change Failure Rate',   value: '4,1%',     status: 'Alto',    color: T.warn   },
    { label: 'MTTR',                  value: '42 min',   status: 'Elite',   color: T.success },
    { label: 'Lead Time for Changes', value: '2,3h',     status: 'Bom',     color: T.accent  },
  ]

  const prs = [
    { key: 'PM-103', title: 'feat: auth SSO integration',         author: 'Rafael C.', status: 'Open',           blocker: null,               days: 2 },
    { key: 'PM-107', title: 'fix: billing edge-case crash',       author: 'Carla M.',  status: 'Request Changes', blocker: 'Conflito de merge', days: 4 },
    { key: 'PM-104', title: 'wip: mobile nav refactor',           author: 'Lucas F.',  status: 'Sem Reviewer',    blocker: 'CI falhando',       days: 3 },
    { key: 'PM-098', title: 'chore: upgrade dependencies',        author: 'Ana Lima',  status: 'Open',           blocker: null,               days: 1 },
  ]

  const techDebt = [
    { area: 'Auth module',        score: 72, tag: 'Médio' },
    { area: 'Billing service',    score: 54, tag: 'Alto'  },
    { area: 'Mobile API layer',   score: 38, tag: 'Crítico' },
    { area: 'Dashboard queries',  score: 81, tag: 'Baixo' },
  ]

  const prStatusColor = (s: string) => s === 'Open' ? T.success : s === 'Request Changes' ? T.warn : s === 'Sem Reviewer' ? T.crit : T.text3

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <CentralQuestion question="O time consegue entregar tecnicamente com qualidade?" />

      {/* DORA */}
      <Card>
        <SectionTitle>DORA Metrics — saúde técnica do time</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {dora.map(d => (
            <div key={d.label} style={{ background: T.bgSurface2, borderRadius: 8, padding: '12px', border: `1px solid ${d.color}30` }}>
              <div style={{ fontSize: 10, color: T.text3, marginBottom: 4, fontWeight: 600 }}>{d.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: d.color }}>{d.value}</div>
              <Chip label={d.status} color={d.color} bg={`${d.color}18`} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: T.text3 }}>Visão do time como unidade — sem comparação individual entre devs</div>
      </Card>

      {/* KPIs */}
      <KpiRow>
        <KpiCard label="Saúde técnica"       value="72/100" color={T.warn} sub="⬇ -5 pts vs sprint ant." disclaimer="score composto de cobertura, débito e estabilidade" />
        <KpiCard label="Bugs críticos/block." value={2}     color={T.crit}                                disclaimer="bugs P0/P1 bloqueando entrega ou em produção" />
        <KpiCard label="Cycle time médio"    value="4,2h"   sub="code → prod"                             disclaimer="tempo médio de commit até deploy em produção" />
        <KpiCard label="Error rate"          value="0,8%"   sub="p99 latency 340ms" color={T.success}     disclaimer="taxa de erro em produção nas últimas 24h" />
      </KpiRow>

      {/* PRs / Gargalos */}
      <Card>
        <SectionTitle>Gargalos de código & PRs</SectionTitle>
        <Row header cols={['PR', 'Título', 'Autor', 'Status', 'Bloqueio', 'Dias']} />
        {prs.map(pr => (
          <Row key={pr.key} cols={[
            <span style={{ color: T.accent, fontWeight: 600 }}>{pr.key}</span>,
            <span style={{ color: T.text1 }}>{pr.title}</span>,
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Avatar name={pr.author} /><span>{pr.author}</span></div>,
            <Chip label={pr.status} color={prStatusColor(pr.status)} bg={`${prStatusColor(pr.status)}18`} />,
            pr.blocker ? <CritTag label={pr.blocker} /> : <span style={{ color: T.text3 }}>—</span>,
            <span style={{ color: pr.days >= 3 ? T.warn : T.text3 }}>{pr.days}d</span>,
          ]} />
        ))}
      </Card>

      {/* Dívida técnica */}
      <Card>
        <SectionTitle>Saúde do código & dívida técnica</SectionTitle>
        {techDebt.map(t => (
          <div key={t.area} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: T.text2 }}>{t.area}</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text1 }}>{t.score}/100</span>
                <Chip label={t.tag} color={t.tag === 'Crítico' ? T.crit : t.tag === 'Alto' ? T.warn : t.tag === 'Médio' ? T.accent : T.success} bg={`${t.tag === 'Crítico' ? T.crit : t.tag === 'Alto' ? T.warn : t.tag === 'Médio' ? T.accent : T.success}18`} />
              </div>
            </div>
            <Bar value={t.score} color={t.score < 50 ? T.crit : t.score < 70 ? T.warn : T.success} />
          </div>
        ))}
      </Card>
    </div>
  )
}

// ── 8. DEV DASHBOARD ──────────────────────────────────────────────────────

function DevDashboard() {
  const queue = [
    { key: 'PM-145', title: 'Integração Slack',          status: 'Bloqueado',    pts: 5, dueIn: -2, priority: 'crítico' },
    { key: 'PM-148', title: 'Tela de onboarding',        status: 'Em Dev',       pts: 3, dueIn: 3,  priority: 'normal'  },
    { key: 'PM-107', title: 'QA devolveu — billing crash',status: 'QA devolveu',  pts: 2, dueIn: 0,  priority: 'urgente' },
    { key: 'PM-103', title: 'Auth SSO integration',      status: 'Em Dev',       pts: 5, dueIn: 5,  priority: 'normal'  },
    { key: 'PM-140', title: 'Notificações push',         status: 'A Fazer',      pts: 3, dueIn: 7,  priority: 'baixo'   },
  ]

  const prs = [
    { key: 'PR-88', title: 'feat: auth SSO integration',   action: 'Aguardando reviewer', days: 2, actReq: false },
    { key: 'PR-91', title: 'fix: billing edge-case',       action: 'Request changes — revisar antes de reagir', days: 3, actReq: true },
    { key: 'PR-86', title: 'chore: update deps',           action: 'CI falhando — checar pipeline', days: 1, actReq: true },
  ]

  const waiting = [
    { desc: 'Token de API Slack — dependência externa',   since: '4 dias', who: 'Parceiro externo' },
    { desc: 'Aprovação de deploy ambiente homolog.',      since: '2 dias', who: 'DevOps' },
  ]

  const statusColor: Record<string, string> = {
    'Bloqueado': T.crit, 'Em Dev': T.accent, 'QA devolveu': T.warn, 'A Fazer': T.text3,
  }

  const dueColor = (d: number) => d < 0 ? T.crit : d <= 1 ? T.warn : T.text3

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <CentralQuestion question="O que preciso resolver primeiro hoje?" />

      <KpiRow>
        <KpiCard label="Meus itens ativos"      value={5}  color={T.accent}                            disclaimer="tarefas atribuídas a mim nesta sprint" />
        <KpiCard label="Atrasados / próx. prazo" value={2}  color={T.crit} sub="2 com prazo hoje/vencido" disclaimer="itens com prazo hoje ou já vencido" />
        <KpiCard label="Meus itens bloqueados"   value={1}  color={T.warn}                              disclaimer="minhas tarefas aguardando desbloqueio externo" />
        <KpiCard label="Meus PRs / code review"  value={3}  sub="1 aguardando ação"                    disclaimer="pull requests abertos nos quais estou envolvido" />
      </KpiRow>

      {/* Minha Fila Ativa */}
      <Card>
        <SectionTitle>Minha fila ativa — ordenada por prioridade</SectionTitle>
        <Row header cols={['Key', 'Título', 'Status', 'Pts', 'Prazo', 'Prioridade']} />
        {queue.map(q => (
          <Row key={q.key} cols={[
            <span style={{ color: T.accent, fontWeight: 600 }}>{q.key}</span>,
            <span style={{ color: T.text1 }}>{q.title}</span>,
            <Chip label={q.status} color={statusColor[q.status] ?? T.text3} bg={`${statusColor[q.status] ?? T.text3}18`} />,
            <span style={{ color: T.text3 }}>{q.pts}pt</span>,
            <span style={{ color: dueColor(q.dueIn), fontWeight: q.dueIn <= 0 ? 700 : 400 }}>
              {q.dueIn < 0 ? `${Math.abs(q.dueIn)}d atrás` : q.dueIn === 0 ? 'Hoje' : `em ${q.dueIn}d`}
            </span>,
            <Chip label={q.priority} color={q.priority === 'crítico' ? T.crit : q.priority === 'urgente' ? T.warn : q.priority === 'normal' ? T.accent : T.text3} bg={`${q.priority === 'crítico' ? T.crit : q.priority === 'urgente' ? T.warn : q.priority === 'normal' ? T.accent : T.text3}18`} />,
          ]} />
        ))}
      </Card>

      {/* PRs */}
      <Card>
        <SectionTitle>Ações necessárias em PR</SectionTitle>
        {prs.map(pr => (
          <div key={pr.key} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: `1px solid ${T.border}`, alignItems: 'flex-start' }}>
            <span style={{ color: T.accent, fontWeight: 600, minWidth: 54 }}>{pr.key}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: T.text1 }}>{pr.title}</div>
              <div style={{ fontSize: 11, color: pr.actReq ? T.warn : T.text3, marginTop: 3 }}>{pr.action}</div>
            </div>
            {pr.actReq && <CritTag label="Ação necessária" />}
            <span style={{ fontSize: 11, color: T.text3 }}>{pr.days}d</span>
          </div>
        ))}
      </Card>

      {/* Aguardando terceiros */}
      {waiting.length > 0 && (
        <Card>
          <SectionTitle>Aguardando terceiros — fora do meu controle</SectionTitle>
          {waiting.map((w, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: i < waiting.length - 1 ? `1px solid ${T.border}` : 'none', fontSize: 12 }}>
              <span style={{ color: T.text2, flex: 1 }}>{w.desc}</span>
              <span style={{ color: T.text3 }}>{w.who}</span>
              <span style={{ color: T.warn }}>{w.since}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

// ── 9. UX DASHBOARD ───────────────────────────────────────────────────────

function UXDashboard() {
  const queue = [
    { key: 'PM-152', title: 'Checkout redesign — mobile',   phase: 'Exploração',   tags: ['Sem Protótipo', 'Sem Validação'] },
    { key: 'PM-150', title: 'Onboarding flow v2',           phase: 'Spec',          tags: ['Handoff Incompleto'] },
    { key: 'PM-148', title: 'Tela de onboarding',           phase: 'Aprovado',      tags: [] },
    { key: 'PM-145', title: 'Notificações push — UX',      phase: 'Exploração',    tags: ['Sem Estados', 'Sem Responsivo'] },
  ]

  const handoffs = [
    { key: 'PM-148', title: 'Onboarding screen',      status: 'Pronto para Dev',  dev: 'Carla M.' },
    { key: 'PM-144', title: 'Dark mode toggle',        status: 'Dev Devolveu',     dev: 'Lucas F.' },
    { key: 'PM-139', title: 'Filtro de projetos',      status: 'Em Dev',           dev: 'Rafael C.' },
  ]

  const dsIssues = [
    { comp: 'Botão primário',    status: 'Ok',         issue: '' },
    { comp: 'Modal de confirm.', status: 'Fora do DS', issue: 'Usando sombra customizada' },
    { comp: 'Formulário login',  status: 'Pendência',  issue: 'Sem estado de erro definido' },
    { comp: 'Card de projeto',   status: 'Ok',         issue: '' },
  ]

  const phaseColor: Record<string, string> = { Exploração: T.text3, Spec: T.accent, Aprovado: T.success }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <CentralQuestion question="A experiência está clara, validada, consistente e pronta para virar entrega?" />

      <KpiRow>
        <KpiCard label="Fluxos em design"             value={4}  color={T.accent}                    disclaimer="fluxos com trabalho de design em progresso" />
        <KpiCard label="Protótipos p/ validação"      value={2}  sub="aguardando feedback"           disclaimer="protótipos aguardando feedback de usuário ou PO" />
        <KpiCard label="Pendências UX críticas"       value={3}  color={T.crit}                      disclaimer="fluxos sem spec, protótipo ou validação completa" />
        <KpiCard label="Handoff pronto para Dev"      value={1}  color={T.success}                   disclaimer="entregas de design prontas para implementação" />
      </KpiRow>

      {/* Fila de design */}
      <Card>
        <SectionTitle>Fila de design ativa</SectionTitle>
        {queue.map(q => (
          <div key={q.key} style={{ padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ color: T.accent, fontWeight: 600, minWidth: 64 }}>{q.key}</span>
              <span style={{ color: T.text1, flex: 1 }}>{q.title}</span>
              <Chip label={q.phase} color={phaseColor[q.phase] ?? T.text3} bg={`${phaseColor[q.phase] ?? T.text3}18`} />
            </div>
            {q.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 4, paddingLeft: 74, flexWrap: 'wrap' }}>
                {q.tags.map(t => <AlertTag key={t} label={t} />)}
              </div>
            )}
          </div>
        ))}
      </Card>

      {/* Handoffs */}
      <Card>
        <SectionTitle>Handoffs para Dev</SectionTitle>
        <Row header cols={['Key', 'Componente / Fluxo', 'Status', 'Dev responsável']} />
        {handoffs.map(h => (
          <Row key={h.key} cols={[
            <span style={{ color: T.accent, fontWeight: 600 }}>{h.key}</span>,
            <span style={{ color: T.text1 }}>{h.title}</span>,
            <Chip
              label={h.status}
              color={h.status === 'Pronto para Dev' ? T.success : h.status === 'Dev Devolveu' ? T.warn : T.accent}
              bg={`${h.status === 'Pronto para Dev' ? T.success : h.status === 'Dev Devolveu' ? T.warn : T.accent}18`}
            />,
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Avatar name={h.dev} /><span>{h.dev}</span></div>,
          ]} />
        ))}
      </Card>

      {/* Design System */}
      <Card>
        <SectionTitle>Design System — consistência visual</SectionTitle>
        {dsIssues.map(d => (
          <div key={d.comp} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
            <span style={{ flex: 1, fontSize: 12, color: T.text1 }}>{d.comp}</span>
            <Chip
              label={d.status}
              color={d.status === 'Ok' ? T.success : d.status === 'Fora do DS' ? T.crit : T.warn}
              bg={`${d.status === 'Ok' ? T.success : d.status === 'Fora do DS' ? T.crit : T.warn}18`}
            />
            {d.issue && <span style={{ fontSize: 11, color: T.warn, fontStyle: 'italic' }}>{d.issue}</span>}
          </div>
        ))}
      </Card>
    </div>
  )
}

// ── 10. QA DASHBOARD ──────────────────────────────────────────────────────

function QADashboard() {
  const testQueue = [
    { key: 'PM-148', title: 'Tela de onboarding',       from: 'Em Review',           priority: 'normal', assignee: 'Bia S.' },
    { key: 'PM-144', title: 'Dark mode toggle',         from: 'Aguardando QA',       priority: 'normal', assignee: 'Bia S.' },
    { key: 'PM-139', title: 'Filtro de projetos',       from: 'Pronto/Ag. Validação',priority: 'normal', assignee: 'Unassigned' },
    { key: 'PM-107', title: 'Billing crash fix',        from: 'Em Homologação',      priority: 'crítico', assignee: 'Bia S.' },
  ]

  const bugs = [
    { key: 'PM-102', title: 'Crash no checkout iOS',       sev: 'Crítico', assignee: 'Carlos M.', evidence: false, days: 3 },
    { key: 'PM-105', title: 'Campo email aceita espaços',  sev: 'Médio',   assignee: 'Ana Lima',   evidence: true,  days: 1 },
    { key: 'PM-098', title: 'Paginação duplica registros', sev: 'Alto',    assignee: 'Rafael C.',  evidence: false, days: 5 },
  ]

  const envs = [
    { name: 'Homologação',  status: 'Online',     db: 'Populado', api: 'v2.3' },
    { name: 'Staging',      status: 'Instável',   db: 'Vazio',    api: 'v2.2' },
    { name: 'Mobile QA',    status: 'Offline',    db: '—',        api: '—' },
  ]

  const coverage = [
    { suite: 'Smoke — Sprint 14',   passed: 42, total: 42 },
    { suite: 'Regressão — Auth',    passed: 25, total: 28 },
    { suite: 'E2E — Checkout',      passed: 0,  total: 14, running: true },
    { suite: 'Acessibilidade',      passed: 18, total: 30 },
  ]

  const sevColor = (s: string) => s === 'Crítico' ? T.crit : s === 'Alto' ? T.warn : T.accent

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <CentralQuestion question="O que preciso testar agora para garantir a entrega?" />

      <KpiRow>
        <KpiCard label="Aguardando teste"       value={4}    color={T.accent} sub="Ready for QA + Em Homolog." disclaimer="itens em fila de QA ou em homologação ativa" />
        <KpiCard label="Bugs críticos/block."   value={2}    color={T.crit}   sub="1 sem evidência"           disclaimer="bugs P0/P1 bloqueando entrega da sprint" />
        <KpiCard label="Taxa de rejeição"       value="18%"  color={T.warn}   sub="itens devolvidos ao Dev"   disclaimer="% de itens devolvidos ao Dev pelo QA" />
        <KpiCard label="Evidências pendentes"   value={2}    color={T.crit}                                    disclaimer="bugs sem evidência de reprodução registrada" />
      </KpiRow>

      {/* Fila de execução */}
      <Card>
        <SectionTitle>Fila de execução de testes</SectionTitle>
        <Row header cols={['Key', 'Título', 'Origem', 'Prioridade', 'Assignee', 'Ações QA']} />
        {testQueue.map(t => (
          <Row key={t.key} cols={[
            <span style={{ color: T.accent, fontWeight: 600 }}>{t.key}</span>,
            <span style={{ color: T.text1 }}>{t.title}</span>,
            <span style={{ color: T.text3, fontSize: 11 }}>{t.from}</span>,
            <Chip label={t.priority} color={t.priority === 'crítico' ? T.crit : T.text3} bg={`${t.priority === 'crítico' ? T.crit : T.text3}18`} />,
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Avatar name={t.assignee} /><span>{t.assignee}</span></div>,
            <div style={{ display: 'flex', gap: 4 }}>
              <ActionBtn label="Aprovar" variant="primary" />
              <ActionBtn label="Rejeitar" variant="danger" />
            </div>,
          ]} />
        ))}
      </Card>

      {/* Fila de reteste de bugs */}
      <Card>
        <SectionTitle>Fila de reteste de bugs</SectionTitle>
        <Row header cols={['Key', 'Bug', 'Sev.', 'Assignee', 'Evidência', 'Dias', 'Ação']} />
        {bugs.map(b => (
          <Row key={b.key} cols={[
            <span style={{ color: T.crit, fontWeight: 700 }}>{b.key}</span>,
            <span style={{ color: T.text1 }}>{b.title}</span>,
            <Chip label={b.sev} color={sevColor(b.sev)} bg={`${sevColor(b.sev)}18`} />,
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Avatar name={b.assignee} /><span>{b.assignee}</span></div>,
            b.evidence
              ? <Chip label="OK" color={T.success} bg={`${T.success}18`} />
              : <CritTag label="Pendente" />,
            <span style={{ color: b.days >= 3 ? T.crit : T.text3 }}>{b.days}d</span>,
            <ActionBtn label={b.evidence ? 'Reabrir' : 'Solicitar evidência'} variant={b.evidence ? 'ghost' : 'danger'} />,
          ]} />
        ))}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Cobertura */}
        <Card>
          <SectionTitle>Cobertura de testes & critérios</SectionTitle>
          {coverage.map(c => (
            <div key={c.suite} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: T.text2 }}>{c.suite}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: c.running ? T.accent : c.passed === c.total ? T.success : T.warn }}>
                  {c.running ? '⏳ …' : `${c.passed}/${c.total}`}
                </span>
              </div>
              {!c.running && <Bar value={(c.passed / c.total) * 100} color={c.passed === c.total ? T.success : c.passed / c.total >= 0.8 ? T.accent : T.warn} />}
            </div>
          ))}
        </Card>

        {/* Ambientes */}
        <Card>
          <SectionTitle>Ambientes & massa de testes</SectionTitle>
          {envs.map(e => (
            <div key={e.name} style={{ marginBottom: 10, padding: '10px', background: T.bgSurface2, borderRadius: 8, border: `1px solid ${e.status === 'Online' ? T.success + '30' : e.status === 'Instável' ? T.warn + '30' : T.crit + '30'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text1 }}>{e.name}</span>
                <Chip label={e.status} color={e.status === 'Online' ? T.success : e.status === 'Instável' ? T.warn : T.crit} bg={`${e.status === 'Online' ? T.success : e.status === 'Instável' ? T.warn : T.crit}18`} />
              </div>
              <div style={{ fontSize: 11, color: T.text3 }}>DB: {e.db} · API: {e.api}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// ── Role → Component map ───────────────────────────────────────────────────

const ROLE_DASHBOARD_MAP: Record<RoleContext, () => React.ReactElement> = {
  Admin:          AdminDashboard,
  PMO:            PMODashboard,
  ProjectManager: ProjectManagerDashboard,
  ProductManager: ProductManagerDashboard,
  ProductOwner:   ProductOwnerDashboard,
  ScrumMaster:    ScrumMasterDashboard,
  TechLead:       TechLeadDashboard,
  Dev:            DevDashboard,
  UX:             UXDashboard,
  QA:             QADashboard,
}

const ROLE_LABEL: Record<RoleContext, string> = {
  Admin:          'Admin Master',
  PMO:            'PMO',
  ProjectManager: 'Project Manager',
  ProductManager: 'Product Manager',
  ProductOwner:   'Product Owner',
  ScrumMaster:    'Scrum Master',
  TechLead:       'Tech Lead',
  Dev:            'Dev',
  UX:             'UX / UI',
  QA:             'QA',
}

const ROLE_COLOR: Record<RoleContext, { color: string; bg: string }> = {
  Admin:          { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  PMO:            { color: '#7d92ff', bg: 'rgba(125,146,255,0.15)' },
  ProjectManager: { color: '#4d82ff', bg: 'rgba(77,130,255,0.15)'  },
  ProductManager: { color: '#35c9ae', bg: 'rgba(53,201,174,0.15)'  },
  ProductOwner:   { color: '#06C18A', bg: 'rgba(6,193,138,0.15)'   },
  ScrumMaster:    { color: '#e6b23c', bg: 'rgba(230,178,60,0.15)'  },
  TechLead:       { color: '#f0805c', bg: 'rgba(240,128,92,0.15)'  },
  Dev:            { color: '#38bdf8', bg: 'rgba(56,189,248,0.15)'  },
  UX:             { color: '#f472b6', bg: 'rgba(244,114,182,0.15)' },
  QA:             { color: '#4ade80', bg: 'rgba(74,222,128,0.15)'  },
}

// ── Root ───────────────────────────────────────────────────────────────────

export default function RoleDashboard({ onBack }: Props) {
  const user        = getActiveUser()
  const role        = user.role_context
  const meta        = ROLE_COLOR[role]
  const DashComp    = ROLE_DASHBOARD_MAP[role]

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ width: '100%', minWidth: 0, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <span style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            color: meta.color, background: meta.bg, border: `1px solid ${meta.color}40`,
          }}>
            {ROLE_LABEL[role]}
          </span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text1 }}>Dashboard por Papel</div>
            <div style={{ fontSize: 12, color: T.text3, marginTop: 2 }}>
              {user.name} · {user.email}
            </div>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                marginLeft: 'auto', background: 'none', border: `1px solid ${T.border}`,
                borderRadius: 6, padding: '5px 12px', fontSize: 12, color: T.text2, cursor: 'pointer',
              }}
            >
              ← Voltar
            </button>
          )}
        </div>

        <DashComp />
      </div>
    </div>
  )
}
