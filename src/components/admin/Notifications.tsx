import { useEffect, useRef, useState } from 'react'
import { Bell, MessageCircle } from 'lucide-react'
import { formatDate } from '../../lib/session'
import { useSite } from '../../lib/site'
import { waLink } from '../../lib/site-config'
import { adminListNotifications, adminMarkNotificationsRead } from '../../server/admin.functions'

type Data = Awaited<ReturnType<typeof adminListNotifications>>

const DOT: Record<string, string> = { recarga: 'bg-blue-500', pedido: 'bg-green-500', rechazo: 'bg-red-500', servicio: 'bg-gray-400', error: 'bg-red-500', seguridad: 'bg-orange-500' }

/** Bell with unread count. Polls every 30 s and shows a browser notification for new events. */
export function Notifications({ onOpenLink, onNew }: { onOpenLink: (link: string) => void; onNew: () => void }) {
  const site = useSite()
  const [data, setData] = useState<Data | null>(null)
  const [open, setOpen] = useState(false)
  const lastId = useRef<number | null>(null)

  async function load() {
    try {
      const next = await adminListNotifications()
      const newest = next.items[0]?.id ?? 0
      if (lastId.current !== null && newest > lastId.current) {
        onNew()
        const fresh = next.items.filter(n => n.id > (lastId.current ?? 0))
        if ('Notification' in window && Notification.permission === 'granted') {
          for (const n of fresh.slice(0, 3)) new Notification(n.title, { body: n.body ?? undefined })
        }
      }
      lastId.current = newest
      setData(next)
    } catch {
      /* the bell is optional */
    }
  }

  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), 30_000)
    return () => clearInterval(t)
  }, [])

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && 'Notification' in window && Notification.permission === 'default') void Notification.requestPermission()
    if (next && data?.unread) {
      await adminMarkNotificationsRead().catch(() => {})
      setData(d => d && { unread: 0, items: d.items })
    }
  }

  return (
    <div className="relative">
      <button onClick={() => void toggle()} className="relative rounded-lg border border-gray-800 p-2.5 hover:border-gray-600" aria-label="Notificaciones" title="Notificaciones">
        <Bell size={18} />
        {!!data?.unread && <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 font-mono text-[10px] text-white">{data.unread > 99 ? '99+' : data.unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 max-h-[70vh] w-[22rem] overflow-y-auto rounded-xl border border-gray-800 bg-gray-950 shadow-2xl">
          <p className="border-b border-gray-900 px-4 py-3 font-semibold">Notificaciones</p>
          {!data?.items.length ? <p className="p-4 text-sm text-gray-500">Sin notificaciones.</p> : data.items.map(n => (
            <div key={n.id} className={`border-b border-gray-900 px-4 py-3 text-sm ${n.read ? '' : 'bg-blue-950/20'}`}>
              <button className="block w-full text-left" onClick={() => { if (n.link) { onOpenLink(n.link); setOpen(false) } }}>
                <p className="flex items-center gap-2 font-semibold"><span className={`h-2 w-2 shrink-0 rounded-full ${DOT[n.kind] ?? 'bg-gray-500'}`} />{n.title}</p>
                {n.body && <p className="mt-0.5 text-gray-400">{n.body}</p>}
              </button>
              <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                <span>{formatDate(n.createdAt)}</span>
                {site.contact.whatsapp && <a href={waLink(site, `${n.title}\n${n.body ?? ''}`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-green-400"><MessageCircle size={12} /> Enviar a WhatsApp</a>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
