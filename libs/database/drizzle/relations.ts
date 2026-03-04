import { relations } from "drizzle-orm/relations";
import { user, account, session, creditTransaction, order, subscription, cachedPayment, cachedVerification, cachedPo } from "./schema";

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	accounts: many(account),
	sessions: many(session),
	creditTransactions: many(creditTransaction),
	orders: many(order),
	subscriptions: many(subscription),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const creditTransactionRelations = relations(creditTransaction, ({one}) => ({
	user: one(user, {
		fields: [creditTransaction.userId],
		references: [user.id]
	}),
}));

export const orderRelations = relations(order, ({one}) => ({
	user: one(user, {
		fields: [order.userId],
		references: [user.id]
	}),
}));

export const subscriptionRelations = relations(subscription, ({one}) => ({
	user: one(user, {
		fields: [subscription.userId],
		references: [user.id]
	}),
}));

export const cachedVerificationRelations = relations(cachedVerification, ({one}) => ({
	cachedPayment: one(cachedPayment, {
		fields: [cachedVerification.paymentId],
		references: [cachedPayment.id]
	}),
	cachedPo: one(cachedPo, {
		fields: [cachedVerification.poId],
		references: [cachedPo.id]
	}),
}));

export const cachedPaymentRelations = relations(cachedPayment, ({many}) => ({
	cachedVerifications: many(cachedVerification),
}));

export const cachedPoRelations = relations(cachedPo, ({many}) => ({
	cachedVerifications: many(cachedVerification),
}));