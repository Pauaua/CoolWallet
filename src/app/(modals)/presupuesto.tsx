import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { AmountField, AppText, Button, ChipGroup, ErrorState, FormScreen, LoadingState, Notice } from '@/components';
import { useBudgetsData, useDeleteBudget, useUpsertBudget } from '@/features/budgets/queries';
import { formatAmountInput, formatCLP, parseCLPInput } from '@/lib/finance';
import { useTheme } from '@/theme';

/** Crear o editar el presupuesto mensual de una categoría. */
export default function BudgetScreen() {
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const navigation = useNavigation();
  const { spacing } = useTheme();
  const budgets = useBudgetsData();
  const upsert = useUpsertBudget();
  const remove = useDeleteBudget();
  const [categoryId, setCategoryId] = useState<string | null>(params.categoryId ?? null);
  const [amountText, setAmountText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const existing = budgets.data?.rows.find((row) => row.budget.categoryId === categoryId);
  useEffect(() => {
    navigation.setOptions({ title: params.categoryId ? 'Editar presupuesto' : 'Nuevo presupuesto' });
  }, [navigation, params.categoryId]);

  if (budgets.isPending) return <LoadingState />;
  if (budgets.isError || !budgets.data) return <ErrorState onRetry={() => void budgets.refetch()} />;

  const { rows, categories, previousSpentByCategory, spentByCategory } = budgets.data;
  const budgeted = new Set(rows.map((row) => row.budget.categoryId));
  const options = categories.filter((category) => category.kind !== 'income' && (!budgeted.has(category.id) || category.id === params.categoryId));
  const value = amountText ?? (existing ? formatAmountInput(existing.budget.monthlyLimit) : '');
  const selected = categories.find((category) => category.id === categoryId);

  const save = () => {
    const limit = parseCLPInput(value);
    if (!categoryId) return setError('Elige una categoría.');
    if (limit === null || limit <= 0) return setError('Ingresa un límite mayor a $0.');
    setError(null);
    upsert.mutate({ categoryId, monthlyLimit: limit }, { onSuccess: () => router.back() });
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert('¿Eliminar este presupuesto?', 'Tus gastos no cambian; solo dejarás de ver el límite.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate(existing.budget.id, { onSuccess: () => router.back() }) },
    ]);
  };

  return (
    <FormScreen
      footer={
        <>
          <Button label="Guardar presupuesto" icon="check" loading={upsert.isPending} onPress={save} />
          {existing ? <Button label="Eliminar presupuesto" variant="ghost" icon="trash-2" loading={remove.isPending} onPress={confirmDelete} /> : null}
        </>
      }
    >
      {params.categoryId ? (
        <AppText variant="heading">{selected?.name ?? 'Categoría'}</AppText>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="textSecondary">
            Categoría
          </AppText>
          {options.length === 0 ? (
            <AppText color="textSecondary">Todas tus categorías de gasto ya tienen presupuesto.</AppText>
          ) : (
            <ChipGroup accessibilityLabel="Categoría" options={options.map((category) => ({ value: category.id, label: category.name }))} value={categoryId} onChange={setCategoryId} />
          )}
        </View>
      )}
      <AmountField label="Límite mensual" value={value} onChangeText={setAmountText} />
      {categoryId ? (
        <AppText variant="caption" color="textSecondary">
          Este mes llevas {formatCLP(spentByCategory[categoryId] ?? 0)} · el mes anterior gastaste {formatCLP(previousSpentByCategory[categoryId] ?? 0)}.
        </AppText>
      ) : null}
      <Notice message="Te avisaremos cuando llegues al 80% y al 100% del límite." />
      {error ? <Notice tone="warning" message={error} /> : null}
      {upsert.isError || remove.isError ? <Notice tone="danger" message="No pudimos guardar el presupuesto. Intenta de nuevo." /> : null}
    </FormScreen>
  );
}
