import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

import { Button, ErrorState, LoadingState, Notice } from '@/components';
import { TRANSACTION_TYPE_LABELS } from '@/features/wallet/labels';
import { MovementForm } from '@/features/wallet/MovementForm';
import { useAccounts, useDeleteTransaction, useTransaction, useUpdateTransaction } from '@/features/wallet/queries';
import { formatAmountInput, type TransactionType } from '@/lib/finance';
import type { CategoryKind } from '@/types/enums';

const CATEGORY_KINDS_BY_TYPE: Record<TransactionType, readonly CategoryKind[] | null> = {
  income: ['income'],
  fixed_expense: ['fixed', 'general'],
  variable_expense: ['variable', 'general'],
  debt_payment: null,
  adjustment: null,
};

/** Editar o eliminar un movimiento. */
export default function MovementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const transaction = useTransaction(id);
  const accounts = useAccounts();
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();

  if (transaction.isPending || accounts.isPending) return <LoadingState />;
  if (transaction.isError || accounts.isError || !transaction.data) return <ErrorState message="No encontramos este movimiento." />;

  const tx = transaction.data;
  // Los ajustes guardan el signo en el monto; se editan desde "Ajustar saldo".
  const isAdjustment = tx.type === 'adjustment';

  const confirmDelete = () =>
    Alert.alert('¿Eliminar este movimiento?', 'El saldo de la cuenta se recalculará.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate(tx.id, { onSuccess: () => router.back() }) },
    ]);

  return (
    <MovementForm
      intro={
        <Notice
          message={
            isAdjustment
              ? 'Este es un ajuste de saldo. Si ya no corresponde, elimínalo y vuelve a ajustar la cuenta.'
              : `${TRANSACTION_TYPE_LABELS[tx.type]}${tx.isSalary ? ' (sueldo)' : ''}`
          }
        />
      }
      defaultValues={{
        amount: formatAmountInput(Math.abs(tx.amount)),
        date: tx.date,
        accountId: tx.accountId ?? '',
        categoryId: tx.categoryId,
        note: tx.note ?? '',
      }}
      accounts={accounts.data}
      categoryKinds={CATEGORY_KINDS_BY_TYPE[tx.type]}
      submitLabel="Guardar cambios"
      submitting={update.isPending}
      errorMessage={update.isError || remove.isError ? 'No pudimos guardar los cambios. Intenta de nuevo.' : null}
      onSubmit={(values) => {
        const amount = isAdjustment ? Math.sign(tx.amount) * values.amount : values.amount;
        update.mutate({ id: tx.id, patch: { ...values, amount } }, { onSuccess: () => router.back() });
      }}
      extraActions={<Button label="Eliminar movimiento" variant="ghost" icon="trash-2" loading={remove.isPending} onPress={confirmDelete} />}
    />
  );
}
