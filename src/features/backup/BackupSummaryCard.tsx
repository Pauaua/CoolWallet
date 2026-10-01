import { View } from 'react-native';

import { AppText, Card, Divider } from '@/components';
import { formatLongDate } from '@/lib/dates';
import type { BackupSummary } from '@/services/backup/backupFormat';
import { useTheme } from '@/theme';

/** Resumen de un respaldo antes de importarlo. */
export function BackupSummaryCard({ summary, fileName }: { summary: BackupSummary; fileName: string }) {
  const { spacing } = useTheme();
  const rows: [string, number][] = [
    ['Movimientos', summary.transactions],
    ['Cuentas', summary.accounts],
    ['Categorías', summary.categories],
    ['Gastos fijos', summary.fixedExpenses],
    ['Deudas', summary.debts],
    ['Presupuestos', summary.budgets],
    ['Metas de ahorro', summary.savingsGoals],
  ];
  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ gap: 2 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {fileName}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          Creado el {formatLongDate(summary.exportedAt)}
          {summary.profileName ? ` · ${summary.profileName}` : ''}
        </AppText>
      </View>
      <Divider />
      {rows.map(([label, value]) => (
        <View key={label} accessible accessibilityLabel={`${label}: ${value}`} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText color="textSecondary">{label}</AppText>
          <AppText variant="bodyStrong">{value}</AppText>
        </View>
      ))}
    </Card>
  );
}
