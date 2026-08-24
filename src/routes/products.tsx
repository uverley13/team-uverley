import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ArrowLeft,
  Upload,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/products')({
  component: ProductsPage,
})

type Product = {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  active: boolean
  created_at: string
  updated_at: string
}

function ProductsPage() {
  const navigate = useNavigate()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [currentImage, setCurrentImage] = useState<string | null>(null)

  useEffect(() => {
    checkAdmin()
  }, [])

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      navigate({ to: '/login' })
      return
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error || !profile || profile.role !== 'admin') {
      navigate({ to: '/' })
      return
    }

    await loadProducts()
  }

  async function loadProducts() {
    setLoading(true)

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      alert('No se pudieron cargar los productos: ' + error.message)
    } else {
      setProducts(data ?? [])
    }

    setLoading(false)
  }

  function clearForm() {
    setEditingId(null)
    setName('')
    setDescription('')
    setPrice('')
    setImageFile(null)
    setCurrentImage(null)
  }

  function editProduct(product: Product) {
    setEditingId(product.id)
    setName(product.name)
    setDescription(product.description ?? '')
    setPrice(String(product.price))
    setCurrentImage(product.image_url)
    setImageFile(null)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function uploadImage(file: File) {
    const extension =
      file.name.split('.').pop()?.toLowerCase() || 'jpg'

    const fileName = `${crypto.randomUUID()}.${extension}`

    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      throw new Error(
        'No se pudo subir la imagen: ' + error.message
      )
    }

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName)

    return data.publicUrl
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      alert('Escribe el nombre del producto.')
      return
    }

    const numericPrice = Number(price)

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      alert('Escribe un precio válido.')
      return
    }

    setSaving(true)

    try {
      let imageUrl = currentImage

      if (imageFile) {
        imageUrl = await uploadImage(imageFile)
      }

      if (editingId) {
        const { error } = await supabase
          .from('products')
          .update({
            name: name.trim(),
            description: description.trim(),
            price: numericPrice,
            image_url: imageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId)

        if (error) {
          throw new Error(error.message)
        }

        alert('Producto actualizado correctamente.')
      } else {
        const { error } = await supabase
          .from('products')
          .insert({
            name: name.trim(),
            description: description.trim(),
            price: numericPrice,
            image_url: imageUrl,
            active: true,
          })

        if (error) {
          throw new Error(error.message)
        }

        alert('Producto creado correctamente.')
      }

      clearForm()
      await loadProducts()
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Ocurrió un error inesperado.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function toggleProduct(product: Product) {
    const { error } = await supabase
      .from('products')
      .update({
        active: !product.active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', product.id)

    if (error) {
      alert(
        'No se pudo cambiar el estado: ' + error.message
      )
      return
    }

    await loadProducts()
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar "${product.name}"?`
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id)

    if (error) {
      alert(
        'No se pudo eliminar el producto: ' + error.message
      )
      return
    }

    await loadProducts()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">
          Cargando productos...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <Link
              to="/dashboard"
              className="text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"
            >
              Team Uverley
            </Link>

            <p className="text-gray-400 text-sm">
              Administrar productos
            </p>
          </div>

          <Link
            to="/dashboard"
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm"
          >
            <ArrowLeft size={16} />
            Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 mb-10">
          <h1 className="text-3xl font-black mb-2">
            {editingId
              ? 'Editar producto'
              : 'Agregar producto'}
          </h1>

          <p className="text-gray-400 mb-6">
            Administra los productos que aparecen en tu página.
          </p>

          <form
            onSubmit={saveProduct}
            className="space-y-4"
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del producto"
              className="w-full bg-gray-800 border border-gray-700 text-white p-4 rounded-lg"
              required
            />

            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="Descripción"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 text-white p-4 rounded-lg"
            />

            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              min="0"
              step="0.01"
              placeholder="Precio"
              className="w-full bg-gray-800 border border-gray-700 text-white p-4 rounded-lg"
              required
            />

            <div className="border border-gray-700 rounded-lg p-4">
              <label className="flex items-center gap-2 text-gray-300 mb-3">
                <Upload size={18} />
                Imagen del producto
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setImageFile(
                    e.target.files?.[0] ?? null
                  )
                }
                className="w-full text-gray-300"
              />

              {currentImage && (
                <img
                  src={currentImage}
                  alt="Imagen actual"
                  className="mt-4 w-32 h-32 object-cover rounded-lg border border-gray-700"
                />
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-4 rounded-lg font-bold flex items-center justify-center gap-2"
              >
                <Plus size={20} />

                {saving
                  ? 'Guardando...'
                  : editingId
                    ? 'Guardar cambios'
                    : 'Agregar producto'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={clearForm}
                  className="bg-gray-700 hover:bg-gray-600 px-6 rounded-lg font-bold"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <h2 className="text-2xl font-black mb-6">
          Productos existentes
        </h2>

        {products.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center text-gray-400">
            Todavía no hay productos.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
              >
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-800 flex items-center justify-center text-gray-500">
                    Sin imagen
                  </div>
                )}

                <div className="p-5">
                  <div className="flex justify-between items-start gap-3">
                    <h3 className="text-xl font-bold">
                      {product.name}
                    </h3>

                    {product.active ? (
                      <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded">
                        Activo
                      </span>
                    ) : (
                      <span className="text-xs bg-red-900 text-red-300 px-2 py-1 rounded">
                        Inactivo
                      </span>
                    )}
                  </div>

                  <p className="text-gray-400 text-sm mt-2 min-h-10">
                    {product.description}
                  </p>

                  <p className="text-green-400 text-2xl font-black mt-4">
                    ${product.price}
                  </p>

                  <div className="grid grid-cols-3 gap-2 mt-5">
                    <button
                      onClick={() => editProduct(product)}
                      className="bg-blue-600 hover:bg-blue-700 p-3 rounded-lg flex justify-center"
                      title="Editar"
                    >
                      <Pencil size={18} />
                    </button>

                    <button
                      onClick={() =>
                        toggleProduct(product)
                      }
                      className="bg-gray-700 hover:bg-gray-600 p-3 rounded-lg flex justify-center"
                      title={
                        product.active
                          ? 'Desactivar'
                          : 'Activar'
                      }
                    >
                      {product.active ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>

                    <button
                      onClick={() =>
                        deleteProduct(product)
                      }
                      className="bg-red-700 hover:bg-red-800 p-3 rounded-lg flex justify-center"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
