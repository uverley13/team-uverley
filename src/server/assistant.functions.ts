import { createServerFn } from '@tanstack/react-start'
import Anthropic from '@anthropic-ai/sdk'
import { DEFAULT_SITE, ICON_NAMES, mergeSite, THEMES } from '../lib/site-config'
import { requireAdmin } from './auth'
import { loadSite, storeSite } from './site'

/*
 * Admin-only AI assistant. It reads the current site content and proposes a
 * change; nothing is saved until the admin reviews it and presses "Aplicar".
 */

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const MODEL = 'claude-sonnet-5-5'

const SYSTEM = `Eres el asistente de administración de una tienda web en español (Colombia).
Ayudas al administrador a cambiar el contenido de su página: textos, marca, datos de contacto y de pago, color del tema, anuncio superior, pasos, ventajas y preguntas frecuentes.

Reglas:
- Responde siempre en español, breve y claro.
- Cuando el administrador pida un cambio, llama a la herramienta "proponer_cambios" con SOLO las secciones que cambian. Las listas (steps, values, faq) se envían completas porque reemplazan a la anterior.
- No inventes datos sensibles (números de cuenta, teléfonos, precios) que el administrador no haya dado; pregunta si faltan.
- Temas de color disponibles: ${Object.keys(THEMES).join(', ')}.
- Iconos disponibles para "values": ${ICON_NAMES.join(', ')}.
- "contact.whatsapp" es solo dígitos con indicativo (ej. 573001234567).
- Los servicios del catálogo (nombre, precio, imagen) no se editan aquí: indica que se gestionan en la página "Servicios" del panel.
- Si la petición no tiene que ver con la página, responde sin llamar a la herramienta.

Estructura de ejemplo del contenido (valores por defecto):
${JSON.stringify(DEFAULT_SITE)}`

const TOOL: Anthropic.Tool = {
  name: 'proponer_cambios',
  description: 'Propone un cambio parcial del contenido del sitio. El administrador lo revisará antes de aplicarlo.',
  input_schema: {
    type: 'object',
    properties: {
      resumen: { type: 'string', description: 'Resumen corto en español de lo que cambia.' },
      cambios: { type: 'object', description: 'Objeto parcial con la misma forma que el contenido del sitio, solo con las secciones que cambian.' },
    },
    required: ['resumen', 'cambios'],
  },
}

export const adminAssistantChat = createServerFn({ method: 'POST' })
  .inputValidator((data: { messages: ChatMessage[] }) => {
    if (!Array.isArray(data?.messages) || data.messages.length === 0) throw new Error('Escribe un mensaje.')
    const messages = data.messages.slice(-20).map(m => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: String(m.content ?? '').slice(0, 4000) || '…',
    }))
    if (messages[0].role !== 'user') messages.shift()
    if (!messages.length || messages[messages.length - 1].role !== 'user') throw new Error('Escribe un mensaje.')
    return { messages }
  })
  .handler(async ({ data }) => {
    await requireAdmin()
    const current = await loadSite()
    const anthropic = new Anthropic()
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: `${SYSTEM}\n\nContenido ACTUAL del sitio:\n${JSON.stringify(current)}`,
      tools: [TOOL],
      messages: data.messages,
    })

    let reply = ''
    let proposal: { summary: string; patch: string; preview: string[] } | null = null
    for (const block of response.content) {
      if (block.type === 'text') reply += block.text
      if (block.type === 'tool_use' && block.name === TOOL.name) {
        const input = block.input as { resumen?: string; cambios?: Record<string, unknown> }
        const patch = input.cambios && typeof input.cambios === 'object' ? input.cambios : {}
        const next = mergeSite(current, patch)
        const preview = Object.keys(next).filter(
          key => JSON.stringify((next as Record<string, unknown>)[key]) !== JSON.stringify((current as Record<string, unknown>)[key]),
        )
        if (preview.length) proposal = { summary: String(input.resumen ?? 'Cambios propuestos').slice(0, 300), patch: JSON.stringify(patch), preview }
      }
    }
    if (!reply.trim()) reply = proposal ? 'Preparé estos cambios. Revísalos y pulsa "Aplicar" para publicarlos.' : 'No encontré nada que cambiar. ¿Puedes darme más detalles?'
    return { reply: reply.trim(), proposal }
  })

export const adminApplyAssistantChange = createServerFn({ method: 'POST' })
  .inputValidator((data: { patch: string; summary: string }) => {
    let patch: unknown
    try {
      patch = JSON.parse(String(data?.patch ?? '{}'))
    } catch {
      throw new Error('El cambio propuesto no es válido.')
    }
    return { patch, summary: String(data?.summary ?? '').slice(0, 300) }
  })
  .handler(async ({ data }) => {
    const { profile } = await requireAdmin()
    const current = await loadSite()
    return storeSite(mergeSite(current, data.patch), { source: 'asistente', summary: data.summary || 'Cambio del asistente', by: profile.email })
  })
