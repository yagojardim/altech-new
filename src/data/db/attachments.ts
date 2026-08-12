// Attachments data layer — real uploads/downloads against the private
// `attachments` storage bucket plus the `attachments` table.
// Same pattern as the other db/* modules: tenant-scoped, safeCall, no `any`.
import { supabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'
import { safeCall } from '@/utils/logger'

type Tables = Database['public']['Tables']

const BUCKET = 'attachments'
const DEFAULT_MAX_FILE_BYTES = 10 * 1024 * 1024

export interface AttachmentRow {
  id: string
  name: string
  size_bytes: number | null
  mime_type: string | null
  storage_path: string | null
  scan_status: string
  created_by: string | null
  created_at: string
  /** Display name of the profile that uploaded the file (join on profiles). */
  uploaded_by_name: string | null
}

// ─── Allowlist ────────────────────────────────────────────────────────────────
export const ALLOWED_EXTENSIONS = [
  'png', 'jpg', 'jpeg', 'gif', 'webp',
  'pdf',
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'txt',
  'zip',
] as const

export const BLOCKED_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'sh', 'js', 'mjs', 'html', 'htm', 'svg',
  'jar', 'msi', 'dll', 'scr', 'com', 'ps1', 'vbs',
] as const

const ALLOWED_MIME_PREFIXES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'text/plain', 'text/csv',
  'application/zip', 'application/x-zip-compressed',
]

/** Accept attribute for the hidden file input. */
export const ACCEPT_ATTR = ALLOWED_EXTENSIONS.map(e => `.${e}`).join(',')

function extensionOf(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx === -1 ? '' : name.slice(idx + 1).toLowerCase()
}

export function isAllowedFile(name: string, mime: string): boolean {
  const ext = extensionOf(name)
  if (!ext || (BLOCKED_EXTENSIONS as readonly string[]).includes(ext)) return false
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) return false
  // Empty mime (some browsers) is tolerated: the extension already passed.
  if (!mime) return true
  return ALLOWED_MIME_PREFIXES.some(p => mime.toLowerCase().startsWith(p))
}

export function bytesToHuman(bytes: number | null | undefined): string {
  const n = bytes ?? 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

async function sha256Hex(file: File): Promise<string | null> {
  try {
    const buf = await file.arrayBuffer()
    const digest = await crypto.subtle.digest('SHA-256', buf)
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  }
}

/** Maps the storage-limit trigger errors to friendly Portuguese messages. */
function friendlyDbError(message: string): string {
  if (message.includes('FILE_TOO_LARGE')) return 'Arquivo maior que o limite do plano'
  if (message.includes('TENANT_QUOTA_EXCEEDED')) return 'Cota de armazenamento do tenant esgotada'
  if (message.includes('PROJECT_FILE_LIMIT')) return 'Limite de arquivos do projeto atingido'
  return message
}

// ─── Reads ────────────────────────────────────────────────────────────────────
type ProfileLite = Pick<Tables['profiles']['Row'], 'id' | 'name'>

/** Non-archived attachments of a work item, newest first. Degrades to []. */
export async function listAttachments(tenantId: string, workItemId: string): Promise<AttachmentRow[]> {
  return safeCall('attachments.listAttachments', async () => {
    const res = await supabase
      .from('attachments')
      .select('id, name, size_bytes, mime_type, storage_path, scan_status, created_by, created_at')
      .eq('tenant_id', tenantId)
      .eq('work_item_id', workItemId)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
    if (res.error) throw new Error(res.error.message)

    const rows = res.data ?? []
    const authorIds = Array.from(new Set(rows.map(r => r.created_by).filter((v): v is string => !!v)))
    let byId = new Map<string, ProfileLite>()
    if (authorIds.length) {
      const profRes = await supabase
        .from('profiles').select('id, name').eq('tenant_id', tenantId).in('id', authorIds)
      if (!profRes.error) byId = new Map((profRes.data ?? []).map(p => [p.id, p]))
    }

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      size_bytes: r.size_bytes === null ? null : Number(r.size_bytes),
      mime_type: r.mime_type,
      storage_path: r.storage_path,
      scan_status: r.scan_status,
      created_by: r.created_by,
      created_at: r.created_at,
      uploaded_by_name: r.created_by ? (byId.get(r.created_by)?.name ?? null) : null,
    }))
  }, [], { tenantId, workItemId })
}

async function maxFileBytes(tenantId: string): Promise<number> {
  return safeCall('attachments.maxFileBytes', async () => {
    const res = await supabase
      .from('tenant_settings').select('max_file_bytes').eq('tenant_id', tenantId).maybeSingle()
    if (res.error) throw new Error(res.error.message)
    const value = res.data?.max_file_bytes
    return value == null ? DEFAULT_MAX_FILE_BYTES : Number(value)
  }, DEFAULT_MAX_FILE_BYTES, { tenantId })
}

// ─── Writes ───────────────────────────────────────────────────────────────────
export interface UploadArgs {
  tenantId: string
  workItemId: string
  file: File
  profileId: string | null
}

/** Uploads to the private bucket and registers the row. Throws friendly errors. */
export async function uploadAttachment({ tenantId, workItemId, file, profileId }: UploadArgs): Promise<AttachmentRow> {
  if (!isAllowedFile(file.name, file.type)) {
    throw new Error('Tipo de arquivo não permitido')
  }

  const limit = await maxFileBytes(tenantId)
  if (file.size > limit) {
    throw new Error('Arquivo excede o limite do plano')
  }

  const checksum = await sha256Hex(file)
  const path = `${tenantId}/${workItemId}/${crypto.randomUUID()}-${sanitizeName(file.name)}`

  const up = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })
  if (up.error) throw new Error(friendlyDbError(up.error.message))

  const insert = await supabase
    .from('attachments')
    .insert({
      tenant_id: tenantId,
      work_item_id: workItemId,
      name: file.name,
      url: path,
      storage_path: path,
      size_bytes: file.size,
      mime_type: file.type || null,
      kind: 'file',
      checksum_sha256: checksum,
      created_by: profileId,
    })
    .select('id, name, size_bytes, mime_type, storage_path, scan_status, created_by, created_at')
    .single()

  if (insert.error) {
    // Never leave an orphan object behind when the row could not be written.
    await supabase.storage.from(BUCKET).remove([path])
    throw new Error(friendlyDbError(insert.error.message))
  }

  const r = insert.data
  return {
    id: r.id,
    name: r.name,
    size_bytes: r.size_bytes === null ? null : Number(r.size_bytes),
    mime_type: r.mime_type,
    storage_path: r.storage_path,
    scan_status: r.scan_status,
    created_by: r.created_by,
    created_at: r.created_at,
    uploaded_by_name: null,
  }
}

/** Short-lived signed URL that forces a download. */
export async function getDownloadUrl(storagePath: string): Promise<string | null> {
  return safeCall('attachments.getDownloadUrl', async () => {
    const res = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60, { download: true })
    if (res.error) throw new Error(res.error.message)
    return res.data?.signedUrl ?? null
  }, null, { storagePath })
}
