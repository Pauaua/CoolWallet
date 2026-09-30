import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';

import { AmountField, AppText, Button, Card, ChipGroup, EmptyState, ErrorState, FormScreen, LoadingState, Notice, SegmentedControl, TextField } from '@/components';
import { useCreateTransaction } from '@/features/wallet/queries';
import { adjustmentSchema, type AdjustmentFormOutput, type AdjustmentFormValues } from '@/features/wallet/schemas';
import { useWalletSummary } from '@/features/wallet/useWalletSummary';
import type { AccountWithBalance } from '@/features/wallet/walletSummary';
import { calcAdjustmentAmount, formatCLP, parseCLPInput, toIsoDate } from '@/lib/finance';
import { useTheme } from '@/theme';

/** Corregir el saldo de una cuenta al saldo real: se registra la diferencia como ajuste. */
export default function AdjustBalanceScreen() {
  const { accountId } = useLocalSearchParams<{ accountId?: string }>();
  const wallet = useWalletSummary();

  if (wallet.isPending) return <LoadingState />;
  if (wallet.isError || !wallet.data) return <ErrorState onRetry={() => void wallet.refetch()} />;
  const accounts = wallet.data.summary.accounts;
  if (accounts.length === 0) {
    return <EmptyState icon="credit-card" title="Aún no tienes cuentas" description="Crea una cuenta para poder ajustar su saldo." action={{ label: 'Crear cuenta', onPress: () => router.replace('/cuenta') }} />;
  }
  return <AdjustmentForm accounts={accounts} initialAccountId={accounts.some((a) => a.id === accountId) ? accountId! : accounts[0]!.id} />;
}

function AdjustmentForm({ accounts, initialAccountId }: { accounts: AccountWithBalance[]; initialAccountId: string }) {
  const { spacing } = useTheme();
  const create = useCreateTransaction();
  const { control, handleSubmit } = useForm<AdjustmentFormValues, unknown, AdjustmentFormOutput>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { accountId: initialAccountId, realBalance: '', isNegative: false, note: '' },
  });
  const [selectedId, balanceText, isNegative] = useWatch({ control, name: ['accountId', 'realBalance', 'isNegative'] });
  const selected = accounts.find((account) => account.id === selectedId);
  const typed = parseCLPInput(balanceText);
  const preview = selected && typed !== null ? calcAdjustmentAmount(selected.balance, isNegative ? -typed : typed) : null;

  const onSubmit = (values: AdjustmentFormOutput) => {
    const account = accounts.find((item) => item.id === values.accountId);
    if (!account) return;
    const amount = calcAdjustmentAmount(account.balance, values.realBalance);
    if (amount === 0) {
      router.back();
      return;
    }
    create.mutate(
      { type: 'adjustment', amount, date: toIsoDate(new Date()), accountId: account.id, categoryId: null, note: values.note ?? 'Ajuste de saldo' },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <FormScreen footer={<Button label="Guardar ajuste" icon="check" loading={create.isPending} onPress={() => void handleSubmit(onSubmit)()} />}>
      <AppText color="textSecondary">Si el saldo de la app no coincide con tu banco o billetera, ingresa el saldo real y registraremos la diferencia.</AppText>
      <Controller
        control={control}
        name="accountId"
        render={({ field }) => (
          <View style={{ gap: spacing.sm }}>
            <AppText variant="label" color="textSecondary">
              Cuenta
            </AppText>
            <ChipGroup accessibilityLabel="Cuenta" options={accounts.map((account) => ({ value: account.id, label: account.name }))} value={field.value} onChange={field.onChange} />
          </View>
        )}
      />
      {selected ? (
        <Card style={{ gap: spacing.xs }}>
          <AppText variant="caption" color="textSecondary">
            Saldo en la app
          </AppText>
          <AppText variant="amount">{formatCLP(selected.balance)}</AppText>
        </Card>
      ) : null}
      <Controller
        control={control}
        name="isNegative"
        render={({ field }) => (
          <SegmentedControl
            accessibilityLabel="Signo del saldo"
            options={[
              { value: 'positive', label: 'Saldo a favor' },
              { value: 'negative', label: 'Saldo en contra' },
            ]}
            value={field.value ? 'negative' : 'positive'}
            onChange={(value) => field.onChange(value === 'negative')}
          />
        )}
      />
      <Controller
        control={control}
        name="realBalance"
        render={({ field, fieldState }) => (
          <AmountField label="Saldo real" autoFocus value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="note"
        render={({ field, fieldState }) => <TextField label="Nota (opcional)" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />}
      />
      {preview !== null ? (
        <Notice message={preview === 0 ? 'El saldo ya coincide: no hace falta ajustar.' : `Se registrará un ajuste de ${preview > 0 ? '+' : ''}${formatCLP(preview)}.`} />
      ) : null}
      {create.isError ? <Notice tone="danger" message="No pudimos guardar el ajuste. Intenta de nuevo." /> : null}
    </FormScreen>
  );
}
