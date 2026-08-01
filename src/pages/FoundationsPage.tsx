import { useState } from 'react'
import { Button } from '../components/ds/Button'
import { Badge } from '../components/ds/Badge'
import { Avatar, AvatarGroup } from '../components/ds/Avatar'
import { InputField, SelectField, TextareaField } from '../components/ds/Input'
import { Card, CardHeader, CardBody, CardFooter } from '../components/ds/Card'
import { Tooltip } from '../components/ds/Tooltip'

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="text-base font-semibold text-[--text-primary] mb-4 pb-2 border-b border-[--border-subtle] tracking-[-0.01em]">
        {title}
      </h2>
      {children}
    </section>
  )
}

// ─── Color swatch ─────────────────────────────────────────────────────────────
function Swatch({ name, hex, tint, tintHex }: { name: string; hex: string; tint?: string; tintHex?: string }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex gap-1">
        <div className="h-10 flex-1 rounded-md border border-[--border-subtle]" style={{ background: hex }} />
        {tint && (
          <div className="h-10 w-10 rounded-md border border-[--border-subtle] flex-shrink-0" style={{ background: tint }} />
        )}
      </div>
      <p className="text-[11px] font-medium text-[--text-primary] truncate">{name}</p>
      <p className="text-[10px] text-[--text-muted] font-mono truncate">{hex}</p>
      {tintHex && <p className="text-[10px] text-[--text-muted] font-mono truncate">{tintHex}</p>}
    </div>
  )
}

// ─── Type specimen row ────────────────────────────────────────────────────────
function TypeRow({ label, sample, spec, style }: { label: string; sample: string; spec: string; style?: React.CSSProperties }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-[--border-subtle] last:border-0">
      <div className="w-28 flex-shrink-0">
        <span className="text-[11px] font-mono text-[--text-muted]">{label}</span>
      </div>
      <div className="flex-1 min-w-0 truncate" style={style}>{sample}</div>
      <div className="w-48 text-right flex-shrink-0">
        <span className="text-[11px] font-mono text-[--text-muted]">{spec}</span>
      </div>
    </div>
  )
}

// ─── Spacing bar ──────────────────────────────────────────────────────────────
function SpacingBar({ px }: { px: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 text-right text-[11px] font-mono text-[--text-muted]">{px}</span>
      <div className="h-4 rounded-sm" style={{ width: px * 2, background: '#EBF0FF', border: '1px solid #99B6FF' }} />
      <span className="text-[11px] text-[--text-muted]">{px}px</span>
    </div>
  )
}

// ─── Forced-state button row ──────────────────────────────────────────────────
const btnVariants = ['primary', 'secondary', 'ghost', 'destructive'] as const
const btnStates = [
  { label: 'Padrão', props: {} },
  { label: 'Hover', props: { className: 'opacity-90 brightness-90' } },
  { label: 'Ativo', props: { className: 'brightness-75' } },
  { label: 'Desabilitado', props: { disabled: true } },
  { label: 'Carregando', props: { loading: true } },
]

// ─── Table demo ───────────────────────────────────────────────────────────────
const tableData = [
  { key: 'PM-142', title: 'Implementar autenticação OAuth2', assignee: 'Ana Lima', priority: 'P0', status: 'blocked' as const, pts: 8 },
  { key: 'PM-143', title: 'Migração do banco de dados PostgreSQL', assignee: 'Lucas Ferreira', priority: 'P1', status: 'in-progress' as const, pts: 13 },
  { key: 'PM-144', title: 'Design da tela de onboarding', assignee: 'Carla Souza', priority: 'P1', status: 'in-review' as const, pts: 5 },
  { key: 'PM-145', title: 'API de relatórios executivos', assignee: 'Rafael Mendes', priority: 'P2', status: 'backlog' as const, pts: 3 },
  { key: 'PM-146', title: 'Testes de integração do gateway de pagamento', assignee: 'Beatriz Costa', priority: 'P0', status: 'done' as const, pts: 8 },
]

type SortDir = 'asc' | 'desc'

function TableDemo() {
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selected, setSelected] = useState<Set<string>>(new Set(['PM-143']))
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [empty, setEmpty] = useState(false)

  function handleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  function toggleRow(key: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const SortCaret = ({ col }: { col: string }) => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="ml-1 flex-shrink-0">
      <path d="M5 3L8 6H2L5 3Z" fill={sortCol === col && sortDir === 'asc' ? 'currentColor' : 'transparent'} stroke="currentColor" strokeWidth="0.5" />
      <path d="M5 7L2 4H8L5 7Z" fill={sortCol === col && sortDir === 'desc' ? 'currentColor' : 'transparent'} stroke="currentColor" strokeWidth="0.5" />
    </svg>
  )

  const thClass = 'px-3 py-2 text-left text-[11px] font-medium text-[--text-muted] uppercase tracking-wide cursor-pointer select-none hover:text-[--text-secondary]'

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-[--text-secondary]">Tarefas da sprint</p>
        <button
          onClick={() => setEmpty(e => !e)}
          className="text-xs text-[--primary] hover:underline"
        >
          {empty ? 'Mostrar dados' : 'Simular estado vazio'}
        </button>
      </div>
      <div className="border border-[--border-subtle] rounded-lg overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[--bg-page] border-b border-[--border-subtle]">
              <th className="px-3 py-2 w-8">
                <input type="checkbox" className="w-3.5 h-3.5 accent-[--primary] cursor-pointer" readOnly />
              </th>
              {['Chave', 'Título', 'Responsável', 'Prioridade', 'Status', 'Pts'].map(col => (
                <th key={col} className={thClass} onClick={() => handleSort(col)}>
                  <span className="flex items-center">{col}<SortCaret col={col} /></span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {empty ? (
              <tr>
                <td colSpan={7} className="py-14 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                      <rect x="4" y="8" width="28" height="22" rx="2" stroke="#CDD6E3" strokeWidth="1.5" />
                      <path d="M4 14h28" stroke="#CDD6E3" strokeWidth="1.5" />
                      <path d="M12 20h12M12 24h8" stroke="#E6EBF2" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <p className="text-sm text-[--text-muted]">Nenhuma tarefa encontrada</p>
                    <p className="text-xs text-[--text-muted]">Tente remover algum filtro ativo</p>
                  </div>
                </td>
              </tr>
            ) : tableData.map(row => {
              const isSelected = selected.has(row.key)
              const isHovered = hoveredRow === row.key
              return (
                <tr
                  key={row.key}
                  className="border-b border-[--border-subtle] last:border-0 transition-colors duration-100 cursor-pointer"
                  style={{ background: isSelected ? '#EBF0FF' : isHovered ? '#F7F9FC' : '#FFFFFF' }}
                  onMouseEnter={() => setHoveredRow(row.key)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(row.key)}
                      className="w-3.5 h-3.5 accent-[--primary] cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[11px] text-[--text-muted]">{row.key}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[--text-primary] max-w-[200px] truncate">{row.title}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Avatar name={row.assignee} size="xs" />
                      <span className="text-[--text-secondary] text-xs truncate">{row.assignee}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className="inline-flex items-center justify-center w-6 h-5 rounded text-[10px] font-bold"
                      style={{
                        background: row.priority === 'P0' ? '#FDEAED' : row.priority === 'P1' ? '#FEF4E0' : '#F0F2F5',
                        color: row.priority === 'P0' ? '#F0455A' : row.priority === 'P1' ? '#D4881A' : '#7B8698',
                      }}
                    >
                      {row.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge status={row.status} size="sm" />
                  </td>
                  <td className="px-3 py-2.5 text-center text-[11px] font-medium text-[--text-muted]">{row.pts}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-3 py-2 border-t border-[--border-subtle] bg-[--bg-page]">
          <span className="text-xs text-[--text-muted]">Exibindo 1–5 de 24 tarefas</span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-2.5 py-1 text-xs border border-[--border-default] rounded text-[--text-secondary] hover:bg-[--bg-page] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>
            <span className="px-2 py-1 text-xs text-[--text-secondary]">Pág. {page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              className="px-2.5 py-1 text-xs border border-[--border-default] rounded text-[--text-secondary] hover:bg-[--bg-page] transition-colors"
            >
              Próxima →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal preview ────────────────────────────────────────────────────────────
function ModalPreview() {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>Abrir modal</Button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center fade-rise"
          style={{ background: 'rgba(11,17,32,0.45)' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-[--bg-surface] rounded-xl shadow-2xl border border-[--border-subtle] w-[440px] max-w-[90vw]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[--border-subtle]">
              <h3 className="font-semibold text-[--text-primary]">Confirmar ação</h3>
              <button onClick={() => setOpen(false)} className="text-[--text-muted] hover:text-[--text-primary] p-1 rounded hover:bg-[--bg-page]">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-[--text-secondary] leading-relaxed">
                Você está prestes a arquivar o projeto <strong className="text-[--text-primary]">Payments API v3</strong>. Esta ação pode ser desfeita nas próximas 30 dias.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[--border-subtle]">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button variant="destructive" size="sm" onClick={() => setOpen(false)}>Arquivar projeto</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Drawer preview ───────────────────────────────────────────────────────────
function DrawerPreview() {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>Abrir drawer</Button>
      {open && (
        <div className="fixed inset-0 z-50 flex" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="flex-1" style={{ background: 'rgba(11,17,32,0.3)' }} onClick={() => setOpen(false)} />
          <div className="w-[380px] h-full bg-[--bg-surface] border-l border-[--border-subtle] shadow-2xl flex flex-col fade-rise">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[--border-subtle]">
              <h3 className="font-semibold text-[--text-primary] text-sm">Detalhe da tarefa</h3>
              <button onClick={() => setOpen(false)} className="text-[--text-muted] hover:text-[--text-primary] p-1 rounded hover:bg-[--bg-page]">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="flex-1 px-4 py-4 overflow-y-auto">
              <p className="text-sm text-[--text-secondary]">Conteúdo do drawer lateral. Rolável, com detalhes da tarefa, comentários e histórico.</p>
            </div>
            <div className="px-4 py-3 border-t border-[--border-subtle] flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button size="sm">Salvar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Skeleton loading ─────────────────────────────────────────────────────────
function SkeletonBlock() {
  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-center">
        <div className="skeleton w-8 h-8 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <div className="skeleton h-3 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
        </div>
      </div>
      {[100, 80, 90].map(w => (
        <div key={w} className={`skeleton h-3 rounded`} style={{ width: `${w}%` }} />
      ))}
    </div>
  )
}

// ─── Nav items ────────────────────────────────────────────────────────────────
const navItems = [
  { id: 'colors', label: 'Tokens de cor' },
  { id: 'type', label: 'Tipografia & espaçamento' },
  { id: 'buttons', label: 'Botões' },
  { id: 'inputs', label: 'Campos de entrada' },
  { id: 'badges', label: 'Badges & status' },
  { id: 'avatars', label: 'Avatares' },
  { id: 'containers', label: 'Contêineres' },
  { id: 'table', label: 'Tabela' },
  { id: 'skeletons', label: 'Skeleton / loading' },
]

// ─── Main page ────────────────────────────────────────────────────────────────
export default function FoundationsPage() {
  const [activeSection, setActiveSection] = useState('colors')

  function scrollTo(id: string) {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex min-h-full" style={{ background: 'var(--bg-page)' }}>
      {/* Left nav */}
      <nav className="hidden lg:flex flex-col w-52 flex-shrink-0 sticky top-0 h-screen overflow-y-auto py-6 px-3 border-r border-[--border-subtle] bg-[--bg-surface]">
        <p className="text-[10px] font-semibold text-[--text-muted] uppercase tracking-wider px-2 mb-3">Seções</p>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => scrollTo(item.id)}
            className="text-left px-2 py-1.5 rounded text-xs transition-all duration-150 relative"
            style={activeSection === item.id ? {
              background: '#EBF0FF',
              color: 'var(--primary)',
              fontWeight: 500,
            } : { color: 'var(--text-secondary)' }}
          >
            {activeSection === item.id && (
              <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-[--primary]" />
            )}
            {item.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-8 space-y-12">
        {/* Page header */}
        <div className="pb-4 border-b border-[--border-default]">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-[--inprogress-tint] text-[--primary] border border-[#99B6FF] rounded uppercase tracking-wider">
              Section 1
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[--text-primary] tracking-tight">Design system — Fundamentos</h1>
          <p className="mt-1 text-sm text-[--text-secondary]">Tokens de design, escala tipográfica e biblioteca de componentes atômicos para a plataforma de gestão de projetos.</p>
        </div>

        {/* 1. Color tokens */}
        <Section id="colors" title="1 · Tokens de cor">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-medium text-[--text-muted] uppercase tracking-wide mb-3">Neutros</p>
              <div className="grid grid-cols-4 gap-3">
                <Swatch name="bg/page" hex="#F7F9FC" />
                <Swatch name="bg/surface" hex="#FFFFFF" />
                <Swatch name="border/subtle" hex="#E6EBF2" />
                <Swatch name="border/default" hex="#CDD6E3" />
                <Swatch name="text/primary" hex="#0B1120" />
                <Swatch name="text/secondary" hex="#4B5769" />
                <Swatch name="text/muted" hex="#7B8698" />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-[--text-muted] uppercase tracking-wide mb-3">Marca / Ação</p>
              <div className="grid grid-cols-4 gap-3">
                <Swatch name="primary" hex="#2F6BFF" />
                <Swatch name="primary-hover" hex="#2557D6" />
                <Swatch name="primary-active" hex="#1E48B4" />
                <Swatch name="emerald / accent" hex="#06C18A" />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-[--text-muted] uppercase tracking-wide mb-3">Status de saúde</p>
              <div className="grid grid-cols-3 gap-3">
                <Swatch name="Healthy / Done" hex="#06C18A" tint="#E6FAF4" tintHex="#E6FAF4" />
                <Swatch name="Warning / At Risk" hex="#F5A524" tint="#FEF4E0" tintHex="#FEF4E0" />
                <Swatch name="Blocked / Critical" hex="#F0455A" tint="#FDEAED" tintHex="#FDEAED" />
                <Swatch name="In Progress / Info" hex="#2F6BFF" tint="#EBF0FF" tintHex="#EBF0FF" />
                <Swatch name="Backlog / Draft" hex="#7B8698" tint="#F0F2F5" tintHex="#F0F2F5" />
              </div>
            </div>
          </div>
        </Section>

        {/* 2. Typography & spacing */}
        <Section id="type" title="2 · Tipografia & espaçamento">
          <div className="space-y-6">
            <Card>
              <CardBody className="p-0">
                <TypeRow label="H1" sample="Entrega de software com precisão" spec="32px / 700 / −0.03em" style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2 }} />
                <TypeRow label="H2" sample="Visão geral do projeto" spec="24px / 700 / −0.03em" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.25 }} />
                <TypeRow label="H3" sample="Sprint 14 — Em andamento" spec="19px / 600 / −0.02em" style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.3 }} />
                <TypeRow label="H4" sample="Impedimentos ativos" spec="15px / 600 / −0.01em" style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.4 }} />
                <TypeRow label="Body regular" sample="Este item está aguardando aprovação da equipe de infraestrutura antes de seguir para a próxima fase." spec="14px / 400 / 1.6 leading" style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.6 }} />
                <TypeRow label="Body medium" sample="Responsável: Ana Lima · Prazo: 28 jul" spec="14px / 500 / 1.6 leading" style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6 }} />
                <TypeRow label="Caption" sample="Atualizado há 3 horas · Sprint 14" spec="12px / 400 / normal" style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }} />
                <TypeRow label="Code / Tag" sample="PM-142  feat/oauth2-integration  v2.4.1" spec="11px mono / 400" style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)', letterSpacing: '0.01em' }} />
              </CardBody>
            </Card>
            <div>
              <p className="text-xs font-medium text-[--text-muted] uppercase tracking-wide mb-3">Escala de espaçamento (base 8px)</p>
              <div className="flex flex-col gap-2">
                {[8, 16, 24, 32, 48].map(px => <SpacingBar key={px} px={px} />)}
              </div>
            </div>
          </div>
        </Section>

        {/* 3. Buttons */}
        <Section id="buttons" title="3 · Botões">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="pb-3 text-left text-xs text-[--text-muted] font-medium w-28">Estado</th>
                  {btnVariants.map(v => (
                    <th key={v} className="pb-3 text-left text-xs text-[--text-muted] font-medium capitalize">{v === 'primary' ? 'Primário' : v === 'secondary' ? 'Secundário' : v === 'ghost' ? 'Ghost' : 'Destrutivo'}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {btnStates.map(state => (
                  <tr key={state.label} className="border-t border-[--border-subtle]">
                    <td className="py-3 text-xs text-[--text-muted]">{state.label}</td>
                    {btnVariants.map(v => (
                      <td key={v} className="py-3">
                        <Button
                          variant={v}
                          size="md"
                          loading={'loading' in state.props ? true : undefined}
                          disabled={'disabled' in state.props ? true : undefined}
                        >
                          {v === 'primary' ? 'Salvar' : v === 'secondary' ? 'Cancelar' : v === 'ghost' ? 'Mais opções' : 'Excluir'}
                        </Button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* 4. Inputs */}
        <Section id="inputs" title="4 · Campos de entrada">
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Campo padrão"
              placeholder="Digite o nome do projeto..."
              helper="Até 80 caracteres"
            />
            <InputField
              label="Com ícone"
              placeholder="Buscar tarefas..."
              leadingIcon={
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M10 10L8.5 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              }
            />
            <InputField
              label="Estado de erro"
              defaultValue="email-invalido"
              error="Formato de e-mail inválido"
            />
            <SelectField
              label="Prioridade"
              options={[
                { value: 'p0', label: 'P0 — Crítico' },
                { value: 'p1', label: 'P1 — Alto' },
                { value: 'p2', label: 'P2 — Médio' },
                { value: 'p3', label: 'P3 — Baixo' },
              ]}
            />
            <TextareaField
              label="Descrição"
              placeholder="Descreva a tarefa em detalhes..."
              helper="Suporta formatação rich-text"
              className="col-span-2"
            />
          </div>
        </Section>

        {/* 5. Badges */}
        <Section id="badges" title="5 · Badges & pills de status">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(['healthy', 'done', 'at-risk', 'in-review', 'blocked', 'in-progress', 'backlog', 'draft'] as const).map(s => (
                <Badge key={s} status={s} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[--border-subtle]">
              <p className="w-full text-xs text-[--text-muted] mb-1">Tamanho pequeno (sm)</p>
              {(['healthy', 'done', 'at-risk', 'in-review', 'blocked', 'in-progress', 'backlog', 'draft'] as const).map(s => (
                <Badge key={s} status={s} size="sm" />
              ))}
            </div>
          </div>
        </Section>

        {/* 6. Avatars */}
        <Section id="avatars" title="6 · Avatares">
          <div className="space-y-5">
            <div>
              <p className="text-xs text-[--text-muted] mb-3">Individual — tamanhos xs / sm / md / lg</p>
              <div className="flex items-end gap-4">
                <Avatar name="Ana Lima" size="xs" />
                <Avatar name="Lucas Ferreira" size="sm" />
                <Avatar name="Carla Souza" size="md" />
                <Avatar name="Rafael Mendes" size="lg" />
              </div>
            </div>
            <div>
              <p className="text-xs text-[--text-muted] mb-3">Indicador de presença — online / ocupado / ausente</p>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                  <Avatar name="Beatriz Costa" size="md" presence="online" />
                  <span className="text-xs text-[--text-secondary]">Online</span>
                </div>
                <div className="flex items-center gap-2">
                  <Avatar name="Felipe Duarte" size="md" presence="busy" />
                  <span className="text-xs text-[--text-secondary]">Ocupado</span>
                </div>
                <div className="flex items-center gap-2">
                  <Avatar name="Juliana Neves" size="md" presence="away" />
                  <span className="text-xs text-[--text-secondary]">Ausente</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-[--text-muted] mb-3">Grupo empilhado com contador</p>
              <AvatarGroup names={['Ana Lima', 'Lucas Ferreira', 'Carla Souza']} extra={4} />
            </div>
          </div>
        </Section>

        {/* 7. Containers */}
        <Section id="containers" title="7 · Contêineres">
          <div className="grid grid-cols-2 gap-4">
            {/* Card */}
            <div>
              <p className="text-xs text-[--text-muted] mb-2">Card padrão</p>
              <Card>
                <CardHeader>
                  <span className="font-medium text-sm text-[--text-primary]">Payments API v3</span>
                  <Button variant="ghost" size="sm">···</Button>
                </CardHeader>
                <CardBody>
                  <p className="text-sm text-[--text-secondary] leading-relaxed">Integração com gateway de pagamento externo, suporte a múltiplas moedas e fallback automático.</p>
                  <div className="mt-3 flex gap-2">
                    <Badge status="in-progress" />
                    <Badge status="at-risk" />
                  </div>
                </CardBody>
                <CardFooter>
                  <Button variant="ghost" size="sm">Cancelar</Button>
                  <Button size="sm">Confirmar</Button>
                </CardFooter>
              </Card>
            </div>

            {/* Card with accent */}
            <div>
              <p className="text-xs text-[--text-muted] mb-2">Card com borda de acento (bloqueado)</p>
              <Card accentColor="#F0455A">
                <CardHeader>
                  <span className="font-medium text-sm text-[--text-primary]">Migração do banco</span>
                  <Badge status="blocked" size="sm" />
                </CardHeader>
                <CardBody>
                  <p className="text-sm text-[--text-secondary]">Aguardando credenciais de acesso ao ambiente de produção para prosseguir.</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Avatar name="Rafael Mendes" size="sm" />
                    <span className="text-xs text-[--text-muted]">Rafael Mendes · 3 dias bloqueado</span>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Tooltip */}
            <div>
              <p className="text-xs text-[--text-muted] mb-2">Tooltip</p>
              <div className="flex items-center gap-3">
                <Tooltip label="Editar tarefa (E)">
                  <Button variant="secondary" size="sm">Editar</Button>
                </Tooltip>
                <Tooltip label="Arquivar projeto" side="right">
                  <Button variant="ghost" size="sm">Arquivar</Button>
                </Tooltip>
                <Tooltip label="Status: Em andamento" side="bottom">
                  <Badge status="in-progress" />
                </Tooltip>
              </div>
            </div>

            {/* Modal + Drawer triggers */}
            <div>
              <p className="text-xs text-[--text-muted] mb-2">Modal & Drawer</p>
              <div className="flex items-center gap-3">
                <ModalPreview />
                <DrawerPreview />
              </div>
            </div>
          </div>
        </Section>

        {/* 8. Table */}
        <Section id="table" title="8 · Tabela">
          <TableDemo />
        </Section>

        {/* 9. Skeletons */}
        <Section id="skeletons" title="9 · Skeleton loading">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="skeleton h-4 w-32 rounded" />
                <div className="skeleton h-6 w-6 rounded" />
              </CardHeader>
              <CardBody>
                <SkeletonBlock />
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <SkeletonBlock />
              </CardBody>
            </Card>
          </div>
          <p className="mt-3 text-xs text-[--text-muted]">Pulse animation 1.4s ease-in-out · Cor: <code className="font-mono">--border-subtle</code></p>
        </Section>
      </main>
    </div>
  )
}
