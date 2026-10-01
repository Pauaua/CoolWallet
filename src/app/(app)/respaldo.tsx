import { useState } from 'react';
import { Alert, View } from 'react-native';

import { AppText, Button, Card, Divider, ErrorState, LoadingState, Notice, Screen, SectionHeader, SegmentedControl } from '@/components';
import { BACKUP_REMINDER_OPTIONS, daysSinceBackup, isBackupOverdue } from '@/features/backup/backupReminder';
import { BackupSummaryCard } from '@/features/backup/BackupSummaryCard';
import { useExportBackup, useImportBackup, usePickBackup } from '@/features/backup/useBackup';
import { confirmWipe } from '@/features/security/confirmWipe';
import { useResetApp } from '@/features/security/useResetApp';
import { useSettings, useUpdateSettings } from '@/features/settings/queries';
import { formatLongDate } from '@/lib/dates';
import { useTheme } from '@/theme';

/** Respaldo y datos: exportar/importar JSON, recordatorio y borrar todo. */
export default function BackupScreen() {
  const { spacing } = useTheme();
  const settings = useSettings();
  const update = useUpdateSettings();
  const exportBackup = useExportBackup();
  const pick = usePickBackup();
  const importBackup = useImportBackup();
  const reset = useResetApp();
  const [imported, setImported] = useState(false);

  if (settings.isPending) return <LoadingState />;
  if (settings.isError) return <ErrorState onRetry={() => void settings.refetch()} />;

  const { lastBackupAt, backupReminderDays, onboardingCompletedAt } = settings.data;
  const now = new Date();
  const days = daysSinceBackup(lastBackupAt, now);
  const overdue = isBackupOverdue(lastBackupAt, onboardingCompletedAt, backupReminderDays, now);
  const prepared = pick.data;

  const confirmImport = () => {
    if (!prepared?.ok) return;
    Alert.alert('¿Reemplazar todos tus datos?', 'Los datos actuales de la app se borrarán y quedarán los del respaldo. Tu PIN no cambia.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Reemplazar',
        style: 'destructive',
        onPress: () =>
          importBackup.mutate(prepared.backup, {
            onSuccess: () => {
              pick.reset();
              setImported(true);
            },
          }),
      },
    ]);
  };

  return (
    <Screen>
      <AppText color="textSecondary">
        Tus datos viven solo en este teléfono. Un respaldo es un archivo que puedes guardar en Drive, correo, WhatsApp o Archivos para recuperarlos si cambias o pierdes el teléfono.
      </AppText>

      <SectionHeader title="Exportar" />
      <Card style={{ gap: spacing.md }}>
        <AppText>
          Último respaldo: <AppText variant="bodyStrong">{lastBackupAt ? `${formatLongDate(lastBackupAt)}${days ? ` (hace ${days} ${days === 1 ? 'día' : 'días'})` : ' (hoy)'}` : 'nunca'}</AppText>
        </AppText>
        {overdue ? <Notice tone="warning" message="Ya toca respaldar tus datos." /> : null}
        <Button label="Exportar respaldo" icon="upload" loading={exportBackup.isPending} onPress={() => exportBackup.mutate()} />
        {exportBackup.isError ? <Notice tone="danger" message={exportBackup.error instanceof Error ? exportBackup.error.message : 'No pudimos crear el respaldo.'} /> : null}
        <Divider />
        <View style={{ gap: spacing.sm }}>
          <AppText variant="bodyStrong">Recordarme respaldar cada</AppText>
          <SegmentedControl
            accessibilityLabel="Frecuencia del recordatorio de respaldo"
            options={BACKUP_REMINDER_OPTIONS}
            value={backupReminderDays}
            onChange={(value) => update.mutate({ backupReminderDays: value })}
          />
          <AppText variant="caption" color="textSecondary">
            Te avisaremos en Inicio y, si activas las notificaciones en Configuración, con una notificación.
          </AppText>
        </View>
      </Card>

      <SectionHeader title="Importar" />
      <Card style={{ gap: spacing.md }}>
        <AppText color="textSecondary">Elige un archivo de respaldo. Verás un resumen antes de confirmar.</AppText>
        <Button label="Elegir archivo de respaldo" icon="download" variant="secondary" loading={pick.isPending} onPress={() => { setImported(false); pick.mutate(); }} />
      </Card>
      {prepared && !prepared.ok ? <Notice tone="danger" message={prepared.error} /> : null}
      {pick.isError ? <Notice tone="danger" message="No pudimos leer el archivo." /> : null}
      {prepared?.ok ? (
        <>
          <BackupSummaryCard summary={prepared.summary} fileName={prepared.name} />
          <Notice tone="warning" message="Importar reemplaza TODOS los datos actuales de la app por los del respaldo." />
          <Button label="Reemplazar mis datos" variant="danger" icon="refresh-cw" loading={importBackup.isPending} onPress={confirmImport} />
          <Button label="Cancelar" variant="ghost" onPress={() => pick.reset()} />
        </>
      ) : null}
      {importBackup.isError ? <Notice tone="danger" message="No pudimos importar el respaldo. Tus datos actuales no cambiaron." /> : null}
      {imported ? <Notice icon="check-circle" message="Respaldo importado. Tus datos ya están actualizados." /> : null}

      <SectionHeader title="Borrar todos los datos" />
      <Card style={{ gap: spacing.md }}>
        <AppText variant="caption" color="textSecondary">
          Elimina tu perfil, movimientos, deudas, metas y el PIN de este teléfono. No se puede deshacer: exporta un respaldo antes.
        </AppText>
        <Button label="Borrar todos los datos" icon="trash-2" variant="danger" loading={reset.isPending} onPress={() => confirmWipe(() => reset.mutate())} />
        {reset.isError ? <Notice tone="danger" message="No pudimos borrar los datos. Intenta de nuevo." /> : null}
      </Card>
    </Screen>
  );
}
