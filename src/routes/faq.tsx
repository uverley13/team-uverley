import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, ChevronDown, MessageCircle } from 'lucide-react'
import { Logo } from '../components/Logo'

const faqs = [
  {
    question: '¿Qué tipo de servicios ofrecen?',
    answer: 'Servicios técnicos y digitales para dispositivos móviles. En la página principal ves el catálogo actualizado con su precio; si tu caso no aparece, escríbenos por WhatsApp.',
  },
  {
    question: '¿Necesito una cuenta para pedir?',
    answer: 'Sí. La cuenta guarda tu saldo, tus recargas y el estado de cada pedido. Registrarte es gratis y solo pide un correo.',
  },
  {
    question: '¿Cómo recargo saldo?',
    answer: 'Desde "Mi cuenta" entra a "Recargar saldo", paga por Nequi al número indicado y sube la captura del comprobante. El saldo se acredita cuando el administrador valida el pago. La recarga mínima es de $20.000 COP.',
  },
  {
    question: '¿Cuánto tarda la atención?',
    answer: 'Depende del servicio. Las solicitudes se gestionan en orden de llegada y puedes revisar el estado en "Mis pedidos" en cualquier momento.',
  },
  {
    question: '¿Qué pasa si un pedido se cancela?',
    answer: 'Escríbenos por WhatsApp con el número de pedido y revisamos el caso para ajustar tu saldo.',
  },
]

export const Route = createFileRoute('/faq')({
  head: () => ({ meta: [{ title: 'Preguntas frecuentes · Servidor Uverley' }] }),
  component: FaqPage,
})

function FaqPage() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <header className="border-b border-gray-900 px-5 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo />
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100">
            <ArrowLeft size={16} /> Inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-16">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-blue-400">Ayuda</p>
        <h1 className="text-4xl font-bold md:text-5xl">Preguntas frecuentes</h1>

        <div className="mt-12 divide-y divide-gray-900 border-y border-gray-900">
          {faqs.map((faq, i) => {
            const isOpen = open === i
            return (
              <div key={faq.question}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 py-6 text-left"
                >
                  <span className="text-lg font-semibold">{faq.question}</span>
                  <ChevronDown size={20} className={`shrink-0 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
                </button>
                <div className={`grid transition-[grid-template-rows] duration-300 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <p className="pb-6 leading-relaxed text-gray-400">{faq.answer}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-5 rounded-2xl border border-gray-800 bg-gray-950 p-7 sm:flex-row sm:items-center">
          <div>
            <p className="font-semibold">¿No encontraste tu respuesta?</p>
            <p className="mt-1 text-sm text-gray-400">Te respondemos directamente por WhatsApp.</p>
          </div>
          <a href="https://wa.me/573172329884" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700">
            <MessageCircle size={18} /> Escribir
          </a>
        </div>
      </main>
    </div>
  )
}
