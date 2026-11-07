import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, gte, ilike, inArray, isNull, lte, or, sql, type SQL } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { adminAuditLog, adminNotifications, balanceTransactions, orders, profiles, topups } from '../../db/schema.js'
import { logAdminAction, requireAdmin } from './auth'
import { createBackup, listBackups } from './backup'
import { computeStats } from './stats'

/*
 * Admin-only server functions for the dashboard: business statistics, payment
 * proofs, the financial ledger, customer management and the activity log.
 * Every function checks admin permissions on the server.
 */

// Colombia has no daylight saving time: UTC-5 all year.
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000

/** Parses a YYYY-MM-DD date (Bogotá time). `end` returns the last instant of that day. */
function parseDay(value: unknown, end = false) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const [y, m, d] = value.split('-').map(Number)
  const start = Date.UTC(y, m - 1, d) + BOGOTA_OFFSET_MS
  if (Number.isNaN(start)) return undefined
  return new Date(end ? start + 86_400_000 - 1 : start)
}

function optionalAmount(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined
}

function searchText(value: unknown) {
  return String(value ?? '').trim().slice(0, 100)
}

function like(value: string) {
  return `%${value.replace(/[%_\\]/g, '\\$&')}%`
}

const iso = (d: Date | null) => (d ? d.toISOString() : null)

/* --------------------------------- Dashboard -------------------------------- */

export const adminGetStats = createServerFn({ method: 'GET' }).handler(async () => {
  const admin = await requireAdmin()
  return computeStats(admin.siteId)
})

/* ------------------------------ Payment proofs ------------------------------ */

export type TopupFilters = {
  status?: 'pending' | 'approved' | 'rejected' | 'all'
  search?: string
  from?: string
  to?: string
  min?: number
  max?: number
}

export const adminListTopups = createServerFn({ method: 'GET' })
  .inputValidator((data: TopupFilters) => ({
    status: (['pending', 'approved', 'rejected', 'all'] as const).includes(data?.status as never) ? data.status! : 'pending',
    search: searchText(data?.search),
    from: parseDay(data?.from),
    to: parseDay(data?.to, true),
    min: optionalAmount(data?.min),
    max: optionalAmount(data?.max),
  }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const conditions: SQL[] = [eq(topups.siteId, admin.siteId)]
    if (data.status !== 'all') conditions.push(eq(topups.status, data.status))
    if (data.from) conditions.push(gte(topups.createdAt, data.from))
    if (data.to) conditions.push(lte(topups.createdAt, data.to))
    if (data.min) conditions.push(gte(topups.amount, data.min))
    if (data.max) conditions.push(lte(topups.amount, data.max))
    if (data.search) {
      const term = like(data.search)
      const asId = Number(data.search.replace(/^#/, ''))
      const ref = data.search.toUpperCase().replace(/[^A-Z0-9]/g, '')
      conditions.push(
        or(
          ilike(profiles.email, term),
          ilike(profiles.username, term),
          ilike(topups.userId, term),
          ref ? ilike(topups.reference, like(ref)) : undefined,
          Number.isInteger(asId) && asId > 0 && asId < 2_147_483_647 ? eq(topups.id, asId) : undefined,
        )!,
      )
    }
    const where = and(...conditions)

    const [rows, [summary]] = await Promise.all([
      db
        .select({ topup: topups, email: profiles.email, username: profiles.username })
        .from(topups)
        .leftJoin(profiles, eq(profiles.id, topups.userId))
        .where(where)
        .orderBy(desc(topups.createdAt))
        .limit(200),
      db
        .select({
          count: sql<number>`count(*)::int`,
          total: sql<number>`coalesce(sum(${topups.amount}), 0)::bigint`,
          pendingCount: sql<number>`count(*) filter (where ${topups.status} = 'pending')::int`,
          pendingTotal: sql<number>`coalesce(sum(${topups.amount}) filter (where ${topups.status} = 'pending'), 0)::bigint`,
        })
        .from(topups)
        .leftJoin(profiles, eq(profiles.id, topups.userId))
        .where(where),
    ])

    // Possible duplicates: other top-ups (any status) with the same image or reference,
    // or another top-up from the same customer for the same amount within 24 hours.
    const hashes = rows.map(r => r.topup.proofHash).filter((h): h is string => Boolean(h))
    const refs = rows.map(r => r.topup.reference).filter((h): h is string => Boolean(h))
    const userIds = [...new Set(rows.map(r => r.topup.userId))]
    const related =
      rows.length === 0
        ? []
        : await db
            .select({ id: topups.id, userId: topups.userId, amount: topups.amount, status: topups.status, proofHash: topups.proofHash, reference: topups.reference, createdAt: topups.createdAt })
            .from(topups)
            .where(
              or(
                hashes.length ? inArray(topups.proofHash, hashes) : undefined,
                refs.length ? inArray(topups.reference, refs) : undefined,
                inArray(topups.userId, userIds),
              ),
            )

    const items = rows.map(({ topup, email, username }) => {
      const warnings: string[] = []
      for (const other of related) {
        if (other.id === topup.id) continue
        if (topup.proofHash && other.proofHash === topup.proofHash) warnings.push(`Misma imagen que la recarga #${other.id} (${other.status === 'approved' ? 'aprobada' : other.status === 'rejected' ? 'rechazada' : 'pendiente'})`)
        else if (topup.reference && other.reference === topup.reference) warnings.push(`Misma referencia que la recarga #${other.id} (${other.status === 'approved' ? 'aprobada' : other.status === 'rejected' ? 'rechazada' : 'pendiente'})`)
        else if (other.userId === topup.userId && other.amount === topup.amount && Math.abs(other.createdAt.getTime() - topup.createdAt.getTime()) < 86_400_000) {
          warnings.push(`Mismo cliente y monto que la recarga #${other.id} en menos de 24 h`)
        }
      }
      return {
        id: topup.id,
        userId: topup.userId,
        email: email ?? '',
        username: username ?? '',
        amount: topup.amount,
        status: topup.status,
        reference: topup.reference,
        proofUrl: `/api/proofs/${topup.proofKey}`,
        reviewedByEmail: topup.reviewedByEmail,
        reviewedAt: iso(topup.reviewedAt),
        reviewNote: topup.reviewNote,
        createdAt: topup.createdAt.toISOString(),
        updatedAt: topup.updatedAt.toISOString(),
        warnings,
      }
    })

    return {
      items,
      summary: { count: summary.count, total: Number(summary.total), pendingCount: summary.pendingCount, pendingTotal: Number(summary.pendingTotal) },
    }
  })

/* ------------------------------ Financial ledger ----------------------------- */

export const adminListTransactions = createServerFn({ method: 'GET' })
  .inputValidator((data: { search?: string; type?: string; from?: string; to?: string; userId?: string }) => ({
    search: searchText(data?.search),
    type: ['recarga', 'pedido', 'ajuste', 'all'].includes(String(data?.type)) ? String(data.type) : 'all',
    from: parseDay(data?.from),
    to: parseDay(data?.to, true),
    userId: typeof data?.userId === 'string' ? data.userId.slice(0, 100) : undefined,
  }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const conditions: SQL[] = [eq(balanceTransactions.siteId, admin.siteId)]
    if (data.userId) conditions.push(eq(balanceTransactions.userId, data.userId))
    if (data.type === 'ajuste') conditions.push(or(ilike(balanceTransactions.type, 'ajuste%'), inArray(balanceTransactions.type, ['descuento']))!)
    else if (data.type !== 'all') conditions.push(eq(balanceTransactions.type, data.type))
    if (data.from) conditions.push(gte(balanceTransactions.createdAt, data.from))
    if (data.to) conditions.push(lte(balanceTransactions.createdAt, data.to))
    if (data.search) {
      const term = like(data.search)
      const asId = Number(data.search.replace(/^#/, ''))
      conditions.push(
        or(
          ilike(profiles.email, term),
          ilike(profiles.username, term),
          ilike(balanceTransactions.userId, term),
          ilike(balanceTransactions.description, term),
          ilike(balanceTransactions.reason, term),
          ilike(balanceTransactions.reference, term),
          Number.isInteger(asId) && asId > 0 && asId < 2_147_483_647 ? eq(balanceTransactions.id, asId) : undefined,
        )!,
      )
    }
    const rows = await db
      .select({ t: balanceTransactions, email: profiles.email })
      .from(balanceTransactions)
      .leftJoin(profiles, eq(profiles.id, balanceTransactions.userId))
      .where(and(...conditions))
      .orderBy(desc(balanceTransactions.createdAt))
      .limit(300)
    return rows.map(({ t, email }) => ({
      id: t.id,
      userId: t.userId,
      email: email ?? '',
      amount: t.amount,
      type: t.type,
      description: t.description,
      balanceBefore: t.balanceBefore,
      balanceAfter: t.balanceAfter,
      adminEmail: t.adminEmail,
      reason: t.reason,
      reference: t.reference,
      createdAt: t.createdAt.toISOString(),
    }))
  })

/* --------------------------------- Customers -------------------------------- */

export const adminListClients = createServerFn({ method: 'GET' })
  .inputValidator((data: { search?: string; status?: 'all' | 'active' | 'suspended' }) => ({
    search: searchText(data?.search),
    status: data?.status === 'active' || data?.status === 'suspended' ? data.status : 'all',
  }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const conditions: SQL[] = [eq(profiles.siteId, admin.siteId)]
    if (data.status !== 'all') conditions.push(eq(profiles.suspended, data.status === 'suspended'))
    if (data.search) {
      const term = like(data.search)
      conditions.push(or(ilike(profiles.email, term), ilike(profiles.username, term), ilike(profiles.id, term))!)
    }
    const rows = await db
      .select({
        p: profiles,
        orders: sql<number>`(select count(*) from ${orders} where ${orders.userId} = ${profiles.id})::int`,
        spent: sql<number>`(select coalesce(sum(${orders.price}), 0) from ${orders} where ${orders.userId} = ${profiles.id} and ${orders.status} <> 'cancelado')::bigint`,
        recharged: sql<number>`(select coalesce(sum(${topups.amount}), 0) from ${topups} where ${topups.userId} = ${profiles.id} and ${topups.status} = 'approved')::bigint`,
      })
      .from(profiles)
      .where(and(...conditions))
      .orderBy(desc(profiles.createdAt))
      .limit(300)
    return rows.map(({ p, orders: orderCount, spent, recharged }) => ({
      id: p.id,
      email: p.email,
      username: p.username,
      balance: p.balance,
      suspended: p.suspended,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      orders: orderCount,
      spent: Number(spent),
      recharged: Number(recharged),
    }))
  })

export const adminGetClient = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => {
    if (typeof data?.id !== 'string' || !data.id) throw new Error('Cliente no válido.')
    return { id: data.id.slice(0, 100) }
  })
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const [profile] = await db.select().from(profiles).where(and(eq(profiles.id, data.id), eq(profiles.siteId, admin.siteId)))
    if (!profile) throw new Error('Cliente no encontrado.')
    const [clientTopups, clientOrders, movements, activity] = await Promise.all([
      db.select().from(topups).where(eq(topups.userId, data.id)).orderBy(desc(topups.createdAt)).limit(200),
      db.select().from(orders).where(eq(orders.userId, data.id)).orderBy(desc(orders.createdAt)).limit(200),
      db.select().from(balanceTransactions).where(eq(balanceTransactions.userId, data.id)).orderBy(desc(balanceTransactions.createdAt)).limit(500),
      db
        .select()
        .from(adminAuditLog)
        .where(and(eq(adminAuditLog.targetType, 'client'), eq(adminAuditLog.targetId, data.id)))
        .orderBy(desc(adminAuditLog.createdAt))
        .limit(100),
    ])
    // Balance explanation: the sum of all movements should match the current balance.
    const ledgerSum = movements.reduce((sum, m) => sum + m.amount, 0)
    return {
      profile: {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        balance: profile.balance,
        suspended: profile.suspended,
        adminNotes: profile.adminNotes ?? '',
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      },
      ledgerSum,
      topups: clientTopups.map(t => ({
        id: t.id,
        amount: t.amount,
        status: t.status,
        reference: t.reference,
        proofUrl: `/api/proofs/${t.proofKey}`,
        reviewedByEmail: t.reviewedByEmail,
        reviewedAt: iso(t.reviewedAt),
        createdAt: t.createdAt.toISOString(),
      })),
      orders: clientOrders.map(o => ({ id: o.id, productName: o.productName, price: o.price, status: o.status, createdAt: o.createdAt.toISOString() })),
      movements: movements.map(m => ({
        id: m.id,
        amount: m.amount,
        type: m.type,
        description: m.description,
        balanceBefore: m.balanceBefore,
        balanceAfter: m.balanceAfter,
        adminEmail: m.adminEmail,
        reason: m.reason,
        reference: m.reference,
        createdAt: m.createdAt.toISOString(),
      })),
      activity: activity.map(a => ({ id: a.id, actorEmail: a.actorEmail, summary: a.summary, createdAt: a.createdAt.toISOString() })),
    }
  })

export const adminSetClientSuspended = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; suspended: boolean; reason: string }) => {
    if (typeof data?.id !== 'string' || !data.id) throw new Error('Cliente no válido.')
    const reason = String(data.reason ?? '').trim().slice(0, 300)
    if (data.suspended && reason.length < 5) throw new Error('Escribe el motivo de la suspensión (mínimo 5 caracteres).')
    return { id: data.id, suspended: Boolean(data.suspended), reason }
  })
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    if (data.id === admin.profile.id) throw new Error('No puedes suspender tu propia cuenta.')
    return db.transaction(async tx => {
      const [row] = await tx
        .update(profiles)
        .set({ suspended: data.suspended, updatedAt: new Date() })
        .where(and(eq(profiles.id, data.id), eq(profiles.siteId, admin.siteId)))
        .returning({ email: profiles.email })
      if (!row) throw new Error('Cliente no encontrado.')
      await logAdminAction(tx, admin, {
        action: data.suspended ? 'cliente.suspender' : 'cliente.reactivar',
        summary: `${data.suspended ? 'Suspendió' : 'Reactivó'} la cuenta de ${row.email}${data.reason ? `. Motivo: ${data.reason}` : ''}`,
        targetType: 'client',
        targetId: data.id,
      })
      return { suspended: data.suspended }
    })
  })

export const adminSaveClientNotes = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; notes: string }) => {
    if (typeof data?.id !== 'string' || !data.id) throw new Error('Cliente no válido.')
    return { id: data.id, notes: String(data.notes ?? '').slice(0, 5000) }
  })
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const [row] = await db
      .update(profiles)
      .set({ adminNotes: data.notes || null, updatedAt: new Date() })
      .where(and(eq(profiles.id, data.id), eq(profiles.siteId, admin.siteId)))
      .returning({ email: profiles.email })
    if (!row) throw new Error('Cliente no encontrado.')
    await logAdminAction(db, admin, { action: 'cliente.notas', summary: `Actualizó las notas privadas de ${row.email}`, targetType: 'client', targetId: data.id })
    return { ok: true }
  })

/* -------------------------------- Activity log ------------------------------- */

export const adminListAuditLog = createServerFn({ method: 'GET' })
  .inputValidator((data: { search?: string; from?: string; to?: string }) => ({
    search: searchText(data?.search),
    from: parseDay(data?.from),
    to: parseDay(data?.to, true),
  }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const conditions: SQL[] = [or(eq(adminAuditLog.siteId, admin.siteId), isNull(adminAuditLog.siteId))!]
    if (data.from) conditions.push(gte(adminAuditLog.createdAt, data.from))
    if (data.to) conditions.push(lte(adminAuditLog.createdAt, data.to))
    if (data.search) {
      const term = like(data.search)
      conditions.push(or(ilike(adminAuditLog.summary, term), ilike(adminAuditLog.actorEmail, term), ilike(adminAuditLog.action, term), ilike(adminAuditLog.targetId, term))!)
    }
    const rows = await db
      .select()
      .from(adminAuditLog)
      .where(and(...conditions))
      .orderBy(desc(adminAuditLog.createdAt))
      .limit(300)
    return rows.map(r => ({
      id: r.id,
      actorEmail: r.actorEmail,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      summary: r.summary,
      createdAt: r.createdAt.toISOString(),
    }))
  })

/** Small list used by the orders section to label customers. */
export const adminListOrders = createServerFn({ method: 'GET' })
  .inputValidator((data: { status?: string; search?: string }) => ({ status: String(data?.status ?? 'all'), search: searchText(data?.search) }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const conditions: SQL[] = [eq(orders.siteId, admin.siteId)]
    if (data.status !== 'all') conditions.push(eq(orders.status, data.status))
    if (data.search) {
      const term = like(data.search)
      const asId = Number(data.search.replace(/^#/, ''))
      conditions.push(
        or(
          ilike(profiles.email, term),
          ilike(orders.productName, term),
          ilike(orders.userId, term),
          Number.isInteger(asId) && asId > 0 && asId < 2_147_483_647 ? eq(orders.id, asId) : undefined,
        )!,
      )
    }
    const rows = await db
      .select({ o: orders, email: profiles.email })
      .from(orders)
      .leftJoin(profiles, eq(profiles.id, orders.userId))
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(300)
    return rows.map(({ o, email }) => ({
      id: o.id,
      userId: o.userId,
      email: email ?? '',
      productName: o.productName,
      price: o.price,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    }))
  })

/* ------------------------------- Notifications ------------------------------- */

/** Notifications of the store being managed plus platform-wide ones (backups, scheduled jobs). */
const notificationScope = (siteId: number) => or(eq(adminNotifications.siteId, siteId), isNull(adminNotifications.siteId))!

export const adminListNotifications = createServerFn({ method: 'GET' }).handler(async () => {
  const admin = await requireAdmin()
  const scope = notificationScope(admin.siteId)
  const [rows, [{ unread }]] = await Promise.all([
    db.select().from(adminNotifications).where(scope).orderBy(desc(adminNotifications.createdAt)).limit(50),
    db.select({ unread: sql<number>`count(*)::int` }).from(adminNotifications).where(and(scope, eq(adminNotifications.read, false))),
  ])
  return {
    unread,
    items: rows.map(n => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, link: n.link, read: n.read, createdAt: n.createdAt.toISOString() })),
  }
})

export const adminMarkNotificationsRead = createServerFn({ method: 'POST' }).handler(async () => {
  const admin = await requireAdmin()
  await db.update(adminNotifications).set({ read: true }).where(and(notificationScope(admin.siteId), eq(adminNotifications.read, false)))
  return { ok: true }
})

/* ---------------------------------- Backups ---------------------------------- */

export const adminListBackups = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  return listBackups()
})

export const adminCreateBackup = createServerFn({ method: 'POST' }).handler(async () => {
  const admin = await requireAdmin()
  const result = await createBackup('manual', admin.profile.email)
  await logAdminAction(db, admin, { siteId: null, action: 'copia.crear', summary: 'Creó una copia de seguridad manual de la base de datos', targetType: 'backup', targetId: result.key })
  return result
})
