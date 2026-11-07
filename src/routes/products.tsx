import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Eye, EyeOff, Pencil, Plus, Smartphone, Trash2, Upload, X } from 'lucide-react'
import { Logo } from '../components/Logo'
import { errorMessage, formatPrice, useSession } from '../lib/session'
import { adminDeleteProduct, adminListProducts, adminSaveProduct, adminToggleProduct, type ProductDTO } from '../server/store.functions'
import { pageTitle } from '../lib/site'

export const Route = createFileRoute('/products')({
  head: ({ matches }) => ({ meta: [{ title: pageTitle(matches, 'Servicios') }] }),
  component: ProductsPage,
})

const fieldClass = 'w-full rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 focus:border-blue-500 focus:outline-none'

function ProductsPage() {
  const navigate = useNavigate()
  const { session, ready } = useSession()
  const [products, setProducts] = useState<ProductDTO[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [currentImage, setCurrentImage] = useState<{ key: string; url: string } | null>(null)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!ready) return
    if (!session) navigate({ to: '/login' })
    else if (!session.isAdmin) navigate({ to: '/' })
    else void loadProducts()
  }, [ready, session?.id, session?.isAdmin])

  async function loadProducts() {
    try {
      setProducts(await adminListProducts())
    } catch (error) {
      setNotice({ kind: 'error', text: errorMessage(error, 'No se pudieron cargar los servicios.') })
    }
  }

  function clearForm() {
    setEditingId(null)
    setName('')
    setDescription('')
    setPrice('')
    setImageFile(null)
    setCurrentImage(null)
    const input = document.getElementById('image') as HTMLInputElement | null
    if (input) input.value = ''
  }

  function editProduct(product: ProductDTO) {
    setEditingId(product.id)
    setName(product.name)
    setDescription(product.description ?? '')
    setPrice(String(product.price))
    setImageFile(null)
    setCurrentImage(product.imageKey && product.imageUrl ? { key: product.imageKey, url: product.imageUrl } : null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function uploadImage(file: File) {
    const body = new FormData()
    body.set('image', file)
    const response = await fetch('/api/product-images', { method: 'POST', body })
    const result = (await response.json().catch(() => ({}))) as { key?: string; error?: string }
    if (!response.ok || !result.key) throw new Error(result.error || 'No se pudo subir la imagen.')
    return result.key
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault()
    setNotice(null)
    const numericPrice = Number(price.replace(/\D/g, ''))
    if (!name.trim()) return setNotice({ kind: 'error', text: 'Escribe el nombre del servicio.' })
    if (!numericPrice) return setNotice({ kind: 'error', text: 'Escribe un precio válido.' })
    setSaving(true)
    try {
      const imageKey = imageFile ? await uploadImage(imageFile) : currentImage?.key ?? null
      const existing = products?.find(p => p.id === editingId)
      await adminSaveProduct({
        data: { id: editingId ?? undefined, name, description, price: numericPrice, imageKey, active: existing?.active ?? true },
      })
      setNotice({ kind: 'success', text: editingId ? 'Servicio actualizado.' : 'Servicio creado y publicado.' })
      clearForm()
      await loadProducts()
    } catch (error) {
      setNotice({ kind: 'error', text: errorMessage(error, 'No se pudo guardar el servicio.') })
    } finally {
      setSaving(false)
    }
  }

  async function toggle(product: ProductDTO) {
    if (product.active && !window.confirm(`¿Ocultar "${product.name}"? Los clientes dejarán de verlo en el catálogo.`)) return
    try {
      const updated = await adminToggleProduct({ data: { id: product.id, active: !product.active } })
      setProducts(current => current?.map(p => (p.id === updated.id ? updated : p)) ?? null)
    } catch (error) {
      setNotice({ kind: 'error', text: errorMessage(error) })
    }
  }

  async function remove(product: ProductDTO) {
    if (!window.confirm(`¿Eliminar "${product.name}"? Los pedidos anteriores se conservan.`)) return
    try {
      await adminDeleteProduct({ data: { id: product.id } })
      if (editingId === product.id) clearForm()
      setProducts(current => current?.filter(p => p.id !== product.id) ?? null)
    } catch (error) {
      setNotice({ kind: 'error', text: errorMessage(error) })
    }
  }

  const filePreview = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile])
  useEffect(() => () => { if (filePreview) URL.revokeObjectURL(filePreview) }, [filePreview])
  const preview = filePreview ?? currentImage?.url

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <header className="border-b border-gray-900 bg-black/80 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3"><Logo /><span className="hidden rounded-md bg-blue-600/20 px-2 py-1 font-mono text-xs text-blue-300 sm:inline">servicios</span></div>
          <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-gray-800 px-4 py-2 text-sm hover:border-gray-600"><ArrowLeft size={16} /> Panel</Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[380px_1fr]">
        <form onSubmit={saveProduct} className="h-fit space-y-4 rounded-2xl border border-gray-800 bg-gray-950 p-6 lg:sticky lg:top-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{editingId ? 'Editar servicio' : 'Nuevo servicio'}</h1>
            {editingId && <button type="button" onClick={clearForm} className="text-gray-400 hover:text-gray-100" aria-label="Cancelar edición"><X size={18} /></button>}
          </div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del servicio" className={fieldClass} required />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción (qué incluye, tiempo estimado…)" rows={4} className={fieldClass} />
          <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Precio en COP" inputMode="numeric" className={fieldClass} required />
          <label htmlFor="image" className="flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-800 bg-gray-900 text-center hover:border-blue-500">
            {preview ? (
              <img src={preview} alt="Vista previa" className="h-40 w-full object-cover" />
            ) : (
              <div className="p-6"><Upload size={28} className="mx-auto mb-2 text-blue-400" /><p className="text-sm text-gray-400">Imagen del servicio (opcional, máx. 5 MB)</p></div>
            )}
            <input id="image" type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] ?? null)} />
          </label>
          {currentImage && !imageFile && <button type="button" onClick={() => setCurrentImage(null)} className="text-sm text-red-300 hover:text-red-200">Quitar imagen</button>}
          {notice && <p role="status" className={`rounded-lg border px-4 py-3 text-sm ${notice.kind === 'success' ? 'border-green-800 bg-green-900/40 text-green-200' : 'border-red-900 bg-red-950/50 text-red-300'}`}>{notice.text}</p>}
          <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
            <Plus size={18} /> {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear servicio'}
          </button>
        </form>

        <section>
          <h2 className="mb-5 text-2xl font-bold">Catálogo <span className="font-mono text-base text-gray-500">{products?.length ?? ''}</span></h2>
          {!products ? (
            <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
          ) : products.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-800 p-10 text-center text-gray-400">Aún no hay servicios. Crea el primero con el formulario.</p>
          ) : (
            <div className="space-y-3">
              {products.map(product => (
                <div key={product.id} className={`flex items-center gap-4 rounded-xl border bg-gray-950 p-3 ${product.active ? 'border-gray-800' : 'border-gray-900 opacity-60'}`}>
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-900">
                    {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Smartphone className="text-gray-700" /></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{product.name}</p>
                    <p className="font-mono text-sm text-green-400">{formatPrice(product.price)}</p>
                    <p className="text-xs text-gray-500">{product.active ? 'Visible en la tienda' : 'Oculto'}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => void toggle(product)} className="rounded-lg p-2.5 text-gray-400 hover:bg-gray-900 hover:text-gray-100" title={product.active ? 'Ocultar' : 'Mostrar'} aria-label={product.active ? 'Ocultar' : 'Mostrar'}>{product.active ? <Eye size={18} /> : <EyeOff size={18} />}</button>
                    <button onClick={() => editProduct(product)} className="rounded-lg p-2.5 text-gray-400 hover:bg-gray-900 hover:text-gray-100" title="Editar" aria-label="Editar"><Pencil size={18} /></button>
                    <button onClick={() => void remove(product)} className="rounded-lg p-2.5 text-red-400 hover:bg-red-950/50" title="Eliminar" aria-label="Eliminar"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
