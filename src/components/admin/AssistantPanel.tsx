import { useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Bot, Check, Send, Sparkles, X } from 'lucide-react'
import { errorMessage } from '../../lib/session'
import { adminApplyAssistantChange, adminAssistantChat } from '../../server/assistant.functions'

type Proposal = { summary: string; patch: string; preview: string[] }
type Message = { role: 'user' | 'assistant'; content: string; proposal?: Proposal | null; applied?: boolean }

const SECTION_LABELS: Record<string, string> = {
  brand: 'Marca', theme: 'Color', contact: 'Contacto', payments: 'Pagos', announcement: 'Anuncio', hero: 'Portada',
  steps: 'Pasos', catalog: 'Catálogo', why: 'Por qué nosotros', values: 'Ventajas', contactSection: 'Sección de contacto',
  footer: 'Pie de página', faq: 'Preguntas frecuentes', faqContact: 'Cierre de preguntas',
}

const EXAMPLES = [
  '¿Cómo van las ventas este mes y qué servicios se venden más?',
  'Revisa si hay movimientos o comprobantes sospechosos',
  'Explica por qué el cliente juan@correo.com tiene ese saldo',
  'Recomiéndame una promoción según las ventas',
  '¿Hay información contradictoria o errores en la página?',
  'Mejora los textos comerciales de la portada',
  'Crea 3 preguntas frecuentes nuevas útiles para mis clientes',
  'Recomienda mejoras de diseño para la página',
]

export function AssistantPanel({ notify }: { notify: (kind: 'success' | 'error', text: string) => void }) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [applying, setApplying] = useState<number | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, thinking])

  async function send(text: string) {
    const content = text.trim()
    if (!content || thinking) return
    const next: Message[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    setThinking(true)
    try {
      const result = await adminAssistantChat({ data: { messages: next.map(m => ({ role: m.role, content: m.content })) } })
      setMessages([...next, { role: 'assistant', content: result.reply, proposal: result.proposal }])
    } catch (error) {
      setMessages([...next, { role: 'assistant', content: errorMessage(error, 'El asistente no respondió. Intenta de nuevo.') }])
    } finally {
      setThinking(false)
    }
  }

  async function apply(index: number) {
    const proposal = messages[index]?.proposal
    if (!proposal) return
    if (!window.confirm(`¿Publicar este cambio en la página?\n\n${proposal.summary}\n\nSecciones: ${proposal.preview.map(k => SECTION_LABELS[k] ?? k).join(', ')}`)) return
    setApplying(index)
    try {
      await adminApplyAssistantChange({ data: { patch: proposal.patch, summary: proposal.summary } })
      await router.invalidate()
      setMessages(ms => ms.map((m, i) => (i === index ? { ...m, applied: true } : m)))
      notify('success', 'Cambio publicado. Puedes deshacerlo desde Contenido › Historial de versiones.')
    } catch (error) {
      notify('error', errorMessage(error, 'No se pudo aplicar el cambio.'))
    } finally {
      setApplying(null)
    }
  }

  function discard(index: number) {
    setMessages(ms => ms.map((m, i) => (i === index ? { ...m, proposal: null, content: `${m.content}\n\n(Descartado)` } : m)))
  }

  return (
    <section className="flex h-[calc(100vh-14rem)] min-h-[480px] flex-col">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-3xl font-bold"><Sparkles className="text-blue-400" /> Asistente IA</h1>
        <p className="text-sm text-gray-400">Solo para administradores. Analiza ventas, saldos y riesgos, y propone cambios de contenido que nada publica hasta que pulses "Aplicar". Por seguridad no puede aprobar pagos, modificar saldos ni borrar registros.</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-gray-800 bg-gray-950 p-5">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-gray-400">Prueba con algo como:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map(ex => (
                <button key={ex} onClick={() => void send(ex)} className="rounded-lg border border-gray-800 px-3 py-2 text-left text-sm text-gray-300 hover:border-gray-600">{ex}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'assistant' && <Bot size={20} className="mt-1 shrink-0 text-blue-400" />}
            <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-200'}`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.proposal && (
                <div className="mt-3 rounded-lg border border-gray-700 bg-black/40 p-3">
                  <p className="font-semibold">{m.proposal.summary}</p>
                  <p className="mt-1 text-xs text-gray-400">Secciones afectadas: {m.proposal.preview.map(k => SECTION_LABELS[k] ?? k).join(', ')}</p>
                  {m.applied ? (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-green-400"><Check size={14} /> Aplicado</p>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <button disabled={applying !== null} onClick={() => void apply(i)} className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 font-semibold text-white hover:bg-green-700 disabled:opacity-50"><Check size={14} /> {applying === i ? 'Aplicando…' : 'Aplicar'}</button>
                      <button disabled={applying !== null} onClick={() => discard(i)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 hover:border-gray-500"><X size={14} /> Descartar</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {thinking && <p className="flex items-center gap-2 text-sm text-gray-500"><Bot size={18} className="animate-pulse text-blue-400" /> Pensando…</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={e => { e.preventDefault(); void send(input) }} className="mt-4 flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Pregunta por tu negocio o pide un cambio en la página" className="flex-1 rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 focus:border-blue-500 focus:outline-none" />
        <button disabled={thinking || !input.trim()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"><Send size={16} /> Enviar</button>
      </form>
    </section>
  )
}
