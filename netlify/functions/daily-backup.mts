import { createBackup } from '../../src/server/backup'
import { notifyAdmin } from '../../src/server/notify'

// Automatic daily copy of the whole store database (kept in Netlify Blobs, last 60 copies).
export default async () => {
  try {
    const result = await createBackup('automatica')
    console.log('Copia de seguridad creada:', result.key)
  } catch (error) {
    console.error('Falló la copia de seguridad automática:', error)
    await notifyAdmin('error', 'Falló la copia de seguridad automática', String((error as Error)?.message ?? error).slice(0, 300), undefined, null)
  }
}

export const config = { schedule: '@daily' }
