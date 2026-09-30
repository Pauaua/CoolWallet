import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText, Button, Card, Divider, ErrorState, LoadingState, Notice, Screen } from '@/components';
import { buildSalaryParams } from '@/features/profile/netSalary';
import { useWalletSummary } from '@/features/wallet/useWalletSummary';
import { formatLongDate } from '@/lib/dates';
import { formatCLP, formatPercent, PARAMS_DISCLAIMER, sumAmounts } from '@/lib/finance';
import { useTheme } from '@/theme';

/** Desglose del sueldo líquido calculado. */
export default function SalaryBreakdownScreen() {
  const { spacing } = useTheme();
  const wallet = useWalletSummary();

  if (wallet.isPending) return <LoadingState />;
  if (wallet.isError || !wallet.data) return <ErrorState onRetry={() => void wallet.refetch()} />;

  const { profile, settings, netSalary } = wallet.data;
  const { indicators, afpMandatoryRate } = buildSalaryParams(settings);
  const isHonorarios = profile.contractType === 'honorarios';

  const rows: { label: string; detail?: string; value: number }[] = isHonorarios
    ? [{ label: 'Retención de honorarios', value: netSalary.honorariosRetention }]
    : [
        { label: 'AFP', detail: `${profile.afpName ?? 'AFP'} · ${formatPercent((afpMandatoryRate + profile.afpCommissionRate) * 100, 2)}`, value: netSalary.afp },
        { label: 'Salud', detail: profile.healthSystem === 'fonasa' ? 'Fonasa · 7%' : `Isapre · ${profile.isapreUf ?? 0} UF`, value: netSalary.health },
        { label: 'Seguro de cesantía', value: netSalary.unemployment },
        { label: 'Impuesto único', detail: `Sobre ${formatCLP(netSalary.taxableIncome)} tributables`, value: netSalary.incomeTax },
      ];

  return (
    <Screen>
      <Card style={{ gap: spacing.xs }}>
        <AppText variant="caption" color="textSecondary">
          Sueldo líquido estimado
        </AppText>
        <AppText variant="display">{formatCLP(netSalary.net)}</AppText>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Row label="Sueldo bruto" value={formatCLP(netSalary.gross)} strong />
        <Divider />
        {rows.map((row) => (
          <Row key={row.label} label={row.label} detail={row.detail} value={`−${formatCLP(row.value)}`} />
        ))}
        <Divider />
        <Row label="Total descuentos" value={`−${formatCLP(netSalary.totalDiscounts)}`} strong />
        <Row label="Líquido" value={formatCLP(netSalary.net)} strong />
      </Card>

      {profile.otherIncome > 0 ? (
        <Card style={{ gap: spacing.md }}>
          <Row label="Otros ingresos" value={formatCLP(profile.otherIncome)} />
          <Row label="Ingreso mensual estimado" value={formatCLP(sumAmounts([netSalary.net, profile.otherIncome]))} strong />
        </Card>
      ) : null}

      <Notice
        message={`${PARAMS_DISCLAIMER} Cálculo con UF ${formatCLP(indicators.ufValue)} y UTM ${formatCLP(indicators.utmValue)} (${formatLongDate(indicators.asOf)}).`}
      />
      <Button label="Editar mis datos" variant="secondary" icon="edit-2" onPress={() => router.push('/perfil')} />
      <Button label="Actualizar UF y UTM" variant="ghost" onPress={() => router.push('/configuracion')} />
    </Screen>
  );
}

function Row({ label, detail, value, strong = false }: { label: string; detail?: string; value: string; strong?: boolean }) {
  return (
    <View accessible accessibilityLabel={`${label}${detail ? `, ${detail}` : ''}: ${value}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <AppText variant={strong ? 'bodyStrong' : 'body'}>{label}</AppText>
        {detail ? (
          <AppText variant="caption" color="textSecondary">
            {detail}
          </AppText>
        ) : null}
      </View>
      <AppText variant={strong ? 'bodyStrong' : 'body'}>{value}</AppText>
    </View>
  );
}
