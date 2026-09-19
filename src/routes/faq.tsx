import { createFileRoute, Link } from '@tanstack/react-router'

const faqs = [
  {
    question: '¿Qué tipo de servicios ofrecen?',
    answer: 'Ofrecemos servicios digitales, gestión de pedidos, atención al cliente y soluciones personalizadas para clientes y administradores.',
  },
  {
    question: '¿Necesito una cuenta para comprar?',
    answer: 'Sí, para realizar pedidos y recargas debes crear una cuenta e iniciar sesión.',
  },
  {
    question: '¿Cuánto tarda la atención?',
    answer: 'La atención depende del servicio solicitado, pero normalmente respondemos y gestionamos la solicitud con rapidez.',
  },
]

export const Route = createFileRoute('/faq')({
  component: FaqPage,
})

function FaqPage() {
  return (
    <div className="min-h-screen bg-black text-white px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <Link to="/" className="mb-8 inline-flex items-center text-blue-400 hover:text-blue-300">
          ← Volver al inicio
        </Link>

        <h1 className="mb-8 text-4xl font-black">Preguntas frecuentes</h1>

        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="text-xl font-bold text-white">{faq.question}</h2>
              <p className="mt-3 text-gray-300">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
