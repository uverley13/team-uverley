import { useEffect, useState, type FormEvent } from 'react'
import { Check, ExternalLink, Globe, Pencil, Plus, Store, X } from 'lucide-react'
import { errorMessage } from '../../lib/session'
import { adminCreateStore, adminGetStores, adminSelectStore, adminUpdateStore, type StoresOverview, type StoreSummary } from '../../server/stores.functions'
import { card, Empty, Filter, fieldClass, SectionTitle, type Notify } from './ui'

/** Switches the managed store and reloads, so every section shows that store's data. */
export async function switchStore(siteId: number, notify: Notify) {
  try {
    await adminSelectStore({ data: { siteId } })
    window.location.reload()
  } catch (error) {
    notify('error', errorMessage(error, 'No se pudo cambiar de tienda.'))
  }
}

/** Compact selector shown in the panel header. */
export function StoreSwitcher({ notify, onManage }: { notify: Notify; onManage: () => void }) {
  const [data, setData] = useState<StoresOverview | null>(null)
  useEffect(() => {
    adminGetStores().then(setData).catch(() => {})
  }, [])
  if (!data) return null
  if (data.current.viaDomain || data.stores.length < 2) {
    return (
      <button onClick={onManage} className="flex max-w-[14rem] items-center gap-2 truncate rounded-lg border border-gray-800 px-3 py-2 text-sm text-gray-300 hover:border-gray-600" title="Tiendas">
        <Store size={16} className="shrink-0 text-blue-400" /> <span className="truncate">{data.current.name}</span>
      </button>
    )
  }
  return (
    <label className="flex items-center gap-2 rounded-lg border border-gray-800 px-3 py-1.5 text-sm hover:border-gray-600">
      <Store size={16} className="shrink-0 text-blue-400" />
      <span className="sr-only">Tienda que administras</span>
      <select
        value={data.current.id}
        onChange={e => void switchStore(Number(e.target.value), notify)}
        className="max-w-[12rem] truncate bg-transparent py-1 text-gray-100 focus:outline-none"
      >
        {data.stores.map(s => (
          <option key={s.id} value={s.id} className="bg-gray-900">{s.name}</option>
        ))}
      </select>
    </label>
  )
}

type FormState = { name: string; slug: string; domains: string; copyFrom: string; copyProducts: boolean }
const EMPTY: FormState = { name: '', slug: '', domains: '', copyFrom: '', copyProducts: true }

export function StoresPanel({ notify }: { notify: Notify }) {
  const [data, setData] = useState<StoresOverview | null>(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)

  const load = () => adminGetStores().then(setData).catch(e => notify('error', errorMessage(e, 'No se pudieron cargar las tiendas.')))
  useEffect(() => {
    void load()
  }, [])

  if (!data) return <p className="text-gray-400">Cargando…</p>
  const { current } = data

  return (
    <section>
      <SectionTitle
        title="Tiendas"
        subtitle="Cada tienda tiene su propio contenido, catálogo, clientes, saldos, recargas y pedidos. Se abre en los dominios que le asignes."
        actions={!creating && (
          <button onClick={() => { setCreating(true); setEditing(null) }} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
            <Plus size={16} /> Nueva tienda
          </button>
        )}
      />

      <div className={`${card} mb-6 p-4 text-sm text-gray-300`}>
        <p>
          Estás administrando <strong className="text-white">{current.name}</strong>
          {current.viaDomain ? <> desde su dominio <span className="font-mono text-blue-300">{current.host}</span>. Para cambiar de tienda entra al panel desde el dominio principal (<span className="font-mono">{data.mainDomains[0]}</span>).</> : <> desde el dominio principal. Al cambiar de tienda, el panel y la vista de la página en este navegador muestran la tienda elegida; tus clientes no se ven afectados.</>}
        </p>
      </div>

      {creating && (
        <StoreForm
          title="Nueva tienda"
          stores={data.stores}
          initial={{ ...EMPTY, copyFrom: String(current.id) }}
          creating
          onCancel={() => setCreating(false)}
          onSubmit={async form => {
            const result = await adminCreateStore({
              data: { name: form.name, slug: form.slug, domains: form.domains, copyFrom: form.copyFrom ? Number(form.copyFrom) : null, copyProducts: form.copyProducts },
            })
            notify('success', `Tienda "${form.name}" creada. Recuerda agregar sus dominios en Netlify (ver instrucciones abajo).`)
            setCreating(false)
            await load()
            return result
          }}
        />
      )}

      {data.stores.length === 0 ? <Empty>Todavía no hay tiendas.</Empty> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.stores.map(s => editing === s.id ? (
            <StoreForm
              key={s.id}
              title={`Editar "${s.name}"`}
              stores={data.stores}
              initial={{ name: s.name, slug: s.slug, domains: s.domains.join('\n'), copyFrom: '', copyProducts: false }}
              onCancel={() => setEditing(null)}
              onSubmit={async form => {
                await adminUpdateStore({ data: { id: s.id, name: form.name, slug: form.slug, domains: form.domains } })
                notify('success', 'Tienda actualizada.')
                setEditing(null)
                await load()
              }}
            />
          ) : (
            <StoreCard key={s.id} store={s} active={s.id === current.id} canSwitch={!current.viaDomain} onEdit={() => { setEditing(s.id); setCreating(false) }} onSwitch={() => void switchStore(s.id, notify)} />
          ))}
        </div>
      )}

      <div className={`${card} mt-8 p-5 text-sm text-gray-300`}>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-white"><Globe size={18} className="text-blue-400" /> Cómo conectar el dominio de una tienda</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Escribe el dominio en la tienda (por ejemplo <span className="font-mono">mitienda.com</span>). La versión con <span className="font-mono">www.</span> funciona automáticamente.</li>
          <li>En Netlify, abre el proyecto → <strong>Domain management</strong> → <strong>Add a domain</strong> y agrega el mismo dominio (y su versión <span className="font-mono">www.</span>) como alias.</li>
          <li>En el proveedor del dominio, apunta el DNS a Netlify como te indique esa pantalla. El certificado HTTPS se crea solo.</li>
          <li>Cuando el dominio responda, la tienda se abrirá en él con su propio contenido, catálogo y clientes.</li>
        </ol>
        <p className="mt-3 text-xs text-gray-500">
          Las cuentas de acceso (correo y contraseña) son las mismas en todas las tiendas, pero cada tienda guarda por separado el saldo, las recargas y los pedidos de cada cliente.
        </p>
      </div>
    </section>
  )
}

function StoreCard({ store, active, canSwitch, onEdit, onSwitch }: { store: StoreSummary; active: boolean; canSwitch: boolean; onEdit: () => void; onSwitch: () => void }) {
  return (
    <div className={`${card} p-5 ${active ? 'border-blue-700' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-lg font-semibold">
            {store.name}
            {active && <span className="rounded bg-blue-600/20 px-2 py-0.5 text-xs font-medium text-blue-300">administrando</span>}
          </p>
          <p className="font-mono text-xs text-gray-500">#{store.id} · {store.slug}</p>
        </div>
        <button onClick={onEdit} className="rounded-lg border border-gray-800 p-2 hover:border-gray-600" title="Editar" aria-label={`Editar ${store.name}`}><Pencil size={16} /></button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {store.domains.length === 0 ? (
          <span className="text-sm text-gray-500">{store.id === 1 ? 'Dominio principal' : 'Sin dominio propio todavía'}</span>
        ) : store.domains.map(d => (
          <a key={d} href={`https://${d}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded bg-gray-900 px-2 py-1 font-mono text-xs text-gray-300 hover:text-white">
            {d} <ExternalLink size={12} />
          </a>
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-gray-900 p-2"><dt className="text-xs text-gray-500">Clientes</dt><dd className="font-mono">{store.clients}</dd></div>
        <div className="rounded-lg bg-gray-900 p-2"><dt className="text-xs text-gray-500">Pedidos</dt><dd className="font-mono">{store.orders}</dd></div>
        <div className="rounded-lg bg-gray-900 p-2"><dt className="text-xs text-gray-500">Servicios</dt><dd className="font-mono">{store.products}</dd></div>
      </dl>
      {!active && canSwitch && (
        <button onClick={onSwitch} className="mt-4 w-full rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold hover:border-blue-500">Administrar esta tienda</button>
      )}
    </div>
  )
}

function StoreForm({ title, stores, initial, creating, onCancel, onSubmit }: {
  title: string
  stores: StoreSummary[]
  initial: FormState
  creating?: boolean
  onCancel: () => void
  onSubmit: (form: FormState) => Promise<unknown>
}) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(f => ({ ...f, [key]: value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSubmit(form)
    } catch (err) {
      setError(errorMessage(err, 'No se pudo guardar la tienda.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className={`${card} mb-6 space-y-4 p-5`}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Filter label="Nombre de la tienda">
          <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ej. Celulares Express" className={fieldClass} maxLength={80} />
        </Filter>
        <Filter label="Identificador (opcional)">
          <input value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="celulares-express" className={`${fieldClass} font-mono`} maxLength={40} />
        </Filter>
      </div>
      <Filter label="Dominios (uno por línea)">
        <textarea value={form.domains} onChange={e => set('domains', e.target.value)} rows={3} placeholder={'mitienda.com\notrodominio.co'} className={`${fieldClass} font-mono`} />
      </Filter>
      {creating && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Filter label="Contenido inicial">
            <select value={form.copyFrom} onChange={e => set('copyFrom', e.target.value)} className={fieldClass}>
              <option value="">Textos de ejemplo</option>
              {stores.map(s => <option key={s.id} value={s.id}>Copiar de "{s.name}"</option>)}
            </select>
          </Filter>
          {form.copyFrom && (
            <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-gray-300">
              <input type="checkbox" checked={form.copyProducts} onChange={e => set('copyProducts', e.target.checked)} className="h-4 w-4 accent-blue-600" />
              Copiar también el catálogo de servicios
            </label>
          )}
        </div>
      )}
      {creating && <p className="text-xs text-gray-500">Los clientes, saldos, recargas y pedidos nunca se copian: la tienda nueva empieza vacía. Después podrás cambiar textos, colores, contacto y datos de pago en "Contenido".</p>}
      {error && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>}
      <div className="flex gap-2">
        <button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"><Check size={16} /> {saving ? 'Guardando…' : 'Guardar'}</button>
        <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm hover:border-gray-500"><X size={16} /> Cancelar</button>
      </div>
    </form>
  )
}
