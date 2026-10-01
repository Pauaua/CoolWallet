import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { AmountField, AppText, Button, ChipGroup, ColorIcon, DateField, EmptyState, ErrorState, FormScreen, LoadingState, Notice, TextField } from '@/components';
import { detectBudgetCrossing } from '@/features/budgets/budgetModel';
import { useBudgetsData } from '@/features/budgets/queries';
import { useCategories } from '@/features/categories/queries';
import { useAccounts, useCreateTransaction, useTransactions } from '@/features/wallet/queries';
import { formatAmountInput, formatCLP, getFrequentAmounts, parseCLPInput, toIsoDate } from '@/lib/finance';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

/**
 * Registro ultrarrápido de un gasto variable: toca un monto frecuente (o escríbelo)
 * y luego la categoría; al tocar la categoría se guarda.
 */
export default function QuickExpenseScreen() {
  const { spacing, radius, colors } = useTheme();
  const accounts = useAccounts();
  const categories = useCategories(['variable', 'general']);
  const history = useTransactions({ types: ['variable_expense'] });
  const create = useCreateTransaction();
  const budgets = useBudgetsData();

  const [amountText, setAmountText] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [date, setDate] = useState(toIsoDate(new Date()));
  const [note, setNote] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const frequentAmounts = useMemo(() => getFrequentAmounts((history.data ?? []).map((tx) => tx.amount)), [history.data]);
  // Cuenta por defecto: la del último gasto variable, o la primera.
  const defaultAccountId = history.data?.[0]?.accountId ?? accounts.data?.[0]?.id ?? null;
  const selectedAccountId = accountId ?? defaultAccountId;

  if (accounts.isPending || categories.isPending) return <LoadingState />;
  if (accounts.isError || categories.isError) return <ErrorState onRetry={() => void accounts.refetch()} />;
  if (accounts.data.length === 0) {
    return <EmptyState icon="credit-card" title="Primero crea una cuenta" description="Los gastos se descuentan de una cuenta o bolsillo." action={{ label: 'Crear cuenta', onPress: () => router.replace('/cuenta') }} />;
  }

  const amount = parseCLPInput(amountText);

  const save = (categoryId: string | null) => {
    if (amount === null || amount <= 0) {
      setError('Primero elige o escribe el monto.');
      return;
    }
    if (!selectedAccountId) {
      setError('Elige una cuenta.');
      return;
    }
    setError(null);
    create.mutate(
      { type: 'variable_expense', amount, date, accountId: selectedAccountId, categoryId, note: note.trim() || null },
      { onSuccess: () => warnIfBudgetCrossed(categoryId, amount) },
    );
  };

  /** Aviso al cruzar el 80% o el 100% del presupuesto de la categoría. */
  const warnIfBudgetCrossed = (categoryId: string | null, amount: number) => {
    const row = categoryId ? budgets.data?.rows.find((item) => item.budget.categoryId === categoryId) : undefined;
    const crossing = row ? detectBudgetCrossing(row.spent, amount, row.budget.monthlyLimit) : null;
    if (!row || !crossing) {
      router.back();
      return;
    }
    const name = row.category?.name ?? 'esta categoría';
    const spentAfter = row.spent + amount;
    Alert.alert(
      crossing === 'exceeded' ? `Superaste tu presupuesto de ${name}` : `Llegaste al 80% de tu presupuesto de ${name}`,
      `Llevas ${formatCLP(spentAfter)} de ${formatCLP(row.budget.monthlyLimit)} este mes.`,
      [{ text: 'Entendido', onPress: () => router.back() }],
    );
  };

  return (
    <FormScreen
      footer={
        <Button label={showMore ? 'Menos opciones' : 'Cambiar fecha, cuenta o nota'} variant="ghost" icon={showMore ? 'chevron-up' : 'chevron-down'} onPress={() => setShowMore((value) => !value)} />
      }
    >
      <AmountField label="Monto" value={amountText} onChangeText={(text) => { setError(null); setAmountText(text); }} placeholder="0" />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }} accessibilityLabel="Montos frecuentes">
        {frequentAmounts.map((value) => {
          const selected = amount === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Monto ${formatCLP(value)}`}
              onPress={() => {
                setError(null);
                setAmountText(formatAmountInput(value));
              }}
              style={({ pressed }) => ({
                minHeight: MIN_TOUCH_TARGET,
                justifyContent: 'center',
                paddingHorizontal: spacing.lg,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.primarySoft : colors.surface,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <AppText variant="bodyStrong" color={selected ? 'primary' : 'text'}>
                {formatCLP(value)}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <AppText variant="label" color="textSecondary">
        Toca la categoría para guardar
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {categories.data.map((category) => (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            accessibilityLabel={`Guardar en ${category.name}`}
            disabled={create.isPending}
            onPress={() => save(category.id)}
            style={({ pressed }) => ({
              width: '31%',
              minHeight: 88,
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.xs,
              padding: spacing.sm,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: pressed ? colors.primarySoft : colors.surface,
            })}
          >
            <ColorIcon icon={category.icon} colorKey={category.color} size={36} />
            <AppText variant="caption" align="center" numberOfLines={2}>
              {category.name}
            </AppText>
          </Pressable>
        ))}
      </View>
      <Button label="Guardar sin categoría" variant="secondary" loading={create.isPending} onPress={() => save(null)} />

      {error ? <Notice tone="warning" message={error} /> : null}
      {create.isError ? <Notice tone="danger" message="No pudimos guardar el gasto. Intenta de nuevo." /> : null}

      {showMore ? (
        <View style={{ gap: spacing.lg }}>
          <DateField label="Fecha" value={date} onChange={setDate} maximumDate={new Date()} />
          <View style={{ gap: spacing.sm }}>
            <AppText variant="label" color="textSecondary">
              Cuenta
            </AppText>
            <ChipGroup accessibilityLabel="Cuenta" options={accounts.data.map((account) => ({ value: account.id, label: account.name }))} value={selectedAccountId} onChange={setAccountId} />
          </View>
          <TextField label="Nota (opcional)" value={note} onChangeText={setNote} maxLength={120} placeholder="Ej.: almuerzo con el equipo" />
        </View>
      ) : null}
    </FormScreen>
  );
}
