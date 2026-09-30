import type { IconName } from '@/components/Icon';
import type { TransactionType } from '@/lib/finance';
import type { AccountType } from '@/types/enums';

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Ingreso',
  fixed_expense: 'Gasto fijo',
  variable_expense: 'Gasto variable',
  debt_payment: 'Pago de deuda',
  adjustment: 'Ajuste de saldo',
};

export const TRANSACTION_TYPE_ICONS: Record<TransactionType, IconName> = {
  income: 'arrow-down-left',
  fixed_expense: 'repeat',
  variable_expense: 'coffee',
  debt_payment: 'file-text',
  adjustment: 'sliders',
};

export const ACCOUNT_TYPE_OPTIONS: readonly { value: AccountType; label: string; icon: IconName; color: string }[] = [
  { value: 'checking', label: 'Cuenta corriente', icon: 'credit-card', color: 'forest' },
  { value: 'cash', label: 'Efectivo', icon: 'dollar-sign', color: 'emerald' },
  { value: 'credit_card', label: 'Tarjeta de crédito', icon: 'credit-card', color: 'slate' },
  { value: 'savings', label: 'Ahorro', icon: 'archive', color: 'teal' },
];

export function getAccountTypeOption(type: AccountType) {
  return ACCOUNT_TYPE_OPTIONS.find((option) => option.value === type) ?? ACCOUNT_TYPE_OPTIONS[0]!;
}
