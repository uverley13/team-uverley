import { useRouter } from '@tanstack/react-router'
import { useEffect, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { useSite } from '../../lib/site'
import { formatDate, errorMessage } from '../../lib/session'
import { ICON_NAMES, THEMES, type IconName, type SiteConfig, type ThemeName } from '../../lib/site-config'
import { adminListSiteRevisions, adminRestoreSiteRevision, adminSaveSite } from '../../server/site.functions'

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

export function SiteEditor({ notify }: { notify: Notify }) {
  const router = useRouter()
  const live = useSite()
  const [site, setSite] = useState<SiteConfig>(live)
  const [saving, setSaving] = useState(false)
  const [revisions, setRevisions] = useState<Revision[]>([])
  const dirty = JSON.stringify(site) !== JSON.stringify(live)

  useEffect(() => setSite(live), [live])
  useEffect(() => void loadRevisions(), [])

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

  async function save() {
    setSaving(true)
    try {
      await adminSaveSite({ data: { site } })
      await router.invalidate()
      await loadRevisions()
      notify('success', 'Cambios publicados en la página.')
    } catch (error) {
      notify('error', errorMessage(error, 'No se pudieron guardar los cambios.'))
    } finally {
      setSaving(false)
    }
  }

  async function restore(rev: Revision) {
    if (!window.confirm(`¿Volver a la versión #${rev.id} del ${formatDate(rev.createdAt)}? El contenido actual también queda guardado en el historial.`)) return
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
          <p className="text-sm text-gray-400">Abre cada sección, edita y pulsa Guardar. Los servicios y precios se editan en "Servicios".</p>
        </div>
        <div className="flex gap-2">
          <button disabled={!dirty || saving} onClick={() => setSite(live)} className="rounded-lg border border-gray-800 px-4 py-2.5 text-sm hover:border-gray-600 disabled:opacity-40">Descartar</button>
          <button disabled={!dirty || saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40"><Save size={16} /> {saving ? 'Guardando…' : 'Guardar y publicar'}</button>
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
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Icono</span>
                <select value={item.icon} onChange={e => update({ ...item, icon: e.target.value as IconName })} className={field}>
                  {ICON_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
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
    </section>
  )
}
