/**
 * Flat garment drawings for the demo store: no stock photography, just the shapes of
 * the clothes in the store's own colours. 240 x 240 artboards.
 */
export type GarmentKind = "hoodie" | "tee" | "crew" | "cargo" | "cap" | "socks";

const ART: Record<GarmentKind, (body: string, trim: string) => React.ReactNode> = {
  hoodie: (b, t) => (
    <>
      <path d="M86 52c8-22 60-22 68 0l34 18 30 52-26 14-14-22v104H62V114l-14 22-26-14 30-52z" fill={b} />
      <path d="M86 52c4 26 64 26 68 0" fill="none" stroke={t} strokeWidth="3" />
      <path d="M96 50c6-16 42-16 48 0-6 14-42 14-48 0z" fill="rgb(0 0 0 / 0.18)" />
      <path d="M108 64v26M132 64v26" stroke={t} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M90 156h60l8 34H82z" fill="rgb(0 0 0 / 0.12)" stroke={t} strokeWidth="2" />
      <path d="M62 210h116" stroke={t} strokeWidth="3" />
    </>
  ),
  tee: (b, t) => (
    <>
      <path d="M92 50h56l40 20 24 40-30 14-10-18v110H68V106l-10 18-30-14 24-40z" fill={b} />
      <path d="M100 50c4 16 36 16 40 0" fill="none" stroke={t} strokeWidth="3" />
      <path d="M68 214h104" stroke={t} strokeWidth="3" />
    </>
  ),
  crew: (b, t) => (
    <>
      <path d="M92 48h56l42 22 28 62-26 10-18-36v108H66V106l-18 36-26-10 28-62z" fill={b} />
      <path d="M100 48c4 18 36 18 40 0" fill="none" stroke={t} strokeWidth="4" />
      <path d="M66 204h108M48 136l-6 8M192 136l6 8" stroke={t} strokeWidth="4" />
    </>
  ),
  cargo: (b, t) => (
    <>
      <path d="M76 36h88l10 184h-40l-14-130-14 130H66z" fill={b} />
      <path d="M76 52h88" stroke={t} strokeWidth="3" />
      <path d="M72 120h26v34H70zM142 120h26l2 34h-28z" fill="rgb(0 0 0 / 0.14)" stroke={t} strokeWidth="2" />
    </>
  ),
  cap: (b, t) => (
    <>
      <path d="M58 148c0-50 26-80 62-80s62 30 62 80z" fill={b} />
      <path d="M58 148h124c22 0 40 8 40 16H74c-10 0-16-8-16-16z" fill={b} stroke={t} strokeWidth="2" />
      <path d="M120 68v80M92 78c-6 22-8 46-8 70M148 78c6 22 8 46 8 70" stroke={t} strokeWidth="2" fill="none" />
      <circle cx="120" cy="68" r="5" fill={t} />
    </>
  ),
  socks: (b, t) => (
    <>
      <path d="M74 40h40v110l26 26c12 12 4 34-14 34H88c-10 0-14-6-14-14z" fill={b} />
      <path d="M126 40h40v110l26 26c12 12 4 34-14 34h-38c-10 0-14-6-14-14z" fill={b} opacity="0.75" />
      <path d="M74 60h40M126 60h40M74 70h40M126 70h40" stroke={t} strokeWidth="3" />
    </>
  ),
};

export function Garment({ kind, body, trim, className }: { kind: GarmentKind; body: string; trim: string; className?: string }) {
  return (
    <svg viewBox="0 0 240 240" className={className} aria-hidden>
      {ART[kind](body, trim)}
    </svg>
  );
}
