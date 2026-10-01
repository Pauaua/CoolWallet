import { signedAmount } from '@/lib/finance';
import type { Account, Category, Transaction } from '@/types/models';

import { TRANSACTION_TYPE_LABELS } from '@/features/wallet/labels';

/** Separador `;`: Excel en español (coma decimal) lo abre en columnas directamente. */
const SEPARATOR = ';';
/** BOM UTF-8 para que Excel muestre bien tildes y ñ. */
const BOM = '﻿';

function escapeCell(value: string): string {
  return /[";\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Movimientos a CSV: Fecha;Tipo;Categoría;Cuenta;Monto;Nota.
 * El monto va con signo (ingresos positivos, gastos negativos) y sin
 * separador de miles para que la planilla lo reconozca como número.
 */
export function toTransactionsCsv(transactions: readonly Transaction[], categories: readonly Category[], accounts: readonly Account[]): string {
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const rows = transactions.map((tx) =>
    [
      tx.date,
      TRANSACTION_TYPE_LABELS[tx.type],
      tx.categoryId ? (categoryNames.get(tx.categoryId) ?? '') : '',
      tx.accountId ? (accountNames.get(tx.accountId) ?? '') : '',
      String(signedAmount(tx)),
      tx.note ?? '',
    ]
      .map(escapeCell)
      .join(SEPARATOR),
  );
  return BOM + [['Fecha', 'Tipo', 'Categoría', 'Cuenta', 'Monto', 'Nota'].join(SEPARATOR), ...rows].join('\r\n') + '\r\n';
}

/** "movimientos-2026-09-30.csv" */
export function csvFileName(isoDate: string): string {
  return `movimientos-${isoDate.slice(0, 10)}.csv`;
}
