import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { balanceTransactions, orders, products, profiles, topups } from '../../db/schema.js'
import { requireAdmin, requireUser } from './auth'
import { productImages } from './files'

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

export type OrderDTO = { id: number; userId: string; productName: string; price: number; status: string; createdAt: string }

export type SessionDTO = {
  id: string
  email: string
  username: string
  balance: number
  isAdmin: boolean
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
    return { id: profile.id, email: profile.email, username: profile.username, balance: profile.balance, isAdmin }
  } catch {
    return null
  }
})

export const listActiveProducts = createServerFn({ method: 'GET' }).handler(async () => {
  const rows = await db.select().from(products).where(eq(products.active, true)).orderBy(desc(products.createdAt))
  return rows.map(toProduct)
})

export const createOrder = createServerFn({ method: 'POST' })
  .inputValidator((data: { productId: number }) => ({ productId: positiveInt(data?.productId, 'El servicio') }))
  .handler(async ({ data }) => {
    const { profile } = await requireUser()
    return db.transaction(async tx => {
      const [product] = await tx
        .select()
        .from(products)
        .where(and(eq(products.id, data.productId), eq(products.active, true)))
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
        .values({ userId: profile.id, productId: product.id, productName: product.name, price: product.price })
        .returning()
      await tx.insert(balanceTransactions).values({
        userId: profile.id,
        amount: -product.price,
        type: 'pedido',
        description: `Pedido #${order.id}: ${product.name}`,
      })
      return { order: toOrder(order), balance: updated.balance }
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
    profile: { id: profile.id, email: profile.email, username: profile.username, balance: profile.balance, isAdmin },
    orders: myOrders.map(toOrder),
    topups: myTopups.map(t => ({ ...t, createdAt: t.createdAt.toISOString() })),
  }
})

/* ---------------------------------- Admin ---------------------------------- */

export const getAdminData = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const [clients, transactions, allOrders, pendingTopups] = await Promise.all([
    db.select().from(profiles).orderBy(desc(profiles.createdAt)),
    db.select().from(balanceTransactions).orderBy(desc(balanceTransactions.createdAt)).limit(100),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(200),
    db.select().from(topups).where(eq(topups.status, 'pending')).orderBy(desc(topups.createdAt)),
  ])
  return {
    clients: clients.map(c => ({ id: c.id, email: c.email, username: c.username, balance: c.balance, createdAt: c.createdAt.toISOString() })),
    transactions: transactions.map(t => ({ ...t, createdAt: t.createdAt.toISOString() })),
    orders: allOrders.map(toOrder),
    topups: pendingTopups.map(t => ({
      id: t.id,
      userId: t.userId,
      amount: t.amount,
      status: t.status,
      proofUrl: `/api/proofs/${t.proofKey}`,
      createdAt: t.createdAt.toISOString(),
    })),
  }
})

export const adminChangeBalance = createServerFn({ method: 'POST' })
  .inputValidator((data: { userId: string; amount: number; type: 'recarga' | 'descuento'; description?: string }) => {
    if (typeof data?.userId !== 'string' || !data.userId) throw new Error('Cliente no válido.')
    if (data.type !== 'recarga' && data.type !== 'descuento') throw new Error('Tipo de movimiento no válido.')
    const amount = positiveInt(data.amount, 'El monto')
    if (amount > MAX_AMOUNT) throw new Error('El monto máximo por movimiento es de $2.000.000 COP.')
    return { userId: data.userId, amount, type: data.type, description: (data.description ?? '').trim().slice(0, 200) }
  })
  .handler(async ({ data }) => {
    await requireAdmin()
    return db.transaction(async tx => {
      const delta = data.type === 'recarga' ? data.amount : -data.amount
      const conditions = [eq(profiles.id, data.userId)]
      if (data.type === 'descuento') conditions.push(gte(profiles.balance, data.amount))
      const [updated] = await tx
        .update(profiles)
        .set({ balance: sql`${profiles.balance} + ${delta}` })
        .where(and(...conditions))
        .returning({ balance: profiles.balance })
      if (!updated) throw new Error(data.type === 'descuento' ? 'El descuento no puede ser mayor al saldo disponible.' : 'Cliente no encontrado.')
      await tx.insert(balanceTransactions).values({
        userId: data.userId,
        amount: delta,
        type: data.type,
        description: data.description || (data.type === 'recarga' ? 'Recarga manual' : 'Descuento manual'),
      })
      return { balance: updated.balance }
    })
  })

export const adminReviewTopup = createServerFn({ method: 'POST' })
  .inputValidator((data: { topupId: number; approve: boolean }) => ({ topupId: positiveInt(data?.topupId, 'La recarga'), approve: Boolean(data?.approve) }))
  .handler(async ({ data }) => {
    await requireAdmin()
    return db.transaction(async tx => {
      const [topup] = await tx
        .update(topups)
        .set({ status: data.approve ? 'approved' : 'rejected' })
        .where(and(eq(topups.id, data.topupId), eq(topups.status, 'pending')))
        .returning()
      if (!topup) throw new Error('Esta recarga ya fue revisada.')
      if (data.approve) {
        await tx.update(profiles).set({ balance: sql`${profiles.balance} + ${topup.amount}` }).where(eq(profiles.id, topup.userId))
        await tx.insert(balanceTransactions).values({
          userId: topup.userId,
          amount: topup.amount,
          type: 'recarga',
          description: `Recarga aprobada #${topup.id}`,
        })
      }
      return { ok: true }
    })
  })

export const adminSetOrderStatus = createServerFn({ method: 'POST' })
  .inputValidator((data: { orderId: number; status: string }) => {
    if (!ORDER_STATUSES.includes(data?.status as (typeof ORDER_STATUSES)[number])) throw new Error('Estado no válido.')
    return { orderId: positiveInt(data.orderId, 'El pedido'), status: data.status }
  })
  .handler(async ({ data }) => {
    await requireAdmin()
    const [order] = await db.update(orders).set({ status: data.status }).where(eq(orders.id, data.orderId)).returning()
    if (!order) throw new Error('Pedido no encontrado.')
    return toOrder(order)
  })

export const adminListProducts = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const rows = await db.select().from(products).orderBy(desc(products.createdAt))
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
    await requireAdmin()
    const values = { name: data.name, description: data.description, price: data.price, imageKey: data.imageKey, active: data.active }
    if (data.id) {
      const [previous] = await db.select({ imageKey: products.imageKey }).from(products).where(eq(products.id, data.id))
      if (!previous) throw new Error('Servicio no encontrado.')
      const [row] = await db.update(products).set({ ...values, updatedAt: new Date() }).where(eq(products.id, data.id)).returning()
      if (previous.imageKey && previous.imageKey !== data.imageKey) await productImages().delete(previous.imageKey)
      return toProduct(row)
    }
    const [row] = await db.insert(products).values(values).returning()
    return toProduct(row)
  })

export const adminToggleProduct = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: number; active: boolean }) => ({ id: positiveInt(data?.id, 'El servicio'), active: Boolean(data?.active) }))
  .handler(async ({ data }) => {
    await requireAdmin()
    const [row] = await db.update(products).set({ active: data.active, updatedAt: new Date() }).where(eq(products.id, data.id)).returning()
    if (!row) throw new Error('Servicio no encontrado.')
    return toProduct(row)
  })

export const adminDeleteProduct = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: number }) => ({ id: positiveInt(data?.id, 'El servicio') }))
  .handler(async ({ data }) => {
    await requireAdmin()
    const [row] = await db.delete(products).where(eq(products.id, data.id)).returning()
    if (row?.imageKey) await productImages().delete(row.imageKey)
    return { ok: true }
  })
