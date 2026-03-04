import { pgTable, foreignKey, text, timestamp, unique, boolean, numeric, jsonb, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: 'string' }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
});

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull(),
	impersonatedBy: text("impersonated_by"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("session_token_unique").on(table.token),
]);

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text(),
	email: text().notNull(),
	emailVerified: boolean("email_verified").notNull(),
	image: text(),
	role: text().default('user').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	phoneNumber: text("phone_number"),
	phoneNumberVerified: boolean("phone_number_verified").default(false),
	stripeCustomerId: text("stripe_customer_id"),
	creemCustomerId: text("creem_customer_id"),
	creditBalance: numeric("credit_balance").default('0').notNull(),
	banned: boolean().default(false),
	banReason: text("ban_reason"),
	banExpires: numeric("ban_expires"),
});

export const creditTransaction = pgTable("credit_transaction", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	type: text().notNull(),
	amount: numeric().notNull(),
	balance: numeric().notNull(),
	orderId: text("order_id"),
	description: text(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "credit_transaction_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const order = pgTable("order", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	amount: numeric().notNull(),
	currency: text().notNull(),
	planId: text("plan_id").notNull(),
	status: text().notNull(),
	provider: text().notNull(),
	providerOrderId: text("provider_order_id"),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "order_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const subscription = pgTable("subscription", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	planId: text("plan_id").notNull(),
	status: text().notNull(),
	paymentType: text("payment_type").notNull(),
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	creemCustomerId: text("creem_customer_id"),
	creemSubscriptionId: text("creem_subscription_id"),
	paypalSubscriptionId: text("paypal_subscription_id"),
	periodStart: timestamp("period_start", { mode: 'string' }).notNull(),
	periodEnd: timestamp("period_end", { mode: 'string' }).notNull(),
	cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
	metadata: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "subscription_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const cachedPayment = pgTable("cached_payment", {
	id: text().primaryKey().notNull(),
	paymentNo: text("payment_no").notNull(),
	customerName: text("customer_name").notNull(),
	receivedAmount: numeric("received_amount").notNull(),
	unallocatedBalance: numeric("unallocated_balance").notNull(),
	paymentMethod: text("payment_method").notNull(),
	receivedDate: timestamp("received_date", { withTimezone: true, mode: 'string' }),
	bankAccount: text("bank_account"),
	remarks: text(),
	syncedAt: timestamp("synced_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	rawData: jsonb("raw_data"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_cached_payment_customer").using("btree", table.customerName.asc().nullsLast().op("text_ops")),
	index("idx_cached_payment_date").using("btree", table.receivedDate.asc().nullsLast().op("timestamptz_ops")),
	index("idx_cached_payment_no").using("btree", table.paymentNo.asc().nullsLast().op("text_ops")),
	index("idx_cached_payment_synced_at").using("btree", table.syncedAt.asc().nullsLast().op("timestamptz_ops")),
]);

export const cachedPo = pgTable("cached_po", {
	id: text().primaryKey().notNull(),
	piNo: text("pi_no").notNull(),
	productionNo: text("production_no").notNull(),
	customerName: text("customer_name").notNull(),
	totalAmount: numeric("total_amount").notNull(),
	outstandingBalance: numeric("outstanding_balance").notNull(),
	verificationStatus: text("verification_status").default('pending').notNull(),
	shippingStatus: text("shipping_status").default('pending'),
	orderDate: timestamp("order_date", { withTimezone: true, mode: 'string' }),
	remarks: text(),
	syncedAt: timestamp("synced_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	rawData: jsonb("raw_data"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_cached_po_customer").using("btree", table.customerName.asc().nullsLast().op("text_ops")),
	index("idx_cached_po_pi_no").using("btree", table.piNo.asc().nullsLast().op("text_ops")),
	index("idx_cached_po_production_no").using("btree", table.productionNo.asc().nullsLast().op("text_ops")),
	index("idx_cached_po_synced_at").using("btree", table.syncedAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_cached_po_verification_status").using("btree", table.verificationStatus.asc().nullsLast().op("text_ops")),
]);

export const cachedVerification = pgTable("cached_verification", {
	id: text().primaryKey().notNull(),
	poId: text("po_id").notNull(),
	paymentId: text("payment_id").notNull(),
	allocatedAmount: numeric("allocated_amount").notNull(),
	verificationType: text("verification_type").default('normal').notNull(),
	verificationDate: timestamp("verification_date", { withTimezone: true, mode: 'string' }),
	remarks: text(),
	syncedAt: timestamp("synced_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	rawData: jsonb("raw_data"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_cached_verification_date").using("btree", table.verificationDate.asc().nullsLast().op("timestamptz_ops")),
	index("idx_cached_verification_payment").using("btree", table.paymentId.asc().nullsLast().op("text_ops")),
	index("idx_cached_verification_po").using("btree", table.poId.asc().nullsLast().op("text_ops")),
	index("idx_cached_verification_synced_at").using("btree", table.syncedAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.paymentId],
			foreignColumns: [cachedPayment.id],
			name: "cached_verification_payment_id_cached_payment_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.poId],
			foreignColumns: [cachedPo.id],
			name: "cached_verification_po_id_cached_po_id_fk"
		}).onDelete("cascade"),
]);
