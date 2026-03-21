import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Lock,
  Smartphone,
  CheckCircle,
  Zap,
  Shield,
  DollarSign,
  MessageCircle,
  Clock,
} from 'lucide-react'

export const Route = createFileRoute('/')({
  component: Home,
})

const WA_NUMBER = '+57TU-NUMERO'
const WA_BASE = `https://wa.me/${WA_NUMBER}?text=Hola%20Team%20Uverley%2C%20quiero%20información%20sobre%20bypass%20y%20servicios`

function waLink(service?: string) {
  if (!service) return WA_BASE
  return `https://wa.me/${WA_NUMBER}?text=Hola%20Team%20Uverley%2C%20quiero%20el%20servicio%20de%20${encodeURIComponent(service)}`
}

const services = [
  {
    title: 'Bypass iCloud Todos los iOS',
    description: 'iPhone 6s a 16 Pro Max - FMI OFF Raíz',
    price: 'Desde $12',
    icon: <Lock size={28} className="text-blue-400" />,
  },
  {
    title: 'Eliminación iCloud Permanente',
    description: 'Sin PC - Rápido 5-30 min',
    price: 'Desde $20',
    icon: <Shield size={28} className="text-purple-400" />,
  },
  {
    title: 'FRP Bypass Multimarca',
    description: 'Samsung, Huawei, Google, etc.',
    price: 'Desde $8',
    icon: <Smartphone size={28} className="text-blue-400" />,
  },
  {
    title: 'Liberación de Operador',
    description: 'AT&T, Movistar, Claro, etc.',
    price: 'Desde $15',
    icon: <Zap size={28} className="text-yellow-400" />,
  },
  {
    title: 'Check IMEI + Blacklist',
    description: 'Reporte completo GSA',
    price: 'Desde $5',
    icon: <CheckCircle size={28} className="text-green-400" />,
  },
]

const whyUs = [
  { icon: <Shield size={32} className="text-blue-400" />, title: '100% Seguro', desc: 'Proceso verificado y sin riesgos para tu dispositivo.' },
  { icon: <Zap size={32} className="text-yellow-400" />, title: 'Entrega Rápida', desc: 'Resultados en minutos u horas según el servicio.' },
  { icon: <DollarSign size={32} className="text-green-400" />, title: 'Precios Bajos', desc: 'Las tarifas más competitivas del mercado en 2026.' },
  { icon: <Clock size={32} className="text-purple-400" />, title: 'Soporte 24/7', desc: 'Atención permanente por WhatsApp todos los días.' },
]

function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="text-3xl font-black tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent shrink-0">
            Team Uverley
          </Link>

          {/* Nav - hidden on mobile */}
          <nav className="hidden md:flex items-center gap-8">
            {['Inicio', 'Servicios', 'Precios', 'Contacto'].map((item) => (
              <a
                key={item}
                href={item === 'Inicio' ? '#' : `#${item.toLowerCase()}`}
                className="text-white hover:text-blue-400 transition-colors font-medium"
              >
                {item}
              </a>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105 text-sm"
            >
              Iniciar Sesión
            </Link>
            {/* WhatsApp floating circle */}
            <a
              href={WA_BASE}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-full transition-all hover:scale-110 hover:shadow-lg hover:shadow-green-900/50 flex items-center justify-center"
              title="WhatsApp"
            >
              <MessageCircle size={20} />
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="min-h-screen flex items-center justify-center px-4 pt-24 bg-gradient-to-b from-black via-gray-950 to-black fade-in">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-6xl md:text-8xl font-black mb-6 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent leading-tight">
            Team Uverley<br />Servicios Elite 2026
          </h1>
          <p className="text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Bypass iCloud FMI OFF • Eliminación iCloud • FRP Bypass • Liberación Permanente • Check IMEI Blacklist • Soporte 24/7
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-xl text-xl font-bold shadow-lg shadow-blue-900/50 transition-all hover:scale-105 hover:shadow-blue-700/60"
            >
              Acceder al Panel
            </Link>
            <a
              href={WA_BASE}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white px-10 py-5 rounded-xl text-xl font-bold transition-all hover:scale-105 hover:shadow-lg hover:shadow-green-900/50 flex items-center justify-center gap-2"
            >
              <MessageCircle size={24} />
              Contactar por WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="servicios" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black text-center mb-4 text-white">
            Nuestros Servicios
          </h2>
          <p className="text-gray-400 text-center text-lg mb-14 max-w-2xl mx-auto">
            Soluciones profesionales para desbloqueo y bypass de dispositivos móviles
          </p>
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {services.map((svc) => (
              <div
                key={svc.title}
                className="bg-gray-900/70 border border-gray-800 rounded-2xl p-8 flex flex-col hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-900/40 transition-all hover:scale-105 group"
              >
                <div className="mb-4">{svc.icon}</div>
                <h3 className="text-xl font-bold mb-2 text-white group-hover:text-blue-300 transition-colors">{svc.title}</h3>
                <p className="text-gray-400 text-sm mb-4 flex-1">{svc.description}</p>
                <p className="text-3xl font-black text-green-400 mb-4">{svc.price}</p>
                <a
                  href={waLink(svc.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-3 text-sm font-semibold text-center transition-all hover:shadow-lg hover:shadow-blue-900/50"
                >
                  Pedir Servicio
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section id="precios" className="py-20 px-4 bg-gray-950/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-black text-center mb-14 text-white">
            ¿Por qué elegirnos?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {whyUs.map((item) => (
              <div
                key={item.title}
                className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 text-center hover:border-blue-500 hover:shadow-xl hover:shadow-blue-900/30 transition-all hover:scale-105"
              >
                <div className="flex justify-center mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold mb-2 text-white">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contacto" className="py-24 px-4 bg-gradient-to-b from-gray-950 to-black text-center">
        <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
          ¿Listo para desbloquear tu dispositivo?
        </h2>
        <p className="text-gray-400 text-xl mb-10 max-w-xl mx-auto">
          Contacta ahora y recibe atención inmediata por WhatsApp. Servicio disponible las 24 horas.
        </p>
        <a
          href={WA_BASE}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white px-14 py-6 rounded-2xl text-2xl font-black transition-all hover:scale-105 hover:shadow-2xl hover:shadow-green-900/60"
        >
          <MessageCircle size={32} />
          Escribir por WhatsApp
        </a>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-10 px-4 text-center border-t border-gray-800">
        <p className="text-gray-400 text-sm">
          © 2026 Team Uverley | WhatsApp {WA_NUMBER} | All rights reserved
        </p>
      </footer>
    </div>
  )
}
