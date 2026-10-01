import { createContext, useContext } from 'react'

/** Certify drives several tools: same engine, different words. */
export type Kind = { slug: string; one: string; many: string; builtins: boolean; qr: string }

export const KINDS: Record<string, Kind> = {
  certify: { slug: 'certify', one: 'certificate', many: 'certificates', builtins: true, qr: 'Verification QR' },
  'id-cards': { slug: 'id-cards', one: 'ID card', many: 'ID cards', builtins: false, qr: 'ID QR code' },
  'event-passes': { slug: 'event-passes', one: 'pass', many: 'passes', builtins: false, qr: 'Entry QR code' },
  invitations: { slug: 'invitations', one: 'invitation', many: 'invitations', builtins: false, qr: 'RSVP QR code' },
}

export const KindContext = createContext<Kind>(KINDS.certify)
export const useKind = () => useContext(KindContext)
