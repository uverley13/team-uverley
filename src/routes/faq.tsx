import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, ChevronDown, MessageCircle } from 'lucide-react'
import { Logo } from '../components/Logo'
import { pageTitle, useSite } from '../lib/site'
import { waLink } from '../lib/site-config'

export const Route = createFileRoute('/faq')({
  head: ({ matches }) => ({ meta: [{ title: pageTitle(matches, 'Preguntas frecuentes') }] }),
  component: FaqPage,
})

function FaqPage() {
  const site = useSite()
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
          {site.faq.map((faq, i) => {
            const isOpen = open === i
            return (
              <div key={i}>
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
            <p className="font-semibold">{site.faqContact.title}</p>
            <p className="mt-1 text-sm text-gray-400">{site.faqContact.text}</p>
          </div>
          <a href={waLink(site)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700">
            <MessageCircle size={18} /> Escribir
          </a>
        </div>
      </main>
    </div>
  )
}
