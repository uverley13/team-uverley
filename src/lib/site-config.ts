/*
 * Everything on the public site that the admin can edit from the panel (or
 * through the assistant). Shared by client and server: no server imports here.
 * DEFAULT_SITE holds the original texts so the site looks the same until edited.
 */

export const ICON_NAMES = ['ShieldCheck', 'Zap', 'Wallet', 'Clock', 'Smartphone', 'Star', 'Heart', 'Lock', 'Truck', 'Wrench', 'Headphones', 'BadgeCheck'] as const
export type IconName = (typeof ICON_NAMES)[number]

export const THEMES = {
  azul: { label: 'Azul', 300: '#a9c4ff', 400: '#7fa6f5', 500: '#5b88e8', 600: '#3d6fdb', 700: '#305bbb', 800: '#24447f', 900: '#172a4d' },
  morado: { label: 'Morado', 300: '#cbbcff', 400: '#ab97f7', 500: '#8f76ec', 600: '#7458d9', 700: '#5f45bb', 800: '#43317f', 900: '#291f4d' },
  verde: { label: 'Verde', 300: '#9fe8c4', 400: '#62d3a0', 500: '#33b981', 600: '#1f9d68', 700: '#198356', 800: '#155c3e', 900: '#0f3424' },
  naranja: { label: 'Naranja', 300: '#ffc9a1', 400: '#fca66b', 500: '#f48a42', 600: '#e06d24', 700: '#bc5819', 800: '#7f3d14', 900: '#4a250d' },
  rojo: { label: 'Rojo', 300: '#ffb3b8', 400: '#f78a92', 500: '#ec6470', 600: '#d94452', 700: '#b83442', 800: '#7d2630', 900: '#4a171d' },
  rosa: { label: 'Rosa', 300: '#ffb8df', 400: '#f78dc6', 500: '#ea66ae', 600: '#d44593', 700: '#b2357a', 800: '#7a2755', 900: '#481833' },
  cian: { label: 'Cian', 300: '#a3e6f5', 400: '#69d0e8', 500: '#38b6d6', 600: '#1f97bb', 700: '#197c9c', 800: '#16576d', 900: '#0f3341' },
} as const
export type ThemeName = keyof typeof THEMES

export type SiteConfig = {
  brand: { first: string; second: string; tagline: string; metaDescription: string }
  theme: ThemeName
  contact: { whatsapp: string; whatsappDisplay: string; defaultMessage: string; supportMessage: string }
  payments: { method: string; accountName: string; accountNumber: string; minTopup: number; maxTopup: number; note: string }
  announcement: { enabled: boolean; text: string }
  hero: { badge: string; title: string; titleMuted: string; text: string; primaryCta: string; secondaryCta: string; panelLabel: string; panelStatus: string }
  steps: { title: string; desc: string }[]
  catalog: { eyebrow: string; title: string; note: string; emptyTitle: string; emptyText: string; orderButton: string }
  why: { eyebrow: string; title: string; text: string; cta: string }
  values: { icon: IconName; title: string; desc: string }[]
  contactSection: { title: string; text: string }
  footer: { text: string }
  faq: { question: string; answer: string }[]
  faqContact: { title: string; text: string }
}

export const DEFAULT_SITE: SiteConfig = {
  brand: {
    first: 'Servidor',
    second: 'Uverley',
    tagline: 'Servicios digitales para dispositivos móviles.',
    metaDescription: 'Servidor Uverley: servicios digitales, pedidos y soporte personalizado.',
  },
  theme: 'azul',
  contact: {
    whatsapp: '573172329884',
    whatsappDisplay: '+57 317 232 9884',
    defaultMessage: 'Hola Servidor Uverley, quiero información sobre sus servicios',
    supportMessage: 'Hola Servidor Uverley, quiero acceder al panel',
  },
  payments: {
    method: 'Nequi',
    accountName: 'Uverley Rodriguez',
    accountNumber: '3153310730',
    minTopup: 20000,
    maxTopup: 2000000,
    note: 'Después de realizar el pago, sube el comprobante. El saldo será agregado cuando el administrador apruebe la recarga.',
  },
  announcement: { enabled: false, text: '' },
  hero: {
    badge: 'Atendiendo pedidos · Colombia',
    title: 'Servicios para tu celular,',
    titleMuted: 'sin vueltas.',
    text: 'Pide servicios técnicos para dispositivos móviles desde tu cuenta, paga con saldo recargado por Nequi y sigue cada pedido hasta que esté listo.',
    primaryCta: 'Ver servicios',
    secondaryCta: 'Hablar por WhatsApp',
    panelLabel: 'Tu pedido',
    panelStatus: 'en curso',
  },
  steps: [
    { title: 'Crea tu cuenta', desc: 'Regístrate con tu correo en menos de un minuto.' },
    { title: 'Recarga saldo', desc: 'Paga por Nequi y sube el comprobante. Lo validamos y acreditamos.' },
    { title: 'Pide el servicio', desc: 'Elige del catálogo; el valor se descuenta de tu saldo al instante.' },
    { title: 'Seguimiento', desc: 'Consulta el estado en "Mi cuenta" o escríbenos por WhatsApp.' },
  ],
  catalog: {
    eyebrow: 'Catálogo',
    title: 'Servicios disponibles',
    note: 'Precios en pesos colombianos. El valor se descuenta de tu saldo al confirmar el pedido.',
    emptyTitle: 'Estamos actualizando el catálogo',
    emptyText: 'Escríbenos por WhatsApp y te contamos qué servicios tenemos disponibles hoy.',
    orderButton: 'Pedir',
  },
  why: {
    eyebrow: 'Por qué nosotros',
    title: 'Un proceso claro, de principio a fin.',
    text: 'Todo queda en tu cuenta: saldo, recargas y pedidos. Si tienes dudas, revisa las preguntas frecuentes.',
    cta: 'Crear cuenta gratis',
  },
  values: [
    { icon: 'ShieldCheck', title: 'Procesos verificados', desc: 'Cada pedido queda registrado en tu cuenta con su estado y su historial de saldo.' },
    { icon: 'Zap', title: 'Atención ágil', desc: 'Gestionamos las solicitudes en orden de llegada y te avisamos cuando cambian de estado.' },
    { icon: 'Wallet', title: 'Saldo transparente', desc: 'Recargas desde $20.000 COP. Ves cada movimiento antes y después de pedir.' },
    { icon: 'Clock', title: 'Soporte directo', desc: 'Hablas con una persona por WhatsApp, no con un bot.' },
  ],
  contactSection: {
    title: '¿Tienes un caso específico?',
    text: 'Cuéntanos el modelo de tu equipo y lo que necesitas. Te respondemos por WhatsApp con el servicio y el valor.',
  },
  footer: { text: 'Servicios digitales para dispositivos móviles.' },
  faq: [
    { question: '¿Qué tipo de servicios ofrecen?', answer: 'Servicios técnicos y digitales para dispositivos móviles. En la página principal ves el catálogo actualizado con su precio; si tu caso no aparece, escríbenos por WhatsApp.' },
    { question: '¿Necesito una cuenta para pedir?', answer: 'Sí. La cuenta guarda tu saldo, tus recargas y el estado de cada pedido. Registrarte es gratis y solo pide un correo.' },
    { question: '¿Cómo recargo saldo?', answer: 'Desde "Mi cuenta" entra a "Recargar saldo", paga por Nequi al número indicado y sube la captura del comprobante. El saldo se acredita cuando el administrador valida el pago. La recarga mínima es de $20.000 COP.' },
    { question: '¿Cuánto tarda la atención?', answer: 'Depende del servicio. Las solicitudes se gestionan en orden de llegada y puedes revisar el estado en "Mi cuenta" en cualquier momento.' },
    { question: '¿Qué pasa si un pedido se cancela?', answer: 'Escríbenos por WhatsApp con el número de pedido y revisamos el caso para ajustar tu saldo.' },
  ],
  faqContact: { title: '¿No encontraste tu respuesta?', text: 'Te respondemos directamente por WhatsApp.' },
}

/* ------------------------------ Normalization ------------------------------ */

function str(value: unknown, fallback: string, max = 600) {
  return typeof value === 'string' ? value.trim().slice(0, max) : fallback
}

function int(value: unknown, fallback: number, min: number, max: number) {
  const n = typeof value === 'string' ? Number(value.replace(/\D/g, '')) : Number(value)
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function strings<T extends Record<string, string>>(value: unknown, fallback: T, max?: number): T {
  const source = obj(value)
  const out = { ...fallback }
  for (const key of Object.keys(fallback) as (keyof T)[]) out[key] = str(source[key as string], fallback[key], max) as T[keyof T]
  return out
}

function list<T>(value: unknown, fallback: T[], item: (raw: unknown, base: T) => T, maxItems: number): T[] {
  if (!Array.isArray(value)) return fallback
  return value.slice(0, maxItems).map((raw, i) => item(raw, fallback[i] ?? fallback[0]))
}

/**
 * Turns any stored or submitted value into a complete, safe SiteConfig.
 * Missing fields fall back to `base`, unknown fields are dropped.
 */
export function normalizeSite(input: unknown, base: SiteConfig = DEFAULT_SITE): SiteConfig {
  const v = obj(input)
  const payments = obj(v.payments)
  const announcement = obj(v.announcement)
  const minTopup = int(payments.minTopup, base.payments.minTopup, 1000, 10_000_000)
  const maxTopup = Math.max(minTopup, int(payments.maxTopup, base.payments.maxTopup, 1000, 50_000_000))
  const whatsapp = str(obj(v.contact).whatsapp, base.contact.whatsapp, 20).replace(/\D/g, '') || base.contact.whatsapp

  return {
    brand: strings(v.brand, base.brand, 300),
    theme: typeof v.theme === 'string' && v.theme in THEMES ? (v.theme as ThemeName) : base.theme,
    contact: { ...strings(v.contact, base.contact, 300), whatsapp },
    payments: {
      method: str(payments.method, base.payments.method, 60),
      accountName: str(payments.accountName, base.payments.accountName, 120),
      accountNumber: str(payments.accountNumber, base.payments.accountNumber, 60),
      minTopup,
      maxTopup,
      note: str(payments.note, base.payments.note),
    },
    announcement: {
      enabled: typeof announcement.enabled === 'boolean' ? announcement.enabled : base.announcement.enabled,
      text: str(announcement.text, base.announcement.text, 300),
    },
    hero: strings(v.hero, base.hero),
    steps: list(v.steps, base.steps, (raw, b) => strings(raw, b ?? { title: '', desc: '' }), 8),
    catalog: strings(v.catalog, base.catalog),
    why: strings(v.why, base.why),
    values: list(
      v.values,
      base.values,
      (raw, b) => {
        const item = obj(raw)
        const fallback = b ?? { icon: 'Star' as IconName, title: '', desc: '' }
        return {
          icon: ICON_NAMES.includes(item.icon as IconName) ? (item.icon as IconName) : fallback.icon,
          title: str(item.title, fallback.title, 120),
          desc: str(item.desc, fallback.desc),
        }
      },
      8,
    ),
    contactSection: strings(v.contactSection, base.contactSection),
    footer: strings(v.footer, base.footer),
    faq: list(v.faq, base.faq, (raw, b) => strings(raw, b ?? { question: '', answer: '' }, 2000), 30),
    faqContact: strings(v.faqContact, base.faqContact),
  }
}

/** Deep-merges a partial change (e.g. from the assistant) into the current config. */
export function mergeSite(current: SiteConfig, patch: unknown): SiteConfig {
  const p = obj(patch)
  const merged: Record<string, unknown> = { ...current }
  for (const [key, value] of Object.entries(p)) {
    const existing = (current as Record<string, unknown>)[key]
    merged[key] = value && typeof value === 'object' && !Array.isArray(value) && existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as object), ...(value as object) }
      : value
  }
  return normalizeSite(merged, current)
}

export function siteName(site: SiteConfig) {
  return `${site.brand.first} ${site.brand.second}`.trim()
}

export function waLink(site: SiteConfig, text?: string) {
  return `https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(text ?? site.contact.defaultMessage)}`
}

/** CSS that recolors the accent palette (used across the whole site) to the chosen theme. */
export function themeCss(theme: ThemeName) {
  const t = THEMES[theme] ?? THEMES.azul
  const shades = [300, 400, 500, 600, 700, 800, 900] as const
  return `:root{${shades.map(s => `--color-blue-${s}:${t[s]};`).join('')}}`
}
