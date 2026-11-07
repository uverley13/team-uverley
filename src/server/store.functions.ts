import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { balanceTransactions, orders, products, profiles, topups } from '../../db/schema.js'
import { logAdminAction, requireActiveUser, requireAdmin, requireUser } from './auth'
import { deleteProductImageIfUnused } from './files'
import { currentSiteId } from './tenant'
import { notifyAdmin } from './notify'

export const MIN_TOPUP = 20000
export const MAX_AMOUNT = 2000000
export const ORDER_STATUSES = ['pendiente', 'en proceso', 'completado', 'cancelado'] as const

export type ProductDTO = {
  id: number
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  imageKey: string | null
  active: boolean
}

export type OrderDTO = { id: number; userId: string; productName: string; price: number; status: string; createdAt: string; updatedAt: string }

export type SessionDTO = {
  id: string
  email: string
  username: string
  balance: number
  isAdmin: boolean
  suspended: boolean
} | null

function toProduct(row: typeof products.$inferSelect): ProductDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    imageKey: row.imageKey,
    imageUrl: row.imageKey ? `/api/images/${row.imageKey}` : null,
    active: row.active,
  }
}

function toOrder(row: typeof orders.$inferSelect): OrderDTO {
  return {
    id: row.id,
    userId: row.userId,
    productName: row.productName,
    price: row.price,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function positiveInt(value: unknown, field: string) {
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${field} no es válido.`)
  return n
}

/* ----------------------------- Public / customer ----------------------------- */

export const getSession = createServerFn({ method: 'GET' }).handler(async (): Promise<SessionDTO> => {
  try {
    const { profile, isAdmin } = await requireUser()
    return { id: profile.id, email: profile.email, username: profile.username, balance: profile.balance, isAdmin, suspended: profile.suspended }
  } catch {
    return null
  }
})

export const listActiveProducts = createServerFn({ method: 'GET' }).handler(async () => {
  const siteId = await currentSiteId()
  const rows = await db.select().from(products).where(and(eq(products.siteId, siteId), eq(products.active, true))).orderBy(desc(products.createdAt))
  return rows.map(toProduct)
})

export const createOrder = createServerFn({ method: 'POST' })
  .inputValidator((data: { productId: number }) => ({ productId: positiveInt(data?.productId, 'El servicio') }))
  .handler(async ({ data }) => {
    const { profile, siteId } = await requireActiveUser()
    return db.transaction(async tx => {
      const [product] = await tx
        .select()
        .from(products)
        .where(and(eq(products.id, data.productId), eq(products.siteId, siteId), eq(products.active, true)))
      if (!product) throw new Error('Este servicio ya no está disponible.')

      // Conditional update keeps the balance from going negative under concurrent orders.
      const [updated] = await tx
        .update(profiles)
        .set({ balance: sql`${profiles.balance} - ${product.price}` })
        .where(and(eq(profiles.id, profile.id), gte(profiles.balance, product.price)))
        .returning({ balance: profiles.balance })
      if (!updated) throw new Error('Saldo insuficiente. Recarga tu cuenta para pedir este servicio.')

      const [order] = await tx
        .insert(orders)
        .values({ siteId, userId: profile.id, productId: product.id, productName: product.name, price: product.price })
        .returning()
      await tx.insert(balanceTransactions).values({
        siteId,
        userId: profile.id,
        amount: -product.price,
        type: 'pedido',
        description: `Pedido #${order.id}: ${product.name}`,
        balanceBefore: updated.balance + product.price,
        balanceAfter: updated.balance,
        reason: 'Compra de servicio',
        reference: `order:${order.id}`,
      })
      return { order: toOrder(order), balance: updated.balance, productName: product.name }
    }).then(async result => {
      await notifyAdmin('pedido', `Nuevo pedido: ${result.productName}`, `${profile.email} pidió "${result.productName}" por $${result.order.price.toLocaleString('es-CO')} (pedido #${result.order.id}).`, 'pedidos')
      return { order: result.order, balance: result.balance }
    })
  })

export const getMyAccount = createServerFn({ method: 'GET' }).handler(async () => {
  const { profile, isAdmin } = await requireUser()
  const [myOrders, myTopups] = await Promise.all([
    db.select().from(orders).where(eq(orders.userId, profile.id)).orderBy(desc(orders.createdAt)),
    db
      .select({ id: topups.id, amount: topups.amount, status: topups.status, createdAt: topups.createdAt })
      .from(topups)
      .where(eq(topups.userId, profile.id))
      .orderBy(desc(topups.createdAt))
      .limit(10),
  ])
  return {
    profile: { id: profile.id, email: profile.email, username: profile.username, balance: profile.balance, isAdmin, suspended: profile.suspended },
    orders: myOrders.map(toOrder),
    topups: myTopups.map(t => ({ ...t, createdAt: t.createdAt.toISOString() })),
  }
})

/* ---------------------------------- Admin ---------------------------------- */

export const adminChangeBalance = createServerFn({ method: 'POST' })
  .inputValidator((data: { userId: string; amount: number; type: 'recarga' | 'descuento'; reason: string }) => {
    if (typeof data?.userId !== 'string' || !data.userId) throw new Error('Cliente no válido.')
    if (data.type !== 'recarga' && data.type !== 'descuento') throw new Error('Tipo de movimiento no válido.')
    const amount = positiveInt(data.amount, 'El monto')
    if (amount > MAX_AMOUNT) throw new Error('El monto máximo por movimiento es de $2.000.000 COP.')
    const reason = String(data.reason ?? '').trim().slice(0, 300)
    // Every manual adjustment must say why: it is part of the financial audit trail.
    if (reason.length < 5) throw new Error('Escribe el motivo del ajuste (mínimo 5 caracteres).')
    return { userId: data.userId, amount, type: data.type, reason }
  })
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    return db.transaction(async tx => {
      const delta = data.type === 'recarga' ? data.amount : -data.amount
      const conditions = [eq(profiles.id, data.userId), eq(profiles.siteId, admin.siteId)]
      if (data.type === 'descuento') conditions.push(gte(profiles.balance, data.amount))
      const [updated] = await tx
        .update(profiles)
        .set({ balance: sql`${profiles.balance} + ${delta}`, updatedAt: new Date() })
        .where(and(...conditions))
        .returning({ balance: profiles.balance, email: profiles.email })
      if (!updated) throw new Error(data.type === 'descuento' ? 'El descuento no puede ser mayor al saldo disponible.' : 'Cliente no encontrado.')
      const [movement] = await tx
        .insert(balanceTransactions)
        .values({
          siteId: admin.siteId,
          userId: data.userId,
          amount: delta,
          type: data.type === 'recarga' ? 'ajuste_credito' : 'ajuste_debito',
          description: data.type === 'recarga' ? 'Ajuste manual: saldo agregado' : 'Ajuste manual: saldo descontado',
          balanceBefore: updated.balance - delta,
          balanceAfter: updated.balance,
          adminId: admin.profile.id,
          adminEmail: admin.profile.email,
          reason: data.reason,
        })
        .returning({ id: balanceTransactions.id })
      await logAdminAction(tx, admin, {
        action: data.type === 'recarga' ? 'saldo.agregar' : 'saldo.descontar',
        summary: `${data.type === 'recarga' ? 'Agregó' : 'Descontó'} $${data.amount.toLocaleString('es-CO')} a ${updated.email}. Motivo: ${data.reason}`,
        targetType: 'client',
        targetId: data.userId,
        details: { amount: delta, balanceBefore: updated.balance - delta, balanceAfter: updated.balance, movementId: movement.id },
      })
      return { balance: updated.balance }
    })
  })

export const adminReviewTopup = createServerFn({ method: 'POST' })
  .inputValidator((data: { topupId: number; approve: boolean; note?: string }) => ({
    topupId: positiveInt(data?.topupId, 'La recarga'),
    approve: Boolean(data?.approve),
    note: String(data?.note ?? '').trim().slice(0, 300) || null,
  }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    return db.transaction(async tx => {
      // Only a pending top-up can be reviewed, so the same proof can never be credited twice.
      const [topup] = await tx
        .update(topups)
        .set({
          status: data.approve ? 'approved' : 'rejected',
          reviewedBy: admin.profile.id,
          reviewedByEmail: admin.profile.email,
          reviewedAt: new Date(),
          reviewNote: data.note,
          updatedAt: new Date(),
        })
        .where(and(eq(topups.id, data.topupId), eq(topups.siteId, admin.siteId), eq(topups.status, 'pending')))
        .returning()
      if (!topup) throw new Error('Esta recarga ya fue revisada por otro administrador o no existe.')

      let balanceAfter: number | null = null
      if (data.approve) {
        const [updated] = await tx
          .update(profiles)
          .set({ balance: sql`${profiles.balance} + ${topup.amount}`, updatedAt: new Date() })
          .where(eq(profiles.id, topup.userId))
          .returning({ balance: profiles.balance })
        balanceAfter = updated.balance
        await tx.insert(balanceTransactions).values({
          siteId: admin.siteId,
          userId: topup.userId,
          amount: topup.amount,
          type: 'recarga',
          description: `Recarga aprobada #${topup.id}`,
          balanceBefore: updated.balance - topup.amount,
          balanceAfter: updated.balance,
          adminId: admin.profile.id,
          adminEmail: admin.profile.email,
          reason: topup.reference ? `Comprobante con referencia ${topup.reference}` : 'Comprobante de pago aprobado',
          reference: `topup:${topup.id}`,
        })
      }
      await logAdminAction(tx, admin, {
        action: data.approve ? 'recarga.aprobar' : 'recarga.rechazar',
        summary: `${data.approve ? 'Aprobó' : 'Rechazó'} la recarga #${topup.id} por $${topup.amount.toLocaleString('es-CO')}${data.note ? `. Nota: ${data.note}` : ''}`,
        targetType: 'topup',
        targetId: topup.id,
        details: { userId: topup.userId, amount: topup.amount, reference: topup.reference, balanceAfter },
      })
      if (!data.approve) await notifyAdmin('rechazo', `Recarga #${topup.id} rechazada`, `${admin.profile.email} rechazó $${topup.amount.toLocaleString('es-CO')}${data.note ? `: ${data.note}` : ''}.`, 'recargas')
      return { ok: true }
    })
  })

export const adminSetOrderStatus = createServerFn({ method: 'POST' })
  .inputValidator((data: { orderId: number; status: string }) => {
    if (!ORDER_STATUSES.includes(data?.status as (typeof ORDER_STATUSES)[number])) throw new Error('Estado no válido.')
    return { orderId: positiveInt(data.orderId, 'El pedido'), status: data.status }
  })
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    return db.transaction(async tx => {
      const scope = and(eq(orders.id, data.orderId), eq(orders.siteId, admin.siteId))
      const [previous] = await tx.select({ status: orders.status }).from(orders).where(scope)
      if (!previous) throw new Error('Pedido no encontrado.')
      const [order] = await tx.update(orders).set({ status: data.status, updatedAt: new Date() }).where(scope).returning()
      await logAdminAction(tx, admin, {
        action: 'pedido.estado',
        summary: `Cambió el pedido #${order.id} de "${previous.status}" a "${data.status}"`,
        targetType: 'order',
        targetId: order.id,
        details: { from: previous.status, to: data.status, userId: order.userId },
      })
      return toOrder(order)
    })
  })

export const adminListProducts = createServerFn({ method: 'GET' }).handler(async () => {
  const admin = await requireAdmin()
  const rows = await db.select().from(products).where(eq(products.siteId, admin.siteId)).orderBy(desc(products.createdAt))
  return rows.map(toProduct)
})

export const adminSaveProduct = createServerFn({ method: 'POST' })
  .inputValidator((data: { id?: number; name: string; description?: string; price: number; imageKey?: string | null; active?: boolean }) => {
    const name = String(data?.name ?? '').trim()
    if (!name) throw new Error('Escribe el nombre del servicio.')
    const price = positiveInt(data.price, 'El precio')
    return {
      id: data.id ? positiveInt(data.id, 'El servicio') : undefined,
      name: name.slice(0, 120),
      description: String(data.description ?? '').trim().slice(0, 1000) || null,
      price,
      imageKey: data.imageKey && /^[A-Za-z0-9._-]+$/.test(data.imageKey) ? data.imageKey : null,
      active: data.active ?? true,
    }
  })
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const values = { name: data.name, description: data.description, price: data.price, imageKey: data.imageKey, active: data.active }
    if (data.id) {
      const scope = and(eq(products.id, data.id), eq(products.siteId, admin.siteId))
      const [previous] = await db.select().from(products).where(scope)
      if (!previous) throw new Error('Servicio no encontrado.')
      const [row] = await db.update(products).set({ ...values, updatedAt: new Date() }).where(scope).returning()
      if (previous.imageKey && previous.imageKey !== data.imageKey) await deleteProductImageIfUnused(previous.imageKey)
      await logAdminAction(db, admin, {
        action: 'servicio.editar',
        summary: `Editó el servicio "${row.name}"${previous.price !== row.price ? ` (precio de $${previous.price.toLocaleString('es-CO')} a $${row.price.toLocaleString('es-CO')})` : ''}`,
        targetType: 'product',
        targetId: row.id,
        details: { before: { name: previous.name, price: previous.price, active: previous.active }, after: { name: row.name, price: row.price, active: row.active } },
      })
      return toProduct(row)
    }
    const [row] = await db.insert(products).values({ ...values, siteId: admin.siteId }).returning()
    await logAdminAction(db, admin, { action: 'servicio.crear', summary: `Creó el servicio "${row.name}" ($${row.price.toLocaleString('es-CO')})`, targetType: 'product', targetId: row.id })
    return toProduct(row)
  })

export const adminToggleProduct = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: number; active: boolean }) => ({ id: positiveInt(data?.id, 'El servicio'), active: Boolean(data?.active) }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const [row] = await db.update(products).set({ active: data.active, updatedAt: new Date() }).where(and(eq(products.id, data.id), eq(products.siteId, admin.siteId))).returning()
    if (!row) throw new Error('Servicio no encontrado.')
    if (!data.active) await notifyAdmin('servicio', `Servicio no disponible: ${row.name}`, `${admin.profile.email} ocultó el servicio del catálogo.`, 'servicios')
    await logAdminAction(db, admin, { action: data.active ? 'servicio.activar' : 'servicio.ocultar', summary: `${data.active ? 'Activó' : 'Ocultó'} el servicio "${row.name}"`, targetType: 'product', targetId: row.id })
    return toProduct(row)
  })

export const adminDeleteProduct = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: number }) => ({ id: positiveInt(data?.id, 'El servicio') }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const [row] = await db.delete(products).where(and(eq(products.id, data.id), eq(products.siteId, admin.siteId))).returning()
    if (row?.imageKey) await deleteProductImageIfUnused(row.imageKey)
    if (row) await logAdminAction(db, admin, { action: 'servicio.eliminar', summary: `Eliminó el servicio "${row.name}"`, targetType: 'product', targetId: row.id, details: { name: row.name, price: row.price } })
    return { ok: true }
  })
