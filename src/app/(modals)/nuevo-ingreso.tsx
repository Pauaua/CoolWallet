import { router } from 'expo-router';

import { EmptyState, ErrorState, LoadingState } from '@/components';
import { MovementForm } from '@/features/wallet/MovementForm';
import { useAccounts, useCreateTransaction } from '@/features/wallet/queries';
import { toIsoDate } from '@/lib/finance';

/** Registrar un ingreso extra (venta, bono, regalo…). */
export default function NewIncomeScreen() {
  const accounts = useAccounts();
  const create = useCreateTransaction();

  if (accounts.isPending) return <LoadingState />;
  if (accounts.isError) return <ErrorState onRetry={() => void accounts.refetch()} />;
  if (accounts.data.length === 0) {
    return <EmptyState icon="credit-card" title="Primero crea una cuenta" description="Los ingresos se registran en una cuenta o bolsillo." action={{ label: 'Crear cuenta', onPress: () => router.replace('/cuenta') }} />;
  }

  return (
    <MovementForm
      defaultValues={{ amount: '', date: toIsoDate(new Date()), accountId: accounts.data[0]?.id ?? '', categoryId: null, note: '' }}
      accounts={accounts.data}
      categoryKinds={['income']}
      submitLabel="Guardar ingreso"
      submitting={create.isPending}
      errorMessage={create.isError ? 'No pudimos guardar el ingreso. Intenta de nuevo.' : null}
      onSubmit={(values) => create.mutate({ type: 'income', ...values }, { onSuccess: () => router.back() })}
    />
  );
}
