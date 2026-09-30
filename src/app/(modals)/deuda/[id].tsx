import { router, useLocalSearchParams } from 'expo-router';
import { Alert, View } from 'react-native';

import { AppText, Button, Card, Divider, ErrorState, Icon, IconButton, LoadingState, Notice, ProgressBar, Screen, SectionHeader } from '@/components';
import { DEBT_STATUS_META, getDebtKindOption } from '@/features/debts/labels';
import { useDebtsSummary, useDeleteDebt, useRemoveDebtPayment } from '@/features/debts/queries';
import { formatLongDate, formatShortDate } from '@/lib/dates';
import { formatCLP, formatPercent } from '@/lib/finance';
import { useTheme } from '@/theme';

/** Detalle de una deuda: avance, datos clave, abonos y acciones. */
export default function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { spacing } = useTheme();
  const debts = useDebtsSummary();
  const removePayment = useRemoveDebtPayment();
  const removeDebt = useDeleteDebt();

  if (debts.isPending) return <LoadingState />;
  if (debts.isError || !debts.data) return <ErrorState onRetry={() => void debts.refetch()} />;
  const view = [...debts.data.active, ...debts.data.paid].find((item) => item.debt.id === id);
  if (!view) return <ErrorState message="No encontramos esta deuda. Puede que se haya eliminado." />;

  const { debt } = view;
  const status = DEBT_STATUS_META[view.status];
  const isInstallment = debt.kind === 'installment';

  const facts: { label: string; value: string }[] = isInstallment
    ? [
        { label: 'Monto financiado', value: formatCLP(debt.principal) },
        { label: 'Valor cuota', value: formatCLP(view.installmentAmount) },
        { label: 'Cuotas', value: `${view.installmentsPaid} de ${debt.installmentsTotal ?? 0} pagadas` },
        { label: 'Cuotas restantes', value: String(view.remainingInstallments ?? 0) },
        { label: 'Tasa mensual', value: debt.monthlyRate ? formatPercent(debt.monthlyRate * 100, 2) : 'Sin interés' },
        { label: 'Próxima cuota', value: view.nextDueDate ? formatLongDate(view.nextDueDate) : '—' },
        { label: 'Término estimado', value: view.endDate ? formatLongDate(view.endDate) : '—' },
        { label: 'Interés pagado', value: formatCLP(view.interest.paid) },
        { label: 'Interés por pagar', value: formatCLP(view.interest.pending) },
      ]
    : [
        { label: 'Monto original', value: formatCLP(debt.principal) },
        { label: 'Abonado', value: formatCLP(view.paidAmount) },
        ...(debt.creditor ? [{ label: 'A quién', value: debt.creditor }] : []),
        ...(debt.startDate ? [{ label: 'Fecha', value: formatLongDate(debt.startDate) }] : []),
        { label: 'Fecha límite', value: debt.dueDate ? formatLongDate(debt.dueDate) : 'Sin fecha' },
      ];

  const confirmRemovePayment = (paymentId: string) =>
    Alert.alert('¿Eliminar este abono?', 'También se eliminará el movimiento de la Billetera y el saldo se recalculará.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => removePayment.mutate(paymentId) },
    ]);

  const confirmRemoveDebt = () =>
    Alert.alert('¿Eliminar esta deuda?', 'Dejará de aparecer en tus deudas. Los abonos ya registrados se conservan en el historial de la Billetera.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => removeDebt.mutate(debt.id, { onSuccess: () => router.back() }) },
    ]);

  return (
    <Screen>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="title" accessibilityRole="header">
          {debt.name}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {getDebtKindOption(debt.kind).label}
          {debt.creditor && isInstallment ? ` · ${debt.creditor}` : ''}
        </AppText>
      </View>

      <Card style={{ gap: spacing.md }}>
        <AppText variant="caption" color="textSecondary">
          Por pagar
        </AppText>
        <AppText variant="display">{formatCLP(view.remainingBalance)}</AppText>
        <ProgressBar value={view.progress} accessibilityLabel="Avance del pago" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Icon name={status.icon} size={16} color={status.color} />
          <AppText variant="label" color={status.color}>
            {status.label}
          </AppText>
          <View style={{ flex: 1 }} />
          <AppText variant="caption" color="textSecondary">
            {formatPercent(view.progress)} pagado
          </AppText>
        </View>
        {view.remainingBalance > 0 ? (
          <Button label={isInstallment ? 'Registrar pago de cuota' : 'Registrar abono'} icon="plus" onPress={() => router.push({ pathname: '/abono', params: { debtId: debt.id } })} />
        ) : null}
      </Card>

      <Card style={{ gap: spacing.md }}>
        {facts.map((fact, index) => (
          <View key={fact.label} style={{ gap: spacing.md }}>
            {index > 0 ? <Divider /> : null}
            <View accessible accessibilityLabel={`${fact.label}: ${fact.value}`} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
              <AppText color="textSecondary">{fact.label}</AppText>
              <AppText variant="bodyStrong" style={{ flexShrink: 1, textAlign: 'right' }}>
                {fact.value}
              </AppText>
            </View>
          </View>
        ))}
      </Card>
      {isInstallment && !debt.monthlyRate ? <Notice message="Sin tasa de interés registrada: el interés se muestra en $0. Puedes agregarla editando la deuda." /> : null}

      <SectionHeader title="Abonos registrados" />
      <Card style={{ paddingVertical: spacing.xs }}>
        {view.payments.length === 0 ? (
          <AppText color="textSecondary" style={{ paddingVertical: spacing.sm }}>
            Aún no registras pagos en la app.
            {isInstallment && debt.installmentsPaidInitial > 0 ? ` Ya tenías ${debt.installmentsPaidInitial} cuotas pagadas antes.` : ''}
          </AppText>
        ) : (
          view.payments.map((payment, index) => (
            <View key={payment.id}>
              {index > 0 ? <Divider /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{formatCLP(payment.amount)}</AppText>
                  <AppText variant="caption" color="textSecondary">
                    {formatShortDate(payment.date)}
                    {payment.isInstallment ? ' · cuota' : ' · abono'}
                  </AppText>
                </View>
                <IconButton icon="trash-2" color="textSecondary" accessibilityLabel={`Eliminar abono de ${formatCLP(payment.amount)}`} onPress={() => confirmRemovePayment(payment.id)} />
              </View>
            </View>
          ))
        )}
      </Card>
      {removePayment.isError || removeDebt.isError ? <Notice tone="danger" message="No pudimos completar la acción. Intenta de nuevo." /> : null}

      <Button label="Editar deuda" variant="secondary" icon="edit-2" onPress={() => router.push({ pathname: '/deuda-form', params: { id: debt.id } })} />
      <Button label="Eliminar deuda" variant="ghost" icon="trash-2" loading={removeDebt.isPending} onPress={confirmRemoveDebt} />
    </Screen>
  );
}
