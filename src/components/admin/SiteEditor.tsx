import { useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, CalendarClock, Eye, Monitor, Plus, RotateCcw, Smartphone, Trash2, Undo2, X } from 'lucide-react'
import { SiteIcon } from '../SiteIcon'
import { useSite } from '../../lib/site'
import { formatDate, errorMessage } from '../../lib/session'
import { ICON_NAMES, THEMES, type IconName, type SiteConfig, type ThemeName } from '../../lib/site-config'
import { adminDiscardDraft, adminGetDraft, adminListSiteRevisions, adminRestoreSiteRevision, adminSaveDraft, adminSaveSite } from '../../server/site.functions'

const field = 'w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none'
const card = 'rounded-xl border border-gray-800 bg-gray-950 p-5'

type Notify = (kind: 'success' | 'error', text: string) => void
type Revision = Awaited<ReturnType<typeof adminListSiteRevisions>>[number]

function Text({ label, value, onChange, long }: { label: string; value: string; onChange: (v: string) => void; long?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      {long ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className={field} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} className={field} />
      )}
    </label>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className={`${card} group`} open={false}>
      <summary className="cursor-pointer select-none text-lg font-semibold">{title}</summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </details>
  )
}

function ListEditor<T>({ items, onChange, empty, render }: { items: T[]; onChange: (items: T[]) => void; empty: T; render: (item: T, set: (item: T) => void) => ReactNode }) {
  const move = (i: number, d: number) => {
    const next = [...items]
    const [it] = next.splice(i, 1)
    next.splice(i + d, 0, it)
    onChange(next)
  }
  return (
    <div className="space-y-3 sm:col-span-2">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-gray-800 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-xs text-gray-500">#{i + 1}</span>
            <div className="flex gap-1">
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1.5 hover:bg-gray-900 disabled:opacity-30" aria-label="Subir"><ArrowUp size={14} /></button>
              <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="rounded p-1.5 hover:bg-gray-900 disabled:opacity-30" aria-label="Bajar"><ArrowDown size={14} /></button>
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="rounded p-1.5 text-red-300 hover:bg-red-950/50" aria-label="Eliminar"><Trash2 size={14} /></button>
            </div>
          </div>
          <div className="grid gap-3">{render(item, v => onChange(items.map((x, j) => (j === i ? v : x))))}</div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, empty])} className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-700 px-4 py-2 text-sm hover:border-gray-500"><Plus size={14} /> Añadir</button>
    </div>
  )
}

type Draft = Awaited<ReturnType<typeof adminGetDraft>>
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/** Local datetime value (YYYY-MM-DDTHH:mm) for <input type="datetime-local">. */
function toLocalInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Shows the real home/FAQ page rendered with the draft content, in desktop or phone width. */
function PreviewModal({ site, onClose, onPublish, onSchedule, busy, scheduledAt }: {
  site: SiteConfig
  onClose: () => void
  onPublish: () => void
  onSchedule: (iso: string | null) => void
  busy: boolean
  scheduledAt: string | null
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [page, setPage] = useState<'/' | '/faq'>('/')
  const [when, setWhen] = useState(scheduledAt ? toLocalInput(scheduledAt) : '')
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    const send = () => frame.current?.contentWindow?.postMessage({ type: 'site-preview', site }, window.location.origin)
    const onMessage = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.data?.type === 'site-preview-ready') send()
    }
    window.addEventListener('message', onMessage)
    send()
    return () => window.removeEventListener('message', onMessage)
  }, [site])

  return (
    <div role="dialog" aria-modal="true" aria-label="Vista previa" className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-900 px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="font-semibold">Vista previa</p>
          <span className="rounded bg-yellow-900/40 px-2 py-0.5 text-xs text-yellow-300">Sin publicar</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['/', '/faq'] as const).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`rounded-lg px-3 py-1.5 text-sm ${page === p ? 'bg-gray-100 text-black' : 'border border-gray-800'}`}>{p === '/' ? 'Inicio' : 'Preguntas'}</button>
          ))}
          <span className="mx-1 w-px bg-gray-800" />
          <button onClick={() => setDevice('desktop')} aria-label="Computador" title="Computador" className={`rounded-lg p-2 ${device === 'desktop' ? 'bg-gray-100 text-black' : 'border border-gray-800'}`}><Monitor size={16} /></button>
          <button onClick={() => setDevice('mobile')} aria-label="Celular" title="Celular" className={`rounded-lg p-2 ${device === 'mobile' ? 'bg-gray-100 text-black' : 'border border-gray-800'}`}><Smartphone size={16} /></button>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-lg border border-gray-800 p-2"><X size={16} /></button>
        </div>
      </div>
      <div className="flex flex-1 justify-center overflow-hidden bg-gray-950 p-4">
        <iframe
          ref={frame}
          key={page}
          src={`${page}?vista-previa=1`}
          title="Vista previa de la página"
          className={`h-full rounded-lg border border-gray-800 bg-black transition-all ${device === 'mobile' ? 'w-[390px]' : 'w-full'}`}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-900 px-4 py-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
          Revisé la vista previa y quiero aplicar estos cambios
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm" aria-label="Fecha de publicación" />
          <button disabled={!confirmed || !when || busy} onClick={() => onSchedule(new Date(when).toISOString())} className="inline-flex items-center gap-2 rounded-lg border border-blue-700 px-4 py-2 text-sm text-blue-300 disabled:opacity-40"><CalendarClock size={16} /> Programar</button>
          {scheduledAt && <button disabled={busy} onClick={() => onSchedule(null)} className="rounded-lg border border-gray-800 px-4 py-2 text-sm">Quitar programación</button>}
          <button disabled={!confirmed || busy} onClick={onPublish} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40">{busy ? 'Publicando…' : 'Publicar ahora'}</button>
        </div>
      </div>
    </div>
  )
}

export function SiteEditor({ notify }: { notify: Notify }) {
  const router = useRouter()
  const live = useSite()
  const [site, setSiteState] = useState<SiteConfig>(live)
  const [history, setHistory] = useState<SiteConfig[]>([])
  const [saving, setSaving] = useState(false)
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [draft, setDraft] = useState<Draft>(null)
  const [loaded, setLoaded] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [previewing, setPreviewing] = useState(false)
  const lastSaved = useRef<string>('')
  const dirty = JSON.stringify(site) !== JSON.stringify(live)

  // Every edit goes through here so it can be undone.
  function setSite(update: SiteConfig | ((s: SiteConfig) => SiteConfig)) {
    setSiteState(current => {
      const next = typeof update === 'function' ? update(current) : update
      if (next !== current) setHistory(h => [...h.slice(-49), current])
      return next
    })
  }
  function undo() {
    setHistory(h => {
      if (!h.length) return h
      setSiteState(h[h.length - 1])
      return h.slice(0, -1)
    })
  }

  useEffect(() => {
    void loadRevisions()
    adminGetDraft()
      .then(d => {
        setDraft(d)
        if (d) {
          setSiteState(d.site)
          lastSaved.current = JSON.stringify(d.site)
        } else lastSaved.current = JSON.stringify(live)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  // Auto-save the draft 1.5 s after the last change. Drafts are never visible to visitors.
  useEffect(() => {
    if (!loaded) return
    const serialized = JSON.stringify(site)
    if (serialized === lastSaved.current) return
    setSaveState('saving')
    const timer = setTimeout(async () => {
      try {
        const next = await adminSaveDraft({ data: { site, scheduledAt: draft?.scheduledAt ?? null } })
        lastSaved.current = serialized
        setDraft(next)
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [site, loaded])

  async function loadRevisions() {
    try {
      setRevisions(await adminListSiteRevisions())
    } catch {
      /* the list is optional */
    }
  }

  function set<K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) {
    setSite(s => ({ ...s, [key]: value }))
  }
  function sub<K extends keyof SiteConfig>(key: K) {
    return (field: string) => (v: unknown) => setSite(s => ({ ...s, [key]: { ...(s[key] as object), [field]: v } }))
  }

  async function publish() {
    setSaving(true)
    try {
      await adminSaveSite({ data: { site } })
      await router.invalidate()
      await loadRevisions()
      setDraft(null)
      setHistory([])
      lastSaved.current = JSON.stringify(site)
      setPreviewing(false)
      notify('success', 'Cambios publicados en la página.')
    } catch (error) {
      notify('error', errorMessage(error, 'No se pudieron publicar los cambios.'))
    } finally {
      setSaving(false)
    }
  }

  async function schedule(iso: string | null) {
    setSaving(true)
    try {
      const next = await adminSaveDraft({ data: { site, scheduledAt: iso } })
      lastSaved.current = JSON.stringify(site)
      setDraft(next)
      setPreviewing(false)
      notify('success', iso ? `Publicación programada para el ${formatDate(iso)}.` : 'Se quitó la publicación programada. El borrador sigue guardado.')
    } catch (error) {
      notify('error', errorMessage(error, 'No se pudo programar la publicación.'))
    } finally {
      setSaving(false)
    }
  }

  async function discard() {
    if (!window.confirm('¿Descartar el borrador? Se perderán los cambios que no has publicado.')) return
    try {
      await adminDiscardDraft()
      setDraft(null)
      setSiteState(live)
      setHistory([])
      lastSaved.current = JSON.stringify(live)
      setSaveState('idle')
      notify('success', 'Borrador descartado.')
    } catch (error) {
      notify('error', errorMessage(error, 'No se pudo descartar el borrador.'))
    }
  }

  async function restore(rev: Revision) {
    if (!window.confirm(`¿Volver a la versión #${rev.id} del ${formatDate(rev.createdAt)}? Se publicará de inmediato y el contenido actual quedará guardado en el historial.`)) return
    try {
      await adminRestoreSiteRevision({ data: { id: rev.id } })
      await router.invalidate()
      await loadRevisions()
      notify('success', `Versión #${rev.id} restaurada.`)
    } catch (error) {
      notify('error', errorMessage(error, 'No se pudo restaurar la versión.'))
    }
  }

  const brand = sub('brand'), contact = sub('contact'), payments = sub('payments'), hero = sub('hero')
  const catalog = sub('catalog'), why = sub('why'), contactSection = sub('contactSection'), faqContact = sub('faqContact')

  return (
    <section>
      <div className="sticky top-0 z-10 -mx-5 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-900 bg-black/90 px-5 py-3 backdrop-blur">
        <div>
          <h1 className="text-3xl font-bold">Contenido de la página</h1>
          <p className="text-sm text-gray-400">
            Los cambios se guardan solos como borrador y no se publican hasta que los revises en la vista previa.{' '}
            <span className={saveState === 'error' ? 'text-red-300' : 'text-gray-500'}>
              {saveState === 'saving' ? 'Guardando borrador…' : saveState === 'saved' ? 'Borrador guardado.' : saveState === 'error' ? 'No se pudo guardar el borrador.' : ''}
            </span>
          </p>
          {draft?.scheduledAt && (
            <p className="mt-1 inline-flex items-center gap-1.5 rounded bg-blue-900/30 px-2 py-0.5 text-xs text-blue-300"><CalendarClock size={12} /> Se publicará el {formatDate(draft.scheduledAt)}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button disabled={!history.length} onClick={undo} className="inline-flex items-center gap-2 rounded-lg border border-gray-800 px-3 py-2.5 text-sm hover:border-gray-600 disabled:opacity-40" title="Deshacer el último cambio"><Undo2 size={16} /> Deshacer</button>
          <button disabled={(!dirty && !draft) || saving} onClick={() => void discard()} className="rounded-lg border border-gray-800 px-4 py-2.5 text-sm hover:border-gray-600 disabled:opacity-40">Descartar borrador</button>
          <button disabled={!dirty || saving} onClick={() => setPreviewing(true)} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40"><Eye size={16} /> Vista previa y publicar</button>
        </div>
      </div>

      <div className="space-y-4">
        <Group title="Marca y colores">
          <Text label="Nombre (primera parte)" value={site.brand.first} onChange={brand('first')} />
          <Text label="Nombre (parte destacada)" value={site.brand.second} onChange={brand('second')} />
          <Text label="Frase corta" value={site.brand.tagline} onChange={brand('tagline')} />
          <Text label="Descripción para Google" value={site.brand.metaDescription} onChange={brand('metaDescription')} />
          <div className="sm:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Color principal</span>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(THEMES) as ThemeName[]).map(name => (
                <button key={name} type="button" onClick={() => set('theme', name)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${site.theme === name ? 'border-white' : 'border-gray-800 hover:border-gray-600'}`}>
                  <span className="h-4 w-4 rounded-full" style={{ background: THEMES[name][600] }} /> {THEMES[name].label}
                </button>
              ))}
            </div>
          </div>
        </Group>

        <Group title="Anuncio superior">
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" checked={site.announcement.enabled} onChange={e => set('announcement', { ...site.announcement, enabled: e.target.checked })} />
            Mostrar una franja de aviso en la página principal
          </label>
          <div className="sm:col-span-2"><Text label="Texto del anuncio" value={site.announcement.text} onChange={v => set('announcement', { ...site.announcement, text: v })} /></div>
        </Group>

        <Group title="Contacto (WhatsApp)">
          <Text label="Número (solo dígitos con indicativo, ej. 573001234567)" value={site.contact.whatsapp} onChange={contact('whatsapp')} />
          <Text label="Número como se muestra" value={site.contact.whatsappDisplay} onChange={contact('whatsappDisplay')} />
          <Text label="Mensaje predeterminado" value={site.contact.defaultMessage} onChange={contact('defaultMessage')} long />
          <Text label="Mensaje de soporte (inicio de sesión)" value={site.contact.supportMessage} onChange={contact('supportMessage')} long />
        </Group>

        <Group title="Pagos y recargas">
          <Text label="Medio de pago" value={site.payments.method} onChange={payments('method')} />
          <Text label="Nombre del titular" value={site.payments.accountName} onChange={payments('accountName')} />
          <Text label="Número de cuenta" value={site.payments.accountNumber} onChange={payments('accountNumber')} />
          <div />
          <Text label="Recarga mínima (COP)" value={String(site.payments.minTopup)} onChange={v => payments('minTopup')(Number(v.replace(/\D/g, '')) || 0)} />
          <Text label="Recarga máxima (COP)" value={String(site.payments.maxTopup)} onChange={v => payments('maxTopup')(Number(v.replace(/\D/g, '')) || 0)} />
          <div className="sm:col-span-2"><Text label="Nota al recargar" value={site.payments.note} onChange={payments('note')} long /></div>
        </Group>

        <Group title="Portada">
          <Text label="Etiqueta superior" value={site.hero.badge} onChange={hero('badge')} />
          <Text label="Título" value={site.hero.title} onChange={hero('title')} />
          <Text label="Título (segunda línea, gris)" value={site.hero.titleMuted} onChange={hero('titleMuted')} />
          <Text label="Botón principal" value={site.hero.primaryCta} onChange={hero('primaryCta')} />
          <div className="sm:col-span-2"><Text label="Texto" value={site.hero.text} onChange={hero('text')} long /></div>
          <Text label="Botón de WhatsApp" value={site.hero.secondaryCta} onChange={hero('secondaryCta')} />
          <Text label="Título del panel de pasos" value={site.hero.panelLabel} onChange={hero('panelLabel')} />
          <Text label="Estado del panel" value={site.hero.panelStatus} onChange={hero('panelStatus')} />
        </Group>

        <Group title="Pasos (cómo funciona)">
          <ListEditor items={site.steps} onChange={v => set('steps', v)} empty={{ title: '', desc: '' }} render={(item, update) => (
            <>
              <Text label="Título" value={item.title} onChange={v => update({ ...item, title: v })} />
              <Text label="Descripción" value={item.desc} onChange={v => update({ ...item, desc: v })} />
            </>
          )} />
        </Group>

        <Group title="Catálogo">
          <Text label="Etiqueta" value={site.catalog.eyebrow} onChange={catalog('eyebrow')} />
          <Text label="Título" value={site.catalog.title} onChange={catalog('title')} />
          <div className="sm:col-span-2"><Text label="Nota" value={site.catalog.note} onChange={catalog('note')} long /></div>
          <Text label="Texto del botón de pedir" value={site.catalog.orderButton} onChange={catalog('orderButton')} />
          <Text label="Título sin servicios" value={site.catalog.emptyTitle} onChange={catalog('emptyTitle')} />
          <div className="sm:col-span-2"><Text label="Texto sin servicios" value={site.catalog.emptyText} onChange={catalog('emptyText')} long /></div>
        </Group>

        <Group title="Por qué nosotros">
          <Text label="Etiqueta" value={site.why.eyebrow} onChange={why('eyebrow')} />
          <Text label="Título" value={site.why.title} onChange={why('title')} />
          <Text label="Texto" value={site.why.text} onChange={why('text')} long />
          <Text label="Botón de registro" value={site.why.cta} onChange={why('cta')} />
          <ListEditor items={site.values} onChange={v => set('values', v)} empty={{ icon: 'Star' as IconName, title: '', desc: '' }} render={(item, update) => (
            <>
              <div>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Icono</span>
                <div className="flex flex-wrap gap-1.5">
                  {ICON_NAMES.map(n => (
                    <button key={n} type="button" title={n} aria-label={n} aria-pressed={item.icon === n} onClick={() => update({ ...item, icon: n as IconName })} className={`rounded-lg border p-2 ${item.icon === n ? 'border-white bg-gray-800' : 'border-gray-800 hover:border-gray-600'}`}>
                      <SiteIcon name={n} size={18} />
                    </button>
                  ))}
                </div>
              </div>
              <Text label="Título" value={item.title} onChange={v => update({ ...item, title: v })} />
              <Text label="Descripción" value={item.desc} onChange={v => update({ ...item, desc: v })} long />
            </>
          )} />
        </Group>

        <Group title="Sección de contacto y pie de página">
          <Text label="Título de contacto" value={site.contactSection.title} onChange={contactSection('title')} />
          <Text label="Texto de contacto" value={site.contactSection.text} onChange={contactSection('text')} long />
          <div className="sm:col-span-2"><Text label="Texto del pie de página" value={site.footer.text} onChange={v => set('footer', { text: v })} /></div>
        </Group>

        <Group title="Preguntas frecuentes">
          <ListEditor items={site.faq} onChange={v => set('faq', v)} empty={{ question: '', answer: '' }} render={(item, update) => (
            <>
              <Text label="Pregunta" value={item.question} onChange={v => update({ ...item, question: v })} />
              <Text label="Respuesta" value={item.answer} onChange={v => update({ ...item, answer: v })} long />
            </>
          )} />
          <Text label="Título final" value={site.faqContact.title} onChange={faqContact('title')} />
          <Text label="Texto final" value={site.faqContact.text} onChange={faqContact('text')} />
        </Group>

        <details className={card}>
          <summary className="cursor-pointer select-none text-lg font-semibold">Historial de versiones</summary>
          <p className="mt-2 text-sm text-gray-400">Cada vez que guardas (tú o el asistente) se conserva la versión anterior. Puedes volver a cualquiera.</p>
          {revisions.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">Todavía no hay versiones anteriores.</p>
          ) : (
            <div className="mt-4 divide-y divide-gray-900">
              {revisions.map(rev => (
                <div key={rev.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold">#{rev.id} · Versión anterior a: {rev.summary ?? rev.source}</p>
                    <p className="text-xs text-gray-500">{formatDate(rev.createdAt)} · {rev.source}{rev.createdBy ? ` · ${rev.createdBy}` : ''}</p>
                  </div>
                  <button onClick={() => void restore(rev)} className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-1.5 text-sm hover:border-gray-500"><RotateCcw size={14} /> Restaurar</button>
                </div>
              ))}
            </div>
          )}
        </details>
      </div>

      {previewing && (
        <PreviewModal site={site} busy={saving} scheduledAt={draft?.scheduledAt ?? null} onClose={() => setPreviewing(false)} onPublish={() => void publish()} onSchedule={iso => void schedule(iso)} />
      )}
    </section>
  )
}
