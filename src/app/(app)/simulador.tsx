import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AmountField, AppText, Card, Divider, EmptyState, ErrorState, Icon, LoadingState, Notice, Screen, SectionHeader } from '@/components';
import { useDebtsSummary } from '@/features/debts/queries';
import { formatLongDate } from '@/lib/dates';
import { comparePayoffStrategies, estimateDebtFreeDate, formatAmountInput, formatCLP, parseCLPInput, toPayoffDebt, type PayoffResult } from '@/lib/finance';
import { useTheme } from '@/theme';

const DEFAULT_EXTRA = 50_000;

/** Simulador: bola de nieve (deuda más chica primero) vs avalancha (tasa más alta primero). */
export default function PayoffSimulatorScreen() {
  const { spacing } = useTheme();
  const debts = useDebtsSummary();
  const [extraText, setExtraText] = useState(formatAmountInput(DEFAULT_EXTRA));
  const extra = parseCLPInput(extraText) ?? 0;

  const payoffDebts = useMemo(() => (debts.data?.active ?? []).map((view) => toPayoffDebt(view.debt.id, view.finance)).filter((debt) => debt.balance > 0), [debts.data]);
  const comparison = useMemo(() => comparePayoffStrategies(payoffDebts, extra), [payoffDebts, extra]);

  if (debts.isPending) return <LoadingState />;
  if (debts.isError || !debts.data) return <ErrorState onRetry={() => void debts.refetch()} />;
  if (payoffDebts.length === 0) {
    return <EmptyState icon="trending-down" title="No hay deudas que simular" description="Agrega tus deudas para comparar estrategias de pago." action={{ label: 'Agregar deuda', onPress: () => router.push('/deuda-form') }} />;
  }

  const names = new Map(debts.data.active.map((view) => [view.debt.id, view.debt.name]));
  const { snowball, avalanche, baseline } = comparison;
  const bothFeasible = snowball.feasible && avalanche.feasible;
  const better =
    !bothFeasible ? null : avalanche.totalInterest < snowball.totalInterest ? 'avalanche' : snowball.totalInterest < avalanche.totalInterest ? 'snowball' : 'tie';

  return (
    <Screen>
      <AppText color="textSecondary">
        ¿Cuánto más podrías pagar cada mes, además de tus cuotas? El monto extra se aplica a una deuda a la vez y, al terminarla, su cuota se suma al extra.
      </AppText>
      <AmountField label="Pago extra mensual" value={extraText} onChangeText={setExtraText} />

      {better === 'avalanche' ? (
        <Notice icon="award" message={`Avalancha te ahorra ${formatCLP(snowball.totalInterest - avalanche.totalInterest)} en intereses frente a bola de nieve.`} />
      ) : better === 'snowball' ? (
        <Notice icon="award" message={`Bola de nieve te ahorra ${formatCLP(avalanche.totalInterest - snowball.totalInterest)} en intereses frente a avalancha.`} />
      ) : better === 'tie' ? (
        <Notice message="Ambas estrategias pagan lo mismo en intereses. Bola de nieve te da victorias más rápidas." />
      ) : null}

      <StrategyCard
        title="Bola de nieve"
        subtitle="Primero la deuda más chica"
        result={snowball}
        saved={comparison.snowballInterestSaved}
        names={names}
        highlighted={better === 'snowball'}
        today={debts.today}
      />
      <StrategyCard
        title="Avalancha"
        subtitle="Primero la tasa más alta"
        result={avalanche}
        saved={comparison.avalancheInterestSaved}
        names={names}
        highlighted={better === 'avalanche'}
        today={debts.today}
      />

      <SectionHeader title="Solo pagando las cuotas" />
      <Card style={{ gap: spacing.xs }}>
        {baseline.feasible ? (
          <AppText>
            Terminarías en {baseline.months} {baseline.months === 1 ? 'mes' : 'meses'} ({formatLongDate(estimateDebtFreeDate(debts.today, baseline.months))}) pagando {formatCLP(baseline.totalInterest)} en intereses.
          </AppText>
        ) : (
          <AppText>Sin pago extra, las deudas sin cuota fija (pendientes o variables) no terminan de pagarse, así que no hay punto de comparación para el ahorro.</AppText>
        )}
      </Card>
      <Notice message="Es una estimación: supone tasas constantes y que no sumas deudas nuevas. El interés se calcula mes a mes sobre el capital pendiente." />
    </Screen>
  );
}

type StrategyCardProps = {
  title: string;
  subtitle: string;
  result: PayoffResult;
  saved: number | null;
  names: ReadonlyMap<string, string>;
  highlighted: boolean;
  today: string;
};

function StrategyCard({ title, subtitle, result, saved, names, highlighted, today }: StrategyCardProps) {
  const { colors, spacing } = useTheme();
  return (
    <Card style={{ gap: spacing.md, borderColor: highlighted ? colors.primary : colors.border, borderWidth: highlighted ? 2 : 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <AppText variant="heading">{title}</AppText>
          <AppText variant="caption" color="textSecondary">
            {subtitle}
          </AppText>
        </View>
        {highlighted ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Icon name="award" size={16} color="primary" />
            <AppText variant="label" color="primary">
              Recomendada
            </AppText>
          </View>
        ) : null}
      </View>

      {result.feasible ? (
        <>
          <View style={{ flexDirection: 'row', gap: spacing.lg }}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color="textSecondary">
                Libre de deudas en
              </AppText>
              <AppText variant="amount">
                {result.months} {result.months === 1 ? 'mes' : 'meses'}
              </AppText>
              <AppText variant="caption" color="textSecondary">
                {formatLongDate(estimateDebtFreeDate(today, result.months))}
              </AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color="textSecondary">
                Intereses
              </AppText>
              <AppText variant="amount">{formatCLP(result.totalInterest)}</AppText>
              {saved !== null && saved > 0 ? (
                <AppText variant="caption" color="primary">
                  Ahorras {formatCLP(saved)}
                </AppText>
              ) : null}
            </View>
          </View>
          <Divider />
          <AppText variant="label" color="textSecondary">
            Orden de pago
          </AppText>
          {result.payoffOrder.map((item, index) => (
            <AppText key={item.id}>
              {index + 1}. {names.get(item.id) ?? 'Deuda'} · mes {item.month}
            </AppText>
          ))}
        </>
      ) : (
        <AppText color="danger">Con este monto las deudas no se terminan de pagar en 50 años: sube el pago extra.</AppText>
      )}
    </Card>
  );
}
