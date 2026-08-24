import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'

import { useState } from 'react'

import { MessageCircle, LogIn } from 'lucide-react'

import { supabase } from '../lib/supabase'



export const Route = createFileRoute('/login')({

  component: LoginPage,

})



const WA_LOGIN =

  'https://wa.me/+573172329884?text=Hola%20Team%20Uverley%2C%20quiero%20acceder%20al%20panel'



function LoginPage() {

  const navigate = useNavigate()

  const [email, setEmail] = useState('')

  const [password, setPassword] = useState('')

  const [remember, setRemember] = useState(false)

  const [error, setError] = useState('')

  const [loading, setLoading] = useState(false)



  async function handleSubmit(e: React.FormEvent) {

    e.preventDefault()

    setError('')

    setLoading(true)



    try {

      const { data, error: loginError } =

        await supabase.auth.signInWithPassword({

          email,

          password,

        })



      if (loginError) {

        setError('Correo o contraseña incorrectos.')

        return

      }



      if (!data.user) {

        setError('No se pudo iniciar sesión.')

        return

      }



      const { data: profile, error: profileError } = await supabase

        .from('profiles')

        .select('role')

        .eq('id', data.user.id)

        .single()



      if (profileError) {

        setError('No se encontró el perfil del usuario.')

        await supabase.auth.signOut()

        return

      }



      if (profile.role === 'admin') {

        navigate({ to: '/dashboard' })

      } else {

        navigate({ to: '/' })

      }

    } catch {

      setError('Ocurrió un error al iniciar sesión.')

    } finally {

      setLoading(false)

    }

  }



  return (

    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black flex items-center justify-center px-4 fade-in">

      <div className="bg-gray-900/80 border border-gray-700 rounded-3xl p-12 w-full max-w-md shadow-2xl shadow-black/70">

        <h2 className="text-4xl font-bold text-center mb-8 text-white">

          Iniciar Sesión

        </h2>



        <form onSubmit={handleSubmit} className="space-y-4">

          <input

            type="email"

            placeholder="Email"

            value={email}

            onChange={(e) => setEmail(e.target.value)}

            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 p-4 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"

            required

          />



          <input

            type="password"

            placeholder="Contraseña"

            value={password}

            onChange={(e) => setPassword(e.target.value)}

            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 p-4 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"

            required

          />



          <label className="flex items-center gap-2 text-gray-400 text-sm cursor-pointer">

            <input

              type="checkbox"

              checked={remember}

              onChange={(e) => setRemember(e.target.checked)}

              className="accent-blue-600 w-4 h-4"

            />

            Recordarme

          </label>



          {error && (

            <div className="bg-red-900/30 border border-red-700 text-red-300 p-3 rounded-lg text-sm">

              {error}

            </div>

          )}



          <button

            type="submit"

            disabled={loading}

            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-4 rounded-lg text-xl font-bold transition-all flex items-center justify-center gap-2"

          >

            <LogIn size={22} />

            {loading ? 'Iniciando...' : 'Entrar'}

          </button>

        </form>



        <div className="mt-6 text-center">

          <Link

            to="/register"

            className="text-gray-400 hover:text-white transition-colors text-sm"

          >

            ¿No tienes cuenta?{' '}

            <span className="text-blue-400 underline">Regístrate</span>

          </Link>

        </div>



        <div className="mt-6 border-t border-gray-700 pt-6">

          <a

            href={WA_LOGIN}

            target="_blank"

            rel="noopener noreferrer"

            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2"

          >

            <MessageCircle size={22} />

            Contactar por WhatsApp

          </a>

        </div>

      </div>

    </div>

  )

}
