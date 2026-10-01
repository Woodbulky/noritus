import { createContext, useContext } from 'react'

/** Certify drives several tools: same engine, different words. */
export type Kind = { slug: string; one: string; many: string; builtins: boolean; qr: string }

export const KINDS: Record<string, Kind> = {
  certify: { slug: 'certify', one: 'certificate', many: 'certificates', builtins: true, qr: 'Verification QR' },
  invitations: { slug: 'invitations', one: 'invitation', many: 'invitations', builtins: false, qr: 'RSVP QR code' },
}

export const KindContext = createContext<Kind>(KINDS.certify)
export const useKind = () => useContext(KindContext)
