import { and, asc, eq, gte, isNull, lte } from 'drizzle-orm';

import { fixedExpenseOccurrences, fixedExpenses, transactions } from '@/db/schema';

import { NotFoundError, newRowFields, type RepositoryContext } from '../context';
import type { FixedExpensesRepository } from '../types';

export function createFixedExpensesRepository(ctx: RepositoryContext): FixedExpensesRepository {
  const { db } = ctx;
  const activeExpense = (id: string) => and(eq(fixedExpenses.id, id), isNull(fixedExpenses.deletedAt));
  const activeOccurrence = (id: string) => and(eq(fixedExpenseOccurrences.id, id), isNull(fixedExpenseOccurrences.deletedAt));
  const inRange = (range: { from: string; to: string }) =>
    and(isNull(fixedExpenseOccurrences.deletedAt), gte(fixedExpenseOccurrences.dueDate, range.from), lte(fixedExpenseOccurrences.dueDate, range.to));

  return {
    async list() {
      return db.select().from(fixedExpenses).where(isNull(fixedExpenses.deletedAt)).orderBy(asc(fixedExpenses.dueDay), asc(fixedExpenses.name)).all();
    },

    async getById(id) {
      return db.select().from(fixedExpenses).where(activeExpense(id)).get() ?? null;
    },

    async create(input) {
      return db
        .insert(fixedExpenses)
        .values({ ...input, ...newRowFields(ctx) })
        .returning()
        .get();
    },

    async update(id, patch) {
      const updated = db
        .update(fixedExpenses)
        .set({ ...patch, updatedAt: ctx.now() })
        .where(activeExpense(id))
        .returning()
        .get();
      if (!updated) throw new NotFoundError('Gasto fijo', id);
      return updated;
    },

    async remove(id) {
      const timestamp = ctx.now();
      db.transaction((tx) => {
        tx.update(fixedExpenses).set({ deletedAt: timestamp, updatedAt: timestamp }).where(activeExpense(id)).run();
        tx.delete(fixedExpenseOccurrences)
          .where(and(eq(fixedExpenseOccurrences.fixedExpenseId, id), eq(fixedExpenseOccurrences.status, 'pending')))
          .run();
      });
    },

    async syncOccurrences(range, expected) {
      const key = (fixedExpenseId: string, dueDate: string) => `${fixedExpenseId}|${dueDate}`;
      const expectedByKey = new Map(expected.map((item) => [key(item.fixedExpenseId, item.dueDate), item]));

      db.transaction((tx) => {
        const existing = tx.select().from(fixedExpenseOccurrences).where(inRange(range)).all();
        const existingKeys = new Set<string>();
        for (const occurrence of existing) {
          const occurrenceKey = key(occurrence.fixedExpenseId, occurrence.dueDate);
          existingKeys.add(occurrenceKey);
          if (occurrence.status === 'paid') continue;
          const wanted = expectedByKey.get(occurrenceKey);
          if (!wanted) {
            tx.delete(fixedExpenseOccurrences).where(eq(fixedExpenseOccurrences.id, occurrence.id)).run();
          } else if (wanted.amount !== occurrence.amount) {
            tx.update(fixedExpenseOccurrences).set({ amount: wanted.amount, updatedAt: ctx.now() }).where(eq(fixedExpenseOccurrences.id, occurrence.id)).run();
          }
        }
        const missing = expected.filter((item) => !existingKeys.has(key(item.fixedExpenseId, item.dueDate)));
        if (missing.length > 0) {
          tx.insert(fixedExpenseOccurrences)
            .values(missing.map((item) => ({ ...item, status: 'pending' as const, ...newRowFields(ctx) })))
            .run();
        }
      });
    },

    async listOccurrences(range) {
      return db.select().from(fixedExpenseOccurrences).where(inRange(range)).orderBy(asc(fixedExpenseOccurrences.dueDate)).all();
    },

    async markPaid(occurrenceId, payment) {
      return db.transaction((tx) => {
        const occurrence = tx.select().from(fixedExpenseOccurrences).where(activeOccurrence(occurrenceId)).get();
        if (!occurrence) throw new NotFoundError('Vencimiento', occurrenceId);
        const expense = tx.select().from(fixedExpenses).where(eq(fixedExpenses.id, occurrence.fixedExpenseId)).get();
        if (occurrence.status === 'paid' && occurrence.transactionId) {
          const existing = tx.select().from(transactions).where(eq(transactions.id, occurrence.transactionId)).get();
          if (existing && !existing.deletedAt) return existing;
        }
        const transaction = tx
          .insert(transactions)
          .values({
            type: 'fixed_expense',
            amount: payment.amount,
            date: payment.date,
            accountId: payment.accountId,
            categoryId: expense?.categoryId ?? null,
            note: expense?.name ?? null,
            fixedExpenseId: occurrence.fixedExpenseId,
            ...newRowFields(ctx),
          })
          .returning()
          .get();
        tx.update(fixedExpenseOccurrences)
          .set({ status: 'paid', transactionId: transaction.id, paidAt: ctx.now(), updatedAt: ctx.now() })
          .where(eq(fixedExpenseOccurrences.id, occurrenceId))
          .run();
        return transaction;
      });
    },

    async markPending(occurrenceId) {
      db.transaction((tx) => {
        const occurrence = tx.select().from(fixedExpenseOccurrences).where(activeOccurrence(occurrenceId)).get();
        if (!occurrence) throw new NotFoundError('Vencimiento', occurrenceId);
        const timestamp = ctx.now();
        if (occurrence.transactionId) {
          tx.update(transactions).set({ deletedAt: timestamp, updatedAt: timestamp }).where(eq(transactions.id, occurrence.transactionId)).run();
        }
        tx.update(fixedExpenseOccurrences)
          .set({ status: 'pending', transactionId: null, paidAt: null, updatedAt: timestamp })
          .where(eq(fixedExpenseOccurrences.id, occurrenceId))
          .run();
      });
    },
  };
}
