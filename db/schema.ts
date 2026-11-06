import { boolean, index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

// One row per Netlify Identity user. `id` is the Identity user id.
export const profiles = pgTable('profiles', {
  id: text().primaryKey(),
  email: text().notNull(),
  username: text().notNull().default(''),
  balance: integer().notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const products = pgTable('products', {
  id: serial().primaryKey(),
  name: text().notNull(),
  description: text(),
  price: integer().notNull(),
  imageKey: text('image_key'),
  active: boolean().notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const orders = pgTable(
  'orders',
  {
    id: serial().primaryKey(),
    userId: text('user_id').notNull().references(() => profiles.id),
    productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
    productName: text('product_name').notNull(),
    price: integer().notNull(),
    status: text().notNull().default('pendiente'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [index('orders_user_id_idx').on(table.userId)],
)

export const balanceTransactions = pgTable(
  'balance_transactions',
  {
    id: serial().primaryKey(),
    userId: text('user_id').notNull().references(() => profiles.id),
    // Positive for credits, negative for debits.
    amount: integer().notNull(),
    type: text().notNull(),
    description: text(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [index('balance_transactions_user_id_idx').on(table.userId)],
)

export const topups = pgTable(
  'topups',
  {
    id: serial().primaryKey(),
    userId: text('user_id').notNull().references(() => profiles.id),
    amount: integer().notNull(),
    status: text().notNull().default('pending'),
    proofKey: text('proof_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [index('topups_status_idx').on(table.status)],
)
