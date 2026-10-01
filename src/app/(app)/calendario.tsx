import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText, Card, Divider, ErrorState, Icon, IconButton, LoadingState, Notice, Screen, SectionHeader } from '@/components';
import { buildCalendarEvents, buildMonthGrid, getMonthRange, groupEventsByDate, type CalendarEvent } from '@/features/calendar/calendarModel';
import { useDebtsSummary } from '@/features/debts/queries';
import { useFixedExpenses, useOccurrencesInRange } from '@/features/expenses/queries';
import { useSettings } from '@/features/settings/queries';
import { formatLongDate } from '@/lib/dates';
import { formatCLP, parseIsoDate, sumAmounts, toIsoDate } from '@/lib/finance';
import { MIN_TOUCH_TARGET, useTheme, type ColorTokens } from '@/theme';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;
const WEEKDAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'] as const;

const STATUS_META: Record<CalendarEvent['status'], { label: string; color: keyof ColorTokens; icon: 'check-circle' | 'clock' | 'alert-circle' }> = {
  paid: { label: 'Pagado', color: 'primary', icon: 'check-circle' },
  pending: { label: 'Pendiente', color: 'textSecondary', icon: 'clock' },
  overdue: { label: 'Vencido', color: 'danger', icon: 'alert-circle' },
};

/** Calendario mensual de vencimientos (gastos fijos y cuotas de deuda). */
export default function CalendarScreen() {
  const { colors, radius, spacing } = useTheme();
  const today = toIsoDate(new Date());
  const [month, setMonth] = useState(() => ({ year: new Date().getFullYear(), index: new Date().getMonth() }));
  const [selected, setSelected] = useState<string>(today);
  const range = useMemo(() => getMonthRange(month.year, month.index), [month]);

  const fixedExpenses = useFixedExpenses();
  const occurrences = useOccurrencesInRange({ from: range.start, to: range.end });
  const debts = useDebtsSummary();
  const settings = useSettings();

  const events = useMemo(() => {
    if (!fixedExpenses.data || !occurrences.data || !debts.data) return null;
    const allDebts = [...debts.data.active, ...debts.data.paid].map((view) => ({ id: view.debt.id, name: view.debt.name, finance: view.finance }));
    return buildCalendarEvents({ range, fixedExpenses: fixedExpenses.data, occurrences: occurrences.data, debts: allDebts, today });
  }, [fixedExpenses.data, occurrences.data, debts.data, range, today]);

  if (fixedExpenses.isPending || occurrences.isPending || debts.isPending) return <LoadingState />;
  if (fixedExpenses.isError || occurrences.isError || debts.isError || !events) return <ErrorState onRetry={() => void fixedExpenses.refetch()} />;

  const byDate = groupEventsByDate(events);
  const grid = buildMonthGrid(month.year, month.index);
  const monthLabel = format(new Date(month.year, month.index, 1), "MMMM 'de' yyyy", { locale: es });
  const selectedEvents = byDate.get(selected) ?? [];
  const pendingTotal = sumAmounts(events.filter((event) => event.status !== 'paid').map((event) => event.amount));

  const moveMonth = (delta: number) => {
    const next = new Date(month.year, month.index + delta, 1);
    setMonth({ year: next.getFullYear(), index: next.getMonth() });
    setSelected(toIsoDate(next));
  };

  const openEvent = (event: CalendarEvent) =>
    event.kind === 'fixed' ? router.push({ pathname: '/gasto-fijo', params: { id: event.refId } }) : router.push({ pathname: '/deuda/[id]', params: { id: event.refId } });

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <IconButton icon="chevron-left" accessibilityLabel="Mes anterior" onPress={() => moveMonth(-1)} />
        <AppText variant="heading" align="center" style={{ flex: 1, textTransform: 'capitalize' }} accessibilityRole="header">
          {monthLabel}
        </AppText>
        <IconButton icon="chevron-right" accessibilityLabel="Mes siguiente" onPress={() => moveMonth(1)} />
      </View>

      <Card style={{ gap: spacing.xs, paddingHorizontal: spacing.sm }}>
        <View style={{ flexDirection: 'row' }}>
          {WEEKDAYS.map((day, index) => (
            <AppText key={`${day}${index}`} variant="caption" color="textSecondary" align="center" style={{ flex: 1 }} accessibilityLabel={WEEKDAY_NAMES[index]}>
              {day}
            </AppText>
          ))}
        </View>
        {grid.map((week, weekIndex) => (
          <View key={weekIndex} style={{ flexDirection: 'row' }}>
            {week.map((date, dayIndex) => {
              if (!date) return <View key={dayIndex} style={{ flex: 1, minHeight: MIN_TOUCH_TARGET + 4 }} />;
              const dayEvents = byDate.get(date) ?? [];
              const isSelected = date === selected;
              const isToday = date === today;
              const hasOverdue = dayEvents.some((event) => event.status === 'overdue');
              const hasPending = dayEvents.some((event) => event.status === 'pending');
              return (
                <Pressable
                  key={date}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${formatLongDate(date)}${isToday ? ', hoy' : ''}. ${dayEvents.length === 0 ? 'Sin vencimientos' : `${dayEvents.length} ${dayEvents.length === 1 ? 'vencimiento' : 'vencimientos'}`}`}
                  onPress={() => setSelected(date)}
                  style={{
                    flex: 1,
                    minHeight: MIN_TOUCH_TARGET + 4,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    borderRadius: radius.md,
                    backgroundColor: isSelected ? colors.primarySoft : 'transparent',
                    borderWidth: isToday ? 1 : 0,
                    borderColor: colors.primary,
                  }}
                >
                  <AppText variant={isSelected ? 'bodyStrong' : 'body'} color={isSelected ? 'primary' : 'text'}>
                    {parseIsoDate(date).getDate()}
                  </AppText>
                  <View style={{ height: 6, flexDirection: 'row', gap: 2 }}>
                    {dayEvents.length > 0 ? (
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: hasOverdue ? colors.danger : hasPending ? colors.warning : colors.accent }} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </Card>
      <AppText variant="caption" color="textSecondary">
        Punto rojo: vencido · amarillo: pendiente · verde: pagado. Por pagar este mes: {formatCLP(pendingTotal)}.
      </AppText>

      <SectionHeader title={selected === today ? 'Hoy' : formatLongDate(selected)} />
      <Card style={{ paddingVertical: spacing.xs }}>
        {selectedEvents.length === 0 ? (
          <AppText color="textSecondary" style={{ paddingVertical: spacing.sm }}>
            Sin vencimientos este día.
          </AppText>
        ) : (
          selectedEvents.map((event, index) => <EventRow key={event.key} event={event} first={index === 0} onPress={() => openEvent(event)} />)
        )}
      </Card>

      <SectionHeader title="Todo el mes" />
      <Card style={{ paddingVertical: spacing.xs }}>
        {events.length === 0 ? (
          <AppText color="textSecondary" style={{ paddingVertical: spacing.sm }}>
            No hay vencimientos este mes.
          </AppText>
        ) : (
          events.map((event, index) => <EventRow key={event.key} event={event} first={index === 0} showDate onPress={() => openEvent(event)} />)
        )}
      </Card>

      {settings.data && !settings.data.notificationsEnabled ? (
        <Notice message="Activa los recordatorios en Configuración para recibir un aviso antes de cada vencimiento." />
      ) : null}
    </Screen>
  );
}

function EventRow({ event, first, showDate = false, onPress }: { event: CalendarEvent; first: boolean; showDate?: boolean; onPress: () => void }) {
  const { spacing } = useTheme();
  const status = STATUS_META[event.status];
  return (
    <View>
      {first ? null : <Divider />}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${event.title}, ${formatCLP(event.amount)}, ${event.detail}. ${status.label}${showDate ? `, ${formatLongDate(event.date)}` : ''}`}
        onPress={onPress}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: MIN_TOUCH_TARGET + 12, opacity: pressed ? 0.6 : 1 })}
      >
        <Icon name={event.kind === 'fixed' ? 'repeat' : 'file-text'} color="textSecondary" />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {event.title}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Icon name={status.icon} size={14} color={status.color} />
            <AppText variant="caption" color={status.color}>
              {status.label}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              · {showDate ? `${parseIsoDate(event.date).getDate()} · ` : ''}
              {event.detail}
            </AppText>
          </View>
        </View>
        <AppText variant="bodyStrong">{formatCLP(event.amount)}</AppText>
      </Pressable>
    </View>
  );
}
