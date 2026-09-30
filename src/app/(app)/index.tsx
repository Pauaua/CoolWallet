import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText, Avatar, Card, Divider, ErrorState, ListLink, LoadingState, Screen, SectionHeader, StatCard } from '@/components';
import { DEBT_RISK_META } from '@/features/debts/labels';
import { useDebtsSummary } from '@/features/debts/queries';
import { SalaryPendingCard } from '@/features/wallet/SalaryPendingCard';
import { useWalletSummary } from '@/features/wallet/useWalletSummary';
import { formatPeriodRange } from '@/lib/dates';
import { formatCLP, formatPercent } from '@/lib/finance';
import { useTheme } from '@/theme';

/** Inicio: saludo, resumen rápido y acceso a perfil, configuración y seguridad. */
export default function HomeScreen() {
  const { spacing } = useTheme();
  const wallet = useWalletSummary();
  const debts = useDebtsSummary();

  if (wallet.isPending) return <LoadingState />;
  if (wallet.isError || !wallet.data) return <ErrorState onRetry={() => void wallet.refetch()} />;

  const { profile, netSalary, summary } = wallet.data;
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
      </Card>
    </Screen>
  );
}
