import { publishDueDraft } from '../../src/server/site'
import { notifyAdmin } from '../../src/server/notify'

// Publishes the content draft when its scheduled date arrives. Runs every 5 minutes.
export default async () => {
  try {
    const draft = await publishDueDraft()
    if (draft) await notifyAdmin('servicio', 'Contenido programado publicado', `Se publicaron los cambios programados por ${draft.savedBy ?? 'un administrador'}.`, 'contenido')
  } catch (error) {
    console.error('No se pudo publicar el contenido programado:', error)
    await notifyAdmin('error', 'Falló la publicación programada', String((error as Error)?.message ?? error).slice(0, 300), 'contenido')
  }
}

export const config = { schedule: '*/5 * * * *' }
