import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText, Avatar, Button, Card, Divider, ErrorState, Icon, ListLink, LoadingState, Screen, SectionHeader, StatCard } from '@/components';
import { isBackupOverdue } from '@/features/backup/backupReminder';
import { useBudgetsData } from '@/features/budgets/queries';
import { DEBT_RISK_META } from '@/features/debts/labels';
import { useDebtsSummary } from '@/features/debts/queries';
import { SalaryPendingCard } from '@/features/wallet/SalaryPendingCard';
import { useWalletSummary } from '@/features/wallet/useWalletSummary';
import { formatLongDate, formatPeriodRange } from '@/lib/dates';
import { formatCLP, formatPercent } from '@/lib/finance';
import { useTheme } from '@/theme';

/** Inicio: saludo, resumen rápido y acceso a perfil, configuración y seguridad. */
export default function HomeScreen() {
  const { spacing } = useTheme();
  const wallet = useWalletSummary();
  const debts = useDebtsSummary();
  const budgets = useBudgetsData();

  if (wallet.isPending) return <LoadingState />;
  if (wallet.isError || !wallet.data) return <ErrorState onRetry={() => void wallet.refetch()} />;

  const { profile, settings, netSalary, summary } = wallet.data;
  const firstName = profile.name.split(' ')[0] ?? profile.name;

  return (
    <Screen>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Hola, ${firstName}. Ver perfil`}
        onPress={() => router.push('/perfil')}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, opacity: pressed ? 0.7 : 1 })}
      >
        <Avatar name={profile.name} photoUri={profile.photoUri} size={56} />
        <View style={{ flex: 1 }}>
          <AppText variant="title">Hola, {firstName}</AppText>
          <AppText variant="caption" color="textSecondary">
            Mes financiero: {formatPeriodRange(summary.period.start, summary.period.end)}
          </AppText>
        </View>
      </Pressable>

      {isBackupOverdue(settings.lastBackupAt, settings.onboardingCompletedAt, settings.backupReminderDays, new Date()) ? (
        <Card style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <Icon name="database" color="warningText" />
            <AppText variant="bodyStrong" style={{ flex: 1 }}>
              {settings.lastBackupAt ? `Tu último respaldo fue el ${formatLongDate(settings.lastBackupAt)}` : 'Aún no respaldas tus datos'}
            </AppText>
          </View>
          <AppText variant="caption" color="textSecondary">
            Si pierdes o cambias el teléfono, el respaldo es la única forma de recuperarlos.
          </AppText>
          <Button label="Respaldar ahora" icon="upload" variant="secondary" onPress={() => router.push('/respaldo')} />
        </Card>
      ) : null}

      {budgets.data && budgets.data.totals.alerts > 0 ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/presupuestos')} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
          <Card style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <Icon name="alert-triangle" color="warningText" />
            <AppText style={{ flex: 1 }}>
              {budgets.data.totals.alerts === 1 ? '1 presupuesto llegó al 80% o más' : `${budgets.data.totals.alerts} presupuestos llegaron al 80% o más`}
            </AppText>
            <Icon name="chevron-right" size={18} color="textSecondary" />
          </Card>
        </Pressable>
      ) : null}

      {summary.salaryPending ? <SalaryPendingCard expectedSalary={netSalary.net} accounts={summary.accounts} /> : null}

      <SectionHeader title="Resumen" />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <StatCard icon="briefcase" label="Sueldo líquido" value={formatCLP(netSalary.net)} caption="Calculado · ver detalle" onPress={() => router.push('/sueldo')} />
        <StatCard
          icon="shopping-bag"
          label="Gastado este mes"
          value={formatCLP(summary.spent)}
          caption={summary.spentPercentage === null ? 'Sin ingreso registrado' : `${formatPercent(summary.spentPercentage)} de tu ingreso`}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <StatCard
          icon="credit-card"
          label="Disponible"
          value={formatCLP(summary.available)}
          valueColor={summary.available < 0 ? 'danger' : 'text'}
          caption="En tus cuentas hoy"
          onPress={() => router.push('/billetera')}
        />
        <StatCard
          icon="file-text"
          label="Deudas"
          value={debts.data ? formatCLP(debts.data.totalDebt) : '—'}
          caption={
            !debts.data
              ? debts.isError
                ? 'No pudimos cargar tus deudas'
                : 'Cargando…'
              : debts.data.active.length === 0
                ? 'Sin deudas pendientes'
                : `${DEBT_RISK_META[debts.data.risk].label} · ${debts.data.ratio === null ? 'sin ratio' : formatPercent(debts.data.ratio)} de tu ingreso en cuotas`
          }
          onPress={() => router.push('/deudas')}
        />
      </View>

      <SectionHeader title="Tu cuenta" />
      <Card style={{ padding: 0 }}>
        <ListLink icon="user" title="Perfil y sueldo" description="Nombre, foto, AFP, salud y otros ingresos" onPress={() => router.push('/perfil')} />
        <Divider />
        <ListLink icon="settings" title="Configuración" description="Mes financiero, tema, moneda e indicadores" onPress={() => router.push('/configuracion')} />
        <Divider />
        <ListLink icon="shield" title="Seguridad" description="PIN, huella o Face ID y bloqueo automático" onPress={() => router.push('/seguridad')} />
        <Divider />
        <ListLink icon="database" title="Respaldo y datos" description="Exportar o importar tu respaldo, borrar datos" onPress={() => router.push('/respaldo')} />
      </Card>
    </Screen>
  );
}
