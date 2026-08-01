// Inspection Mode — password generation utility (no real auth/hash)
import { MOCK_USERS } from './session'

const UPPER  = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWER  = 'abcdefghjkmnpqrstuvwxyz'
const DIGIT  = '23456789'
const SYMBOL = '@#$%!^&*'
const ALL    = UPPER + LOWER + DIGIT + SYMBOL

function randomByte(): number {
  try {
    const buf = new Uint8Array(1)
    crypto.getRandomValues(buf)
    return buf[0]
  } catch {
    return Math.floor(Math.random() * 256)
  }
}

function pickFrom(charset: string): string {
  const limit = charset.length * Math.floor(256 / charset.length)
  let b = randomByte()
  while (b >= limit) b = randomByte()
  return charset[b % charset.length]
}

export function generateTempPassword(): string {
  const chars: string[] = [
    pickFrom(UPPER),
    pickFrom(LOWER),
    pickFrom(DIGIT),
    pickFrom(SYMBOL),
  ]
  for (let i = chars.length; i < 14; i++) chars.push(pickFrom(ALL))
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomByte() % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

export function markPasswordMustChange(userId: string): void {
  const u = MOCK_USERS.find(u => u.user_id === userId)
  if (u) (u as { password_must_change?: boolean }).password_must_change = true
}
