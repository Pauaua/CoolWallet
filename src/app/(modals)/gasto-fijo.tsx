import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, View } from 'react-native';

import { AmountField, AppText, Button, ChipGroup, DateField, ErrorState, FormScreen, LoadingState, Notice, SegmentedControl, SwitchRow, TextField } from '@/components';
import { useCategories } from '@/features/categories/queries';
import { FREQUENCY_OPTIONS } from '@/features/expenses/labels';
import { useDeleteFixedExpense, useFixedExpense, useSaveFixedExpense } from '@/features/expenses/queries';
import { fixedExpenseSchema, type FixedExpenseFormOutput, type FixedExpenseFormValues } from '@/features/expenses/schemas';
import { useAccounts } from '@/features/wallet/queries';
import { formatAmountInput, toIsoDate } from '@/lib/finance';
import { useTheme } from '@/theme';
import type { Account, Category, FixedExpense } from '@/types/models';

/** Crear (sin `id`) o editar un gasto fijo. */
export default function FixedExpenseScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const navigation = useNavigation();
  const expense = useFixedExpense(id);
  const categories = useCategories(['fixed', 'general']);
  const accounts = useAccounts();

  useEffect(() => {
    navigation.setOptions({ title: id ? 'Editar gasto fijo' : 'Nuevo gasto fijo' });
  }, [navigation, id]);

  if ((id && expense.isPending) || categories.isPending || accounts.isPending) return <LoadingState />;
  if ((id && !expense.data) || categories.isError || accounts.isError) return <ErrorState message="No encontramos este gasto fijo." />;
  return <FixedExpenseForm expense={expense.data ?? null} categories={categories.data} accounts={accounts.data} />;
}

function FixedExpenseForm({ expense, categories, accounts }: { expense: FixedExpense | null; categories: Category[]; accounts: Account[] }) {
  const { spacing } = useTheme();
  const save = useSaveFixedExpense();
  const remove = useDeleteFixedExpense();
  const { control, handleSubmit } = useForm<FixedExpenseFormValues, unknown, FixedExpenseFormOutput>({
    resolver: zodResolver(fixedExpenseSchema),
    defaultValues: {
      name: expense?.name ?? '',
      amount: expense ? formatAmountInput(expense.amount) : '',
      categoryId: expense?.categoryId ?? categories[0]?.id ?? null,
      accountId: expense?.accountId ?? accounts[0]?.id ?? null,
      dueDay: expense?.dueDay ?? new Date().getDate(),
      frequency: expense?.frequency ?? 'monthly',
      startDate: expense?.startDate ?? toIsoDate(new Date()),
      active: expense?.active ?? true,
      note: expense?.note ?? '',
    },
  });

  const onSubmit = (values: FixedExpenseFormOutput) =>
    save.mutate({ id: expense?.id, input: { ...values, endDate: expense?.endDate ?? null } }, { onSuccess: () => router.back() });

  const confirmDelete = () => {
    if (!expense) return;
    Alert.alert('¿Eliminar este gasto fijo?', 'Dejará de generarse cada mes. Los pagos ya registrados se conservan en el historial.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate(expense.id, { onSuccess: () => router.back() }) },
    ]);
  };

  return (
    <FormScreen
      footer={
        <>
          <Button label={expense ? 'Guardar cambios' : 'Agregar gasto fijo'} icon="check" loading={save.isPending} onPress={() => void handleSubmit(onSubmit)()} />
          {expense ? <Button label="Eliminar gasto fijo" variant="ghost" icon="trash-2" loading={remove.isPending} onPress={confirmDelete} /> : null}
        </>
      }
    >
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField label="Nombre" placeholder="Ej.: Arriendo" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="amount"
        render={({ field, fieldState }) => <AmountField label="Monto" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />}
      />
      <Controller
        control={control}
        name="frequency"
        render={({ field }) => (
          <View style={{ gap: spacing.xs }}>
            <AppText variant="label" color="textSecondary">
              Frecuencia
            </AppText>
            <SegmentedControl accessibilityLabel="Frecuencia" options={FREQUENCY_OPTIONS} value={field.value} onChange={field.onChange} />
          </View>
        )}
      />
      <Controller
        control={control}
        name="dueDay"
        render={({ field, fieldState }) => (
          <TextField
            label="Día de vencimiento"
            hint="Si el mes es más corto, vence el último día."
            keyboardType="number-pad"
            maxLength={2}
            value={Number.isNaN(field.value) ? '' : String(field.value)}
            onChangeText={(text) => field.onChange(text === '' ? NaN : Number(text.replace(/\D/g, '')))}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="startDate"
        render={({ field, fieldState }) => (
          <View style={{ gap: spacing.xs }}>
            <DateField label="Rige desde" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
            <AppText variant="caption" color="textSecondary">
              El primer vencimiento es el primero en o después de esta fecha. Para bimestrales y anuales, marca desde ahí cada cuánto se repite.
            </AppText>
          </View>
        )}
      />
      <Controller
        control={control}
        name="categoryId"
        render={({ field }) => (
          <View style={{ gap: spacing.sm }}>
            <AppText variant="label" color="textSecondary">
              Categoría
            </AppText>
            <ChipGroup accessibilityLabel="Categoría" options={categories.map((category) => ({ value: category.id, label: category.name }))} value={field.value} onChange={field.onChange} />
          </View>
        )}
      />
      {accounts.length > 0 ? (
        <Controller
          control={control}
          name="accountId"
          render={({ field }) => (
            <View style={{ gap: spacing.sm }}>
              <AppText variant="label" color="textSecondary">
                Se paga desde
              </AppText>
              <ChipGroup accessibilityLabel="Cuenta de pago" options={accounts.map((account) => ({ value: account.id, label: account.name }))} value={field.value} onChange={field.onChange} />
            </View>
          )}
        />
      ) : null}
      <Controller
        control={control}
        name="active"
        render={({ field }) => <SwitchRow label="Activo" description="Si lo pausas, deja de aparecer en los próximos meses." value={field.value} onValueChange={field.onChange} />}
      />
      <Controller
        control={control}
        name="note"
        render={({ field, fieldState }) => <TextField label="Nota (opcional)" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />}
      />
      {save.isError || remove.isError ? <Notice tone="danger" message="No pudimos guardar los cambios. Intenta de nuevo." /> : null}
    </FormScreen>
  );
}
