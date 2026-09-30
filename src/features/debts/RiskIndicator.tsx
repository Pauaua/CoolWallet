import { View } from 'react-native';

import { AppText, Icon } from '@/components';
import { formatPercent, type DebtRiskLevel } from '@/lib/finance';
import { useTheme } from '@/theme';

import { DEBT_RISK_META } from './labels';

/** Semáforo deuda/ingreso: ícono + etiqueta + color + explicación. */
export function RiskIndicator({ ratio, risk }: { ratio: number | null; risk: DebtRiskLevel }) {
  const { colors, radius, spacing } = useTheme();
  const meta = DEBT_RISK_META[risk];
  return (
    <View
      accessible
      accessibilityLabel={`Ratio deuda ingreso ${ratio === null ? 'sin calcular' : formatPercent(ratio)}. ${meta.label}. ${meta.description}`}
      style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors[meta.color] }}
    >
      <Icon name={meta.icon} color={meta.color} size={26} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'baseline' }}>
          <AppText variant="heading">{ratio === null ? '—' : formatPercent(ratio)}</AppText>
          <AppText variant="bodyStrong" color={meta.color}>
            {meta.label}
          </AppText>
        </View>
        <AppText variant="caption" color="textSecondary">
          Ratio deuda/ingreso. {meta.description}
        </AppText>
      </View>
    </View>
  );
}
