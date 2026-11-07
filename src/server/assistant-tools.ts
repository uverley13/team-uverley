// Server-only, READ-ONLY tools for the admin AI assistant. None of these can
// approve payments, change balances or delete anything: they only read data.
import type Anthropic from '@anthropic-ai/sdk'
import { and, desc, eq, gte, ilike, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { adminNotifications, balanceTransactions, orders, products, profiles, topups } from '../../db/schema.js'
import { computeStats } from './stats'

export const READ_TOOLS: Anthropic.Tool[] = [
  {
    name: 'consultar_estadisticas',
    description: 'Estadísticas del negocio: recargas (aprobadas, pendientes), ventas del día/semana/mes, pedidos, clientes, servicios más vendidos y ventas diarias de los últimos 30 días. Montos en pesos colombianos.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'listar_servicios',
    description: 'Lista los servicios del catálogo con precio y si están activos.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'buscar_cliente',
    description: 'Busca clientes por correo, nombre o ID. Devuelve hasta 8 con su saldo y fecha de registro.',
    input_schema: { type: 'object', properties: { texto: { type: 'string' } }, required: ['texto'] },
  },
  {
    name: 'explicar_saldo',
    description: 'Historial financiero completo de un cliente (por ID): saldo actual, cada movimiento con saldo anterior y resultante, recargas y pedidos. Úsalo para explicar por qué un cliente tiene su saldo.',
    input_schema: { type: 'object', properties: { cliente_id: { type: 'string' } }, required: ['cliente_id'] },
  },
  {
    name: 'detectar_movimientos_sospechosos',
    description: 'Revisa señales de riesgo: comprobantes con la misma imagen o referencia, muchas recargas de un mismo cliente, ajustes manuales grandes, saldos que no cuadran con su historial y bloqueos de inicio de sesión.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'revisar_errores',
    description: 'Últimos errores y avisos de seguridad registrados por el sistema (copias de seguridad fallidas, publicaciones fallidas, bloqueos, comprobantes duplicados).',
    input_schema: { type: 'object', properties: {} },
  },
]

const day = (d: Date) => d.toISOString()

async function explainBalance(siteId: number, id: string) {
  const [p] = await db.select().from(profiles).where(and(eq(profiles.id, id), eq(profiles.siteId, siteId)))
  if (!p) return { error: 'Cliente no encontrado. Usa buscar_cliente para obtener el ID.' }
  const [movements, clientTopups, clientOrders] = await Promise.all([
    db.select().from(balanceTransactions).where(eq(balanceTransactions.userId, id)).orderBy(desc(balanceTransactions.createdAt)).limit(150),
    db.select({ id: topups.id, amount: topups.amount, status: topups.status, reference: topups.reference, createdAt: topups.createdAt, reviewedBy: topups.reviewedByEmail }).from(topups).where(eq(topups.userId, id)).orderBy(desc(topups.createdAt)).limit(50),
    db.select({ id: orders.id, product: orders.productName, price: orders.price, status: orders.status, createdAt: orders.createdAt }).from(orders).where(eq(orders.userId, id)).orderBy(desc(orders.createdAt)).limit(50),
  ])
  const [{ sum }] = await db.select({ sum: sql<number>`coalesce(sum(${balanceTransactions.amount}), 0)::bigint` }).from(balanceTransactions).where(eq(balanceTransactions.userId, id))
  return {
    cliente: { id: p.id, email: p.email, nombre: p.username, saldo: p.balance, suspendido: p.suspended, registrado: day(p.createdAt) },
    suma_de_movimientos: Number(sum),
    cuadra: Number(sum) === p.balance,
    movimientos: movements.map(m => ({ id: m.id, fecha: day(m.createdAt), tipo: m.type, monto: m.amount, saldo_anterior: m.balanceBefore, saldo_resultante: m.balanceAfter, motivo: m.reason ?? m.description, admin: m.adminEmail, referencia: m.reference })),
    recargas: clientTopups.map(t => ({ ...t, createdAt: day(t.createdAt) })),
    pedidos: clientOrders.map(o => ({ ...o, createdAt: day(o.createdAt) })),
  }
}

async function suspicious(siteId: number) {
  const since = new Date(Date.now() - 30 * 86_400_000)
  const mismatched = await db.execute(sql`select p.id, p.email, p.balance, coalesce(sum(t.amount), 0)::bigint as ledger from ${profiles} p left join ${balanceTransactions} t on t.user_id = p.id where p.site_id = ${siteId} group by p.id having p.balance <> coalesce(sum(t.amount), 0) limit 20`)
  const [dupHashes, dupRefs, frequent, bigAdjustments, security] = await Promise.all([
    db.select({ hash: topups.proofHash, ids: sql<number[]>`array_agg(${topups.id})`, users: sql<string[]>`array_agg(distinct ${topups.userId})` }).from(topups).where(and(eq(topups.siteId, siteId), isNotNull(topups.proofHash))).groupBy(topups.proofHash).having(sql`count(*) > 1`).limit(20),
    db.select({ ref: topups.reference, ids: sql<number[]>`array_agg(${topups.id})`, users: sql<string[]>`array_agg(distinct ${topups.userId})` }).from(topups).where(and(eq(topups.siteId, siteId), isNotNull(topups.reference))).groupBy(topups.reference).having(sql`count(*) > 1`).limit(20),
    db.select({ userId: topups.userId, email: profiles.email, count: sql<number>`count(*)::int`, total: sql<number>`sum(${topups.amount})::bigint`, rejected: sql<number>`count(*) filter (where ${topups.status} = 'rejected')::int` }).from(topups).leftJoin(profiles, eq(profiles.id, topups.userId)).where(and(eq(topups.siteId, siteId), gte(topups.createdAt, since))).groupBy(topups.userId, profiles.email).having(sql`count(*) >= 5 or count(*) filter (where ${topups.status} = 'rejected') >= 2`).limit(20),
    db.select({ id: balanceTransactions.id, userId: balanceTransactions.userId, amount: balanceTransactions.amount, admin: balanceTransactions.adminEmail, reason: balanceTransactions.reason, createdAt: balanceTransactions.createdAt }).from(balanceTransactions).where(and(eq(balanceTransactions.siteId, siteId), or(ilike(balanceTransactions.type, 'ajuste%'), inArray(balanceTransactions.type, ['descuento'])), gte(balanceTransactions.createdAt, since), sql`abs(${balanceTransactions.amount}) >= 200000`)).orderBy(desc(balanceTransactions.createdAt)).limit(20),
    db.select({ title: adminNotifications.title, body: adminNotifications.body, createdAt: adminNotifications.createdAt }).from(adminNotifications).where(and(or(eq(adminNotifications.siteId, siteId), isNull(adminNotifications.siteId)), eq(adminNotifications.kind, 'seguridad'), gte(adminNotifications.createdAt, since))).orderBy(desc(adminNotifications.createdAt)).limit(20),
  ])
  return {
    misma_imagen_varias_recargas: dupHashes,
    misma_referencia_varias_recargas: dupRefs,
    clientes_con_muchas_recargas_o_rechazos_30_dias: frequent.map(f => ({ ...f, total: Number(f.total) })),
    ajustes_manuales_grandes_30_dias: bigAdjustments.map(a => ({ ...a, createdAt: day(a.createdAt) })),
    saldos_que_no_cuadran_con_historial: (mismatched as unknown as { rows?: unknown[] }).rows ?? mismatched,
    eventos_de_seguridad_30_dias: security.map(e => ({ ...e, createdAt: day(e.createdAt) })),
  }
}

export async function runReadTool(siteId: number, name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'consultar_estadisticas':
      return computeStats(siteId)
    case 'listar_servicios':
      return db.select({ id: products.id, nombre: products.name, precio: products.price, activo: products.active, descripcion: products.description }).from(products).where(eq(products.siteId, siteId)).orderBy(desc(products.createdAt))
    case 'buscar_cliente': {
      const term = `%${String(input.texto ?? '').slice(0, 100).replace(/[%_\\]/g, '\\$&')}%`
      const rows = await db.select().from(profiles).where(and(eq(profiles.siteId, siteId), or(ilike(profiles.email, term), ilike(profiles.username, term), ilike(profiles.id, term)))).limit(8)
      return rows.map(p => ({ id: p.id, email: p.email, nombre: p.username, saldo: p.balance, suspendido: p.suspended, registrado: day(p.createdAt) }))
    }
    case 'explicar_saldo':
      return explainBalance(siteId, String(input.cliente_id ?? '').slice(0, 100))
    case 'detectar_movimientos_sospechosos':
      return suspicious(siteId)
    case 'revisar_errores': {
      const rows = await db.select().from(adminNotifications).where(and(or(eq(adminNotifications.siteId, siteId), isNull(adminNotifications.siteId)), inArray(adminNotifications.kind, ['error', 'seguridad']))).orderBy(desc(adminNotifications.createdAt)).limit(30)
      return rows.map(r => ({ tipo: r.kind, titulo: r.title, detalle: r.body, fecha: day(r.createdAt) }))
    }
    default:
      return { error: 'Herramienta no disponible.' }
  }
}
