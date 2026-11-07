// Server-only: business statistics for the admin panel and the AI assistant.
// Kept out of the *.functions.ts files so database code never reaches the browser bundle.
import { and, desc, eq, gte, ne, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { balanceTransactions, orders, profiles, topups } from '../../db/schema.js'

const TZ = 'America/Bogota'
// Colombia has no daylight saving time: UTC-5 all year.
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000

function startOfBogotaDay(date = new Date()) {
  const local = new Date(date.getTime() - BOGOTA_OFFSET_MS)
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + BOGOTA_OFFSET_MS)
}

function periodStarts() {
  const today = startOfBogotaDay()
  const local = new Date(today.getTime() - BOGOTA_OFFSET_MS)
  const weekday = (local.getUTCDay() + 6) % 7 // Monday = 0
  const week = new Date(today.getTime() - weekday * 86_400_000)
  const month = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) + BOGOTA_OFFSET_MS)
  return { today, week, month }
}

/** Business statistics. Server-only: callers must check admin permissions first. */
export async function computeStats(siteId: number) {
  const { today, week, month } = periodStarts()
  const chartStart = new Date(today.getTime() - 29 * 86_400_000)
  const sold = and(eq(orders.siteId, siteId), ne(orders.status, 'cancelado'))
  const siteTopups = eq(topups.siteId, siteId)

  const [topupTotals, orderTotals, clientTotals, topServices, latest, dailyTopups, dailySales] = await Promise.all([
    db
      .select({
        approvedAmount: sql<number>`coalesce(sum(${topups.amount}) filter (where ${topups.status} = 'approved'), 0)::bigint`,
        approvedCount: sql<number>`count(*) filter (where ${topups.status} = 'approved')::int`,
        pendingAmount: sql<number>`coalesce(sum(${topups.amount}) filter (where ${topups.status} = 'pending'), 0)::bigint`,
        pendingCount: sql<number>`count(*) filter (where ${topups.status} = 'pending')::int`,
        rejectedCount: sql<number>`count(*) filter (where ${topups.status} = 'rejected')::int`,
      })
      .from(topups)
      .where(siteTopups),
    db
      .select({
        salesTotal: sql<number>`coalesce(sum(${orders.price}) filter (where ${sold}), 0)::bigint`,
        ordersCount: sql<number>`count(*) filter (where ${sold})::int`,
        activeOrders: sql<number>`count(*) filter (where ${orders.status} in ('pendiente', 'en proceso'))::int`,
        salesToday: sql<number>`coalesce(sum(${orders.price}) filter (where ${sold} and ${orders.createdAt} >= ${today}), 0)::bigint`,
        salesWeek: sql<number>`coalesce(sum(${orders.price}) filter (where ${sold} and ${orders.createdAt} >= ${week}), 0)::bigint`,
        salesMonth: sql<number>`coalesce(sum(${orders.price}) filter (where ${sold} and ${orders.createdAt} >= ${month}), 0)::bigint`,
        ordersToday: sql<number>`count(*) filter (where ${sold} and ${orders.createdAt} >= ${today})::int`,
      })
      .from(orders)
      .where(eq(orders.siteId, siteId)),
    db
      .select({
        clients: sql<number>`count(*)::int`,
        suspended: sql<number>`count(*) filter (where ${profiles.suspended})::int`,
        newThisMonth: sql<number>`count(*) filter (where ${profiles.createdAt} >= ${month})::int`,
        totalBalance: sql<number>`coalesce(sum(${profiles.balance}), 0)::bigint`,
      })
      .from(profiles)
      .where(eq(profiles.siteId, siteId)),
    db
      .select({ name: orders.productName, count: sql<number>`count(*)::int`, total: sql<number>`sum(${orders.price})::bigint` })
      .from(orders)
      .where(sold)
      .groupBy(orders.productName)
      .orderBy(desc(sql`count(*)`), desc(sql`sum(${orders.price})`))
      .limit(5),
    db
      .select({
        id: balanceTransactions.id,
        amount: balanceTransactions.amount,
        type: balanceTransactions.type,
        description: balanceTransactions.description,
        createdAt: balanceTransactions.createdAt,
        email: profiles.email,
      })
      .from(balanceTransactions)
      .leftJoin(profiles, eq(profiles.id, balanceTransactions.userId))
      .where(eq(balanceTransactions.siteId, siteId))
      .orderBy(desc(balanceTransactions.createdAt))
      .limit(8),
    db
      .select({
        day: sql<string>`to_char(${topups.reviewedAt} at time zone ${sql.raw(`'${TZ}'`)}, 'YYYY-MM-DD')`,
        total: sql<number>`sum(${topups.amount})::bigint`,
      })
      .from(topups)
      .where(and(siteTopups, eq(topups.status, 'approved'), gte(topups.reviewedAt, chartStart)))
      .groupBy(sql`1`),
    db
      .select({
        day: sql<string>`to_char(${orders.createdAt} at time zone ${sql.raw(`'${TZ}'`)}, 'YYYY-MM-DD')`,
        total: sql<number>`sum(${orders.price})::bigint`,
      })
      .from(orders)
      .where(and(sold, gte(orders.createdAt, chartStart)))
      .groupBy(sql`1`),
  ])

  const topupsByDay = new Map(dailyTopups.map(r => [r.day, Number(r.total)]))
  const salesByDay = new Map(dailySales.map(r => [r.day, Number(r.total)]))
  const chart = Array.from({ length: 30 }, (_, i) => {
    const local = new Date(chartStart.getTime() + i * 86_400_000 - BOGOTA_OFFSET_MS)
    const day = local.toISOString().slice(0, 10)
    return { day, topups: topupsByDay.get(day) ?? 0, sales: salesByDay.get(day) ?? 0 }
  })

  const t = topupTotals[0]
  const o = orderTotals[0]
  const c = clientTotals[0]
  return {
    topups: {
      approvedAmount: Number(t.approvedAmount),
      approvedCount: t.approvedCount,
      pendingAmount: Number(t.pendingAmount),
      pendingCount: t.pendingCount,
      rejectedCount: t.rejectedCount,
    },
    sales: {
      total: Number(o.salesTotal),
      orders: o.ordersCount,
      activeOrders: o.activeOrders,
      today: Number(o.salesToday),
      week: Number(o.salesWeek),
      month: Number(o.salesMonth),
      ordersToday: o.ordersToday,
    },
    clients: { total: c.clients, suspended: c.suspended, newThisMonth: c.newThisMonth, totalBalance: Number(c.totalBalance) },
    topServices: topServices.map(s => ({ name: s.name, count: s.count, total: Number(s.total) })),
    latest: latest.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })),
    chart,
  }
}
