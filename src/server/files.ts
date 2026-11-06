// Server-only helpers for files stored in Netlify Blobs.
import { getStore } from '@netlify/blobs'

export const productImages = () => getStore('product-images')
export const topupProofs = () => getStore('topup-proofs')

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
}

const CONTENT_TYPES: Record<string, string> = Object.fromEntries(
  Object.entries(EXTENSIONS).map(([type, ext]) => [ext, type]),
)

/** Validates an uploaded image and returns a safe storage key. */
export function imageKeyFor(file: File, prefix: string) {
  const ext = EXTENSIONS[file.type]
  if (!ext) throw new Error('El archivo debe ser una imagen JPG, PNG, WEBP, GIF o HEIC.')
  if (file.size > MAX_IMAGE_BYTES) throw new Error('La imagen no puede superar los 5 MB.')
  return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
}

export function isSafeKey(key: string) {
  return /^[A-Za-z0-9._-]+$/.test(key)
}

export async function serveBlob(store: ReturnType<typeof getStore>, key: string, cacheControl: string) {
  if (!isSafeKey(key)) return new Response('Not found', { status: 404 })
  const data = await store.get(key, { type: 'arrayBuffer' })
  if (!data) return new Response('Not found', { status: 404 })
  const ext = key.split('.').pop() ?? ''
  return new Response(data, {
    headers: {
      'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream',
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
