import { useCallback, useEffect, useMemo, useState } from 'react'
import { Drawer } from '@/components/ds/Drawer'
import { T } from '@/components/ds/tokens'
import { useSession } from '@/data/SessionContext'
import {
  listProjectAttachments, listProjectBoards, deleteAttachment,
  getDownloadUrl, canDeleteAttachments, bytesToHuman,
  type ProjectAttachmentRow, type ProjectBoardOption,
} from '@/data/db/attachments'

interface Props {
  open: boolean
  onClose: () => void
  tenantId: string
  projectId: string
  projectKey: string
  projectName: string
  /** Called after a successful delete so the parent can refresh usage numbers. */
  onChanged?: () => void
  onToast?: (msg: string) => void
}

export function ProjectFilesDrawer({
  open, onClose, tenantId, projectId, projectKey, projectName, onChanged, onToast,
}: Props) {
  const { activeUser } = useSession()
  const canDelete = canDeleteAttachments(activeUser.role_context)

  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [rows, setRows]       = useState<ProjectAttachmentRow[]>([])
  const [boards, setBoards]   = useState<ProjectBoardOption[]>([])
  const [boardId, setBoardId] = useState<string>('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [list, bs] = await Promise.all([
        listProjectAttachments(tenantId, projectId, boardId || undefined),
        listProjectBoards(tenantId, projectId),
      ])
      setRows(list); setBoards(bs); setSelected(new Set())
    } catch {
      setError('Não foi possível carregar os arquivos do projeto.')
    } finally {
      setLoading(false)
    }
  }, [tenantId, projectId, boardId])

  useEffect(() => { if (open) void load() }, [open, load])

  const totalBytes = useMemo(() => rows.reduce((a, r) => a + (r.size_bytes ?? 0), 0), [rows])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function download(row: ProjectAttachmentRow) {
    if (!row.storage_path) { onToast?.('Arquivo indisponível'); return }
    const url = await getDownloadUrl(row.storage_path)
    if (!url) { onToast?.('Não foi possível gerar o link de download'); return }
    window.open(url, '_blank', 'noopener')
  }

  async function removeSelected() {
    setBusy(true)
    const targets = rows.filter(r => selected.has(r.id))
    let failed = 0
    for (const row of targets) {
      const res = await deleteAttachment({
        attachment: row, tenantId,
        actorId: activeUser.user_id ?? null,
        actorName: activeUser.name,
        projectName,
      })
      if (!res.ok) failed++
    }
    setBusy(false); setConfirming(false)
    onToast?.(failed
      ? `${targets.length - failed} excluído(s), ${failed} com erro`
      : `${targets.length} arquivo(s) excluído(s)`)
    await load()
    onChanged?.()
  }

  const th: React.CSSProperties = { padding: '8px 12px', fontWeight: 600, borderBottom: `1px solid ${T.border}`, textAlign: 'left' }
  const td: React.CSSProperties = { padding: '9px 12px', borderBottom: `1px solid ${T.border}`, color: T.text2, verticalAlign: 'top' }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Arquivos do projeto · ${projectKey}`}
      width="lg"
      footer={
        canDelete ? (
          <>
            <span style={{ marginRight: 'auto', fontSize: 11, color: T.text3 }}>
              {selected.size} selecionado(s)
            </span>
            <button
              disabled={selected.size === 0 || busy}
              onClick={() => setConfirming(true)}
              style={{
                fontSize: 12, borderRadius: 6, padding: '6px 12px',
                cursor: selected.size === 0 || busy ? 'not-allowed' : 'pointer',
                opacity: selected.size === 0 || busy ? 0.5 : 1,
                color: T.crit, background: `${T.crit}12`, border: `1px solid ${T.crit}44`,
              }}
            >Excluir selecionados</button>
          </>
        ) : (
          <span style={{ fontSize: 11, color: T.text3 }}>Somente download disponível para o seu papel.</span>
        )
      }
    >
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <select
            value={boardId}
            onChange={e => setBoardId(e.target.value)}
            style={{
              fontSize: 12, color: T.text1, background: T.bgSurface2,
              border: `1px solid ${T.border}`, borderRadius: 6, padding: '6px 10px',
            }}
          >
            <option value="">Todos os boards</option>
            {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <span style={{ fontSize: 11, color: T.text3 }}>
            {rows.length} arquivo(s) · {bytesToHuman(totalBytes)}
          </span>
        </div>

        {loading && <div style={{ fontSize: 12, color: T.text3 }}>Carregando arquivos…</div>}
        {!loading && error && <div style={{ fontSize: 12, color: T.crit }}>{error}</div>}
        {!loading && !error && rows.length === 0 && (
          <div style={{ fontSize: 12, color: T.text3 }}>Nenhum arquivo neste projeto.</div>
        )}

        {!loading && !error && rows.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ color: T.text3 }}>
                {canDelete && (
                  <th style={{ ...th, width: 28 }}>
                    <input
                      type="checkbox"
                      checked={selected.size === rows.length}
                      onChange={e => setSelected(e.target.checked ? new Set(rows.map(r => r.id)) : new Set())}
                    />
                  </th>
                )}
                <th style={th}>Arquivo</th>
                <th style={th}>Board</th>
                <th style={th}>Tamanho</th>
                <th style={th}>Enviado por</th>
                <th style={th}>Data</th>
                <th style={th}>Scan</th>
                <th style={th} />
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  {canDelete && (
                    <td style={td}>
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                    </td>
                  )}
                  <td style={{ ...td, color: T.text1 }}>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 10, color: T.text3 }}>{r.work_item_key} · {r.work_item_title}</div>
                  </td>
                  <td style={td}>{r.board_name ?? '—'}</td>
                  <td style={td}>{bytesToHuman(r.size_bytes)}</td>
                  <td style={td}>{r.uploaded_by_name ?? '—'}</td>
                  <td style={td}>{new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                  <td style={td}>{r.scan_status}</td>
                  <td style={td}>
                    <button onClick={() => void download(r)} style={{
                      fontSize: 11, color: T.accent, background: 'none',
                      border: `1px solid ${T.accentBorder}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                    }}>Baixar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirming && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 60, display: 'flex',
            alignItems: 'center', justifyContent: 'center', background: 'rgba(8,10,14,0.6)',
          }}
          onClick={e => { if (e.target === e.currentTarget) setConfirming(false) }}
        >
          <div style={{
            background: T.bgSurface, border: `1px solid ${T.border}`, borderRadius: 10,
            padding: 20, width: 360, boxShadow: '0 24px 60px rgba(0,0,0,.45)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text1 }}>Excluir arquivos</div>
            <p style={{ fontSize: 12, color: T.text2, margin: '8px 0 16px' }}>
              {selected.size} arquivo(s) serão removidos permanentemente do projeto {projectKey}. Esta ação libera cota e não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setConfirming(false)} style={{
                fontSize: 12, color: T.text2, background: T.bgSurface2,
                border: `1px solid ${T.border}`, borderRadius: 6, padding: '6px 12px', cursor: 'pointer',
              }}>Cancelar</button>
              <button disabled={busy} onClick={() => void removeSelected()} style={{
                fontSize: 12, color: T.crit, background: `${T.crit}12`,
                border: `1px solid ${T.crit}44`, borderRadius: 6, padding: '6px 12px',
                cursor: busy ? 'wait' : 'pointer',
              }}>{busy ? 'Excluindo…' : 'Excluir'}</button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  )
}
