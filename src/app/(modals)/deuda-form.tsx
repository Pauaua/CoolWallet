import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';

import { AmountField, AppText, Button, ChipGroup, DateField, ErrorState, FormScreen, LoadingState, Notice, TextField } from '@/components';
import { DEBT_KIND_OPTIONS } from '@/features/debts/labels';
import { useDebts, useSaveDebt } from '@/features/debts/queries';
import { debtSchema, toDebtFormValues, toDebtInput, type DebtFormOutput, type DebtFormValues } from '@/features/debts/schemas';
import { useAccounts } from '@/features/wallet/queries';
import { calcInstallment, calcTotalInterest, formatCLP, parseCLPInput, parseDecimalInput, toIsoDate } from '@/lib/finance';
import { useTheme } from '@/theme';
import type { Account, Debt } from '@/types/models';

/** Crear (sin `id`) o editar una deuda. El tipo se elige solo al crear. */
export default function DebtFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const navigation = useNavigation();
  const debts = useDebts();
  const accounts = useAccounts();

  useEffect(() => {
    navigation.setOptions({ title: id ? 'Editar deuda' : 'Nueva deuda' });
  }, [navigation, id]);

  if (debts.isPending || accounts.isPending) return <LoadingState />;
  if (debts.isError || accounts.isError) return <ErrorState onRetry={() => void debts.refetch()} />;
  const debt = id ? debts.data.find((item) => item.id === id) : null;
  if (id && !debt) return <ErrorState message="No encontramos esta deuda." />;
  return <DebtForm debt={debt ?? null} accounts={accounts.data} />;
}

function DebtForm({ debt, accounts }: { debt: Debt | null; accounts: Account[] }) {
  const { spacing } = useTheme();
  const save = useSaveDebt();
  const { control, handleSubmit } = useForm<DebtFormValues, unknown, DebtFormOutput>({
    resolver: zodResolver(debtSchema),
    defaultValues: toDebtFormValues(debt, toIsoDate(new Date())),
  });
  const [kind, principalText, totalText, rateText, installmentText] = useWatch({
    control,
    name: ['kind', 'principal', 'installmentsTotal', 'monthlyRatePercent', 'installmentAmount'],
  });
  const isInstallment = kind === 'installment';

  // Vista previa de la cuota (fórmula francesa) cuando no se ingresa el valor exacto.
  const principal = parseCLPInput(principalText) ?? 0;
  const total = Number(totalText) || 0;
  const rate = (parseDecimalInput(rateText) ?? 0) / 100;
  const estimated = isInstallment && installmentText.trim() === '' && principal > 0 && total > 0 ? calcInstallment(principal, rate, total) : null;

  const onSubmit = (values: DebtFormOutput) => save.mutate({ id: debt?.id, input: toDebtInput(values) }, { onSuccess: () => router.back() });

  return (
    <FormScreen footer={<Button label={debt ? 'Guardar cambios' : 'Agregar deuda'} icon="check" loading={save.isPending} onPress={() => void handleSubmit(onSubmit)()} />}>
      {debt ? null : (
        <Controller
          control={control}
          name="kind"
          render={({ field }) => (
            <View style={{ gap: spacing.sm }}>
              <AppText variant="label" color="textSecondary">
                Tipo de deuda
              </AppText>
              <ChipGroup accessibilityLabel="Tipo de deuda" options={DEBT_KIND_OPTIONS.map(({ value, label }) => ({ value, label }))} value={field.value} onChange={field.onChange} />
              <AppText variant="caption" color="textSecondary">
                {DEBT_KIND_OPTIONS.find((option) => option.value === field.value)?.description}
              </AppText>
            </View>
          )}
        />
      )}
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            label="Nombre"
            placeholder={isInstallment ? 'Ej.: Crédito de consumo' : 'Ej.: Préstamo de Juan'}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="creditor"
        render={({ field, fieldState }) => (
          <TextField
            label={isInstallment ? 'Institución (opcional)' : 'A quién le debes (opcional)'}
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="principal"
        render={({ field, fieldState }) => (
          <AmountField
            label={isInstallment ? 'Monto financiado' : 'Monto que debes'}
            hint={isInstallment ? 'El monto del crédito, sin intereses.' : undefined}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="startDate"
        render={({ field, fieldState }) => <DateField label={isInstallment ? 'Fecha del crédito' : 'Fecha'} value={field.value} onChange={field.onChange} maximumDate={new Date()} error={fieldState.error?.message} />}
      />

      {isInstallment ? (
        <>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="installmentsTotal"
                render={({ field, fieldState }) => (
                  <TextField label="Número de cuotas" keyboardType="number-pad" maxLength={3} value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
                )}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="installmentsPaidInitial"
                render={({ field, fieldState }) => (
                  <TextField label="Cuotas ya pagadas" keyboardType="number-pad" maxLength={3} value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
                )}
              />
            </View>
          </View>
          <Controller
            control={control}
            name="monthlyRatePercent"
            render={({ field, fieldState }) => (
              <TextField
                label="Tasa de interés mensual (opcional)"
                hint="Aparece en tu contrato o cartola, ej.: 1,5%."
                keyboardType="decimal-pad"
                suffix="%"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="installmentAmount"
            render={({ field, fieldState }) => (
              <AmountField
                label="Valor de la cuota (opcional)"
                hint="Si lo dejas vacío, lo calculamos con la tasa."
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          {estimated !== null ? (
            <Notice message={`Cuota estimada: ${formatCLP(estimated)} · interés total ${formatCLP(calcTotalInterest(principal, estimated, total))}.`} />
          ) : null}
          <Controller
            control={control}
            name="firstPaymentDate"
            render={({ field, fieldState }) => (
              <View style={{ gap: spacing.xs }}>
                <DateField label="Fecha de la primera cuota" value={field.value || toIsoDate(new Date())} onChange={field.onChange} error={fieldState.error?.message} />
                <AppText variant="caption" color="textSecondary">
                  Las siguientes cuotas vencen el mismo día de cada mes.
                </AppText>
              </View>
            )}
          />
        </>
      ) : (
        <Controller
          control={control}
          name="dueDate"
          render={({ field, fieldState }) => (
            <View style={{ gap: spacing.sm }}>
              {field.value ? (
                <>
                  <DateField label="Fecha límite" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
                  <Button label="Quitar fecha límite" variant="ghost" onPress={() => field.onChange('')} />
                </>
              ) : (
                <Button label="Agregar fecha límite (opcional)" variant="secondary" icon="calendar" onPress={() => field.onChange(toIsoDate(new Date()))} />
              )}
            </View>
          )}
        />
      )}

      {accounts.length > 0 ? (
        <Controller
          control={control}
          name="accountId"
          render={({ field }) => (
            <View style={{ gap: spacing.sm }}>
              <AppText variant="label" color="textSecondary">
                Normalmente la pagas desde
              </AppText>
              <ChipGroup accessibilityLabel="Cuenta de pago" options={accounts.map((account) => ({ value: account.id, label: account.name }))} value={field.value} onChange={field.onChange} />
            </View>
          )}
        />
      ) : null}
      <Controller
        control={control}
        name="note"
        render={({ field, fieldState }) => <TextField label="Nota (opcional)" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />}
      />
      {save.isError ? <Notice tone="danger" message="No pudimos guardar la deuda. Intenta de nuevo." /> : null}
    </FormScreen>
  );
}
