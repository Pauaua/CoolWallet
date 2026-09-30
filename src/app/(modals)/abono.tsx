import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { AmountField, AppText, Button, Card, ChipGroup, DateField, EmptyState, ErrorState, FormScreen, LoadingState, Notice, SwitchRow } from '@/components';
import type { DebtView } from '@/features/debts/debtModel';
import { useAddDebtPayment, useDebtsSummary } from '@/features/debts/queries';
import { createPaymentSchema, type PaymentFormOutput, type PaymentFormValues } from '@/features/debts/schemas';
import { useAccounts } from '@/features/wallet/queries';
import { formatAmountInput, formatCLP, toIsoDate } from '@/lib/finance';
import { useTheme } from '@/theme';
import type { Account } from '@/types/models';

/** Registrar un pago de cuota o un abono a una deuda (se descuenta de la billetera). */
export default function DebtPaymentScreen() {
  const { debtId } = useLocalSearchParams<{ debtId: string }>();
  const debts = useDebtsSummary();
  const accounts = useAccounts();

  if (debts.isPending || accounts.isPending) return <LoadingState />;
  if (debts.isError || accounts.isError || !debts.data) return <ErrorState onRetry={() => void debts.refetch()} />;
  const view = debts.data.active.find((item) => item.debt.id === debtId);
  if (!view) return <ErrorState message="Esta deuda ya está pagada o no existe." />;
  if (accounts.data.length === 0) {
    return <EmptyState icon="credit-card" title="Primero crea una cuenta" description="Los pagos se descuentan de una cuenta o bolsillo." action={{ label: 'Crear cuenta', onPress: () => router.replace('/cuenta') }} />;
  }
  return <PaymentForm view={view} accounts={accounts.data} />;
}

function PaymentForm({ view, accounts }: { view: DebtView; accounts: Account[] }) {
  const { spacing } = useTheme();
  const add = useAddDebtPayment();
  const isInstallment = view.debt.kind === 'installment';
  const schema = useMemo(() => createPaymentSchema(view.remainingBalance), [view.remainingBalance]);
  const suggested = isInstallment ? Math.min(view.installmentAmount, view.remainingBalance) : 0;
  const { control, handleSubmit } = useForm<PaymentFormValues, unknown, PaymentFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: suggested > 0 ? formatAmountInput(suggested) : '',
      date: toIsoDate(new Date()),
      accountId: view.debt.accountId && accounts.some((a) => a.id === view.debt.accountId) ? view.debt.accountId : (accounts[0]?.id ?? ''),
      isInstallment,
    },
  });

  const onSubmit = (values: PaymentFormOutput) =>
    add.mutate({ debtId: view.debt.id, payment: { ...values, isInstallment: isInstallment && values.isInstallment } }, { onSuccess: () => router.back() });

  return (
    <FormScreen footer={<Button label="Registrar pago" icon="check" loading={add.isPending} onPress={() => void handleSubmit(onSubmit)()} />}>
      <Card style={{ gap: spacing.xs }}>
        <AppText variant="bodyStrong">{view.debt.name}</AppText>
        <AppText variant="caption" color="textSecondary">
          Por pagar {formatCLP(view.remainingBalance)}
          {isInstallment ? ` · cuota ${formatCLP(view.installmentAmount)}` : ''}
        </AppText>
      </Card>
      <Controller
        control={control}
        name="amount"
        render={({ field, fieldState }) => <AmountField label="Monto" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />}
      />
      <Controller
        control={control}
        name="date"
        render={({ field, fieldState }) => <DateField label="Fecha" value={field.value} onChange={field.onChange} maximumDate={new Date()} error={fieldState.error?.message} />}
      />
      <Controller
        control={control}
        name="accountId"
        render={({ field, fieldState }) => (
          <View style={{ gap: spacing.sm }}>
            <AppText variant="label" color="textSecondary">
              Pagas desde
            </AppText>
            <ChipGroup accessibilityLabel="Cuenta de pago" options={accounts.map((account) => ({ value: account.id, label: account.name }))} value={field.value} onChange={field.onChange} />
            {fieldState.error ? (
              <AppText variant="caption" color="danger">
                {fieldState.error.message}
              </AppText>
            ) : null}
          </View>
        )}
      />
      {isInstallment ? (
        <Controller
          control={control}
          name="isInstallment"
          render={({ field }) => (
            <SwitchRow
              label="Es el pago de una cuota"
              description="Desactívalo si es un abono extra: descuenta del saldo pero no avanza el número de cuota."
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />
      ) : null}
      <Notice message="El pago se registra como movimiento en la Billetera y se descuenta del saldo de la cuenta." />
      {add.isError ? <Notice tone="danger" message="No pudimos registrar el pago. Intenta de nuevo." /> : null}
    </FormScreen>
  );
}
