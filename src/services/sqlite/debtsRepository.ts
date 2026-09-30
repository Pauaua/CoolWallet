import { and, asc, desc, eq, isNull } from 'drizzle-orm';

import { debtPayments, debts, transactions } from '@/db/schema';

import { NotFoundError, newRowFields, type RepositoryContext } from '../context';
import type { DebtsRepository } from '../types';

export function createDebtsRepository(ctx: RepositoryContext): DebtsRepository {
  const { db } = ctx;
  const activeDebt = (id: string) => and(eq(debts.id, id), isNull(debts.deletedAt));
  const activePayment = (id: string) => and(eq(debtPayments.id, id), isNull(debtPayments.deletedAt));

  return {
    async list() {
      return db.select().from(debts).where(isNull(debts.deletedAt)).orderBy(asc(debts.createdAt)).all();
    },

    async getById(id) {
      return db.select().from(debts).where(activeDebt(id)).get() ?? null;
    },

    async create(input) {
      return db
        .insert(debts)
        .values({ ...input, ...newRowFields(ctx) })
        .returning()
        .get();
    },

    async update(id, patch) {
      const updated = db
        .update(debts)
        .set({ ...patch, updatedAt: ctx.now() })
        .where(activeDebt(id))
        .returning()
        .get();
      if (!updated) throw new NotFoundError('Deuda', id);
      return updated;
    },

    async remove(id) {
      const timestamp = ctx.now();
      db.update(debts).set({ deletedAt: timestamp, updatedAt: timestamp }).where(activeDebt(id)).run();
    },

    async listPayments(debtId) {
      const conditions = [isNull(debtPayments.deletedAt)];
      if (debtId) conditions.push(eq(debtPayments.debtId, debtId));
      return db
        .select()
        .from(debtPayments)
        .where(and(...conditions))
        .orderBy(desc(debtPayments.date), desc(debtPayments.createdAt))
        .all();
    },

    async addPayment(debtId, payment) {
      return db.transaction((tx) => {
        const debt = tx.select().from(debts).where(activeDebt(debtId)).get();
        if (!debt) throw new NotFoundError('Deuda', debtId);
        const transaction = tx
          .insert(transactions)
          .values({
            type: 'debt_payment',
            amount: payment.amount,
            date: payment.date,
            accountId: payment.accountId,
            categoryId: null,
            note: debt.name,
            debtId,
            ...newRowFields(ctx),
          })
          .returning()
          .get();
        return tx
          .insert(debtPayments)
          .values({ debtId, ...payment, transactionId: transaction.id, ...newRowFields(ctx) })
          .returning()
          .get();
      });
    },

    async removePayment(paymentId) {
      db.transaction((tx) => {
        const payment = tx.select().from(debtPayments).where(activePayment(paymentId)).get();
        if (!payment) throw new NotFoundError('Abono', paymentId);
        const timestamp = ctx.now();
        tx.update(debtPayments).set({ deletedAt: timestamp, updatedAt: timestamp }).where(eq(debtPayments.id, paymentId)).run();
        if (payment.transactionId) {
          tx.update(transactions).set({ deletedAt: timestamp, updatedAt: timestamp }).where(eq(transactions.id, payment.transactionId)).run();
        }
      });
    },
  };
}
