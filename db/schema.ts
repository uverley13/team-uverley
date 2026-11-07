import { sql } from 'drizzle-orm'
import { boolean, index, integer, jsonb, pgTable, primaryKey, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

// Each independent store of the platform. Store 1 is the original "Servidor Uverley".
export const sites = pgTable('sites', {
  id: serial().primaryKey(),
  // Short internal identifier (letters, numbers and dashes).
  slug: text().notNull().unique(),
  name: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Custom domains that open each store (lowercase, without "www." and without port).
export const siteDomains = pgTable(
  'site_domains',
  {
    domain: text().primaryKey(),
    siteId: integer('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [index('site_domains_site_id_idx').on(table.siteId)],
)

const siteRef = () => integer('site_id').notNull().references(() => sites.id)

// One row per Netlify Identity user and store: each store has its own customers and balances.
// `id` is an opaque profile id (older store-1 rows use the Identity user id itself).
export const profiles = pgTable(
  'profiles',
  {
  id: text().primaryKey(),
  siteId: siteRef(),
  // Netlify Identity user id.
  userId: text('user_id').notNull(),
  email: text().notNull(),
  username: text().notNull().default(''),
  balance: integer().notNull().default(0),
  // Suspended accounts can sign in but cannot place orders or send top-ups.
  suspended: boolean().notNull().default(false),
  // Private admin notes about the customer. Never sent to the customer.
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [uniqueIndex('profiles_site_user_uq').on(table.siteId, table.userId)],
)

export const products = pgTable(
  'products',
  {
  id: serial().primaryKey(),
  siteId: siteRef(),
  name: text().notNull(),
  description: text(),
  price: integer().notNull(),
  imageKey: text('image_key'),
  active: boolean().notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [index('products_site_id_idx').on(table.siteId)],
)

export const orders = pgTable(
  'orders',
  {
    id: serial().primaryKey(),
    siteId: siteRef(),
    userId: text('user_id').notNull().references(() => profiles.id),
    productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
    productName: text('product_name').notNull(),
    price: integer().notNull(),
    status: text().notNull().default('pendiente'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [index('orders_site_id_idx').on(table.siteId), index('orders_user_id_idx').on(table.userId), index('orders_created_at_idx').on(table.createdAt)],
)

export const balanceTransactions = pgTable(
  'balance_transactions',
  {
    id: serial().primaryKey(),
    siteId: siteRef(),
    userId: text('user_id').notNull().references(() => profiles.id),
    // Positive for credits, negative for debits.
    amount: integer().notNull(),
    type: text().notNull(),
    description: text(),
    // Financial audit trail: balance before/after the movement, who made it and why.
    balanceBefore: integer('balance_before'),
    balanceAfter: integer('balance_after'),
    adminId: text('admin_id'),
    adminEmail: text('admin_email'),
    reason: text(),
    // Related record, e.g. 'topup:12' or 'order:7'.
    reference: text(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    index('balance_transactions_site_id_idx').on(table.siteId),
    index('balance_transactions_user_id_idx').on(table.userId),
    index('balance_transactions_created_at_idx').on(table.createdAt),
  ],
)

export const topups = pgTable(
  'topups',
  {
    id: serial().primaryKey(),
    siteId: siteRef(),
    userId: text('user_id').notNull().references(() => profiles.id),
    amount: integer().notNull(),
    status: text().notNull().default('pending'),
    proofKey: text('proof_key').notNull(),
    // SHA-256 of the proof image, used to detect the same image being sent twice.
    proofHash: text('proof_hash'),
    // Transaction / reference number written by the customer (normalized: uppercase, no spaces).
    reference: text(),
    reviewedBy: text('reviewed_by'),
    reviewedByEmail: text('reviewed_by_email'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewNote: text('review_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    index('topups_site_id_idx').on(table.siteId),
    index('topups_status_idx').on(table.status),
    // The same image or reference can never be pending/approved twice (rejected ones don't block a resend).
    uniqueIndex('topups_active_proof_hash_uq').on(table.proofHash).where(sql`${table.status} in ('pending', 'approved')`),
    uniqueIndex('topups_active_reference_uq').on(table.reference).where(sql`${table.status} in ('pending', 'approved')`),
    index('topups_reference_idx').on(table.reference),
    index('topups_created_at_idx').on(table.createdAt),
  ],
)

// Editable content of each store (texts, contact data, colors, FAQ): key 'site' (published) and 'draft'.
export const siteSettings = pgTable(
  'site_settings',
  {
    siteId: siteRef(),
    key: text().notNull(),
    value: jsonb().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [primaryKey({ columns: [table.siteId, table.key] })],
)

// Previous versions of the site content, so any change (manual or by the assistant) can be undone.
export const siteSettingsRevisions = pgTable(
  'site_settings_revisions',
  {
  id: serial().primaryKey(),
  siteId: siteRef(),
  value: jsonb().notNull(),
  source: text().notNull(),
  summary: text(),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [index('site_settings_revisions_site_id_idx').on(table.siteId)],
)

// Activity log of every important admin action (approvals, balance changes, content edits, ...).
export const adminAuditLog = pgTable(
  'admin_audit_log',
  {
    id: serial().primaryKey(),
    // Store the action belongs to (null for platform-wide actions such as creating a store).
    siteId: integer('site_id').references(() => sites.id, { onDelete: 'set null' }),
    actorId: text('actor_id').notNull(),
    actorEmail: text('actor_email').notNull(),
    action: text().notNull(),
    targetType: text('target_type'),
    targetId: text('target_id'),
    summary: text().notNull(),
    details: jsonb(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [index('admin_audit_log_site_id_idx').on(table.siteId), index('admin_audit_log_created_at_idx').on(table.createdAt), index('admin_audit_log_target_idx').on(table.targetType, table.targetId)],
)

// Failed sign-in attempts per email, used to temporarily block repeated guessing.
export const loginAttempts = pgTable('login_attempts', {
  key: text().primaryKey(),
  failures: integer().notNull().default(0),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull().defaultNow(),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
})

// Events the admin should know about (new proof, new order, rejected payment, errors...).
export const adminNotifications = pgTable(
  'admin_notifications',
  {
    id: serial().primaryKey(),
    // Store the event belongs to (null for platform-wide events such as a failed backup).
    siteId: integer('site_id').references(() => sites.id, { onDelete: 'set null' }),
    kind: text().notNull(),
    title: text().notNull(),
    body: text(),
    link: text(),
    read: boolean().notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [index('admin_notifications_site_id_idx').on(table.siteId), index('admin_notifications_created_at_idx').on(table.createdAt)],
)
