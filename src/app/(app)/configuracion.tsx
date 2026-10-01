import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { AmountField, AppText, Button, Card, Divider, ErrorState, LoadingState, Notice, Screen, SectionHeader, SegmentedControl, SwitchRow } from '@/components';
import { buildSalaryParams } from '@/features/profile/netSalary';
import { useProfile } from '@/features/profile/queries';
import { useSettings, useUpdateSettings } from '@/features/settings/queries';
import { indicatorsSchema, type IndicatorsFormOutput, type IndicatorsFormValues } from '@/features/settings/indicatorsSchema';
import { formatLongDate } from '@/lib/dates';
import { formatAmountInput, PARAMS_DISCLAIMER, toIsoDate } from '@/lib/finance';
import { ensureNotificationPermission } from '@/services/notifications';
import { useTheme } from '@/theme';
import type { Settings } from '@/types/models';

export default function SettingsScreen() {
  const settings = useSettings();
  const profile = useProfile();
  if (settings.isPending || profile.isPending) return <LoadingState />;
  if (settings.isError || !settings.data) return <ErrorState onRetry={() => void settings.refetch()} />;
  return <SettingsContent settings={settings.data} payDay={profile.data?.payDay ?? 1} />;
}

function SettingsContent({ settings, payDay }: { settings: Settings; payDay: number }) {
  const { spacing } = useTheme();
  const update = useUpdateSettings();

  return (
    <Screen>
      <SectionHeader title="General" />
      <Card style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.sm }}>
          <AppText variant="bodyStrong">Mes financiero</AppText>
          <AppText variant="caption" color="textSecondary">
            Desde qué día se cuentan tus gastos del mes.
          </AppText>
          <SegmentedControl
            accessibilityLabel="Inicio del mes financiero"
            options={[
              { value: 'payday', label: `Día de pago (${payDay})` },
              { value: 'calendar', label: 'Día 1' },
            ]}
            value={settings.periodMode}
            onChange={(periodMode) => update.mutate({ periodMode })}
          />
        </View>
        <Divider />
        <View style={{ gap: spacing.sm }}>
          <AppText variant="bodyStrong">Tema</AppText>
          <SegmentedControl
            accessibilityLabel="Tema"
            options={[
              { value: 'system', label: 'Sistema' },
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Oscuro' },
            ]}
            value={settings.theme}
            onChange={(theme) => update.mutate({ theme })}
          />
        </View>
        <Divider />
        <View style={{ gap: spacing.xs }}>
          <AppText variant="bodyStrong">Moneda</AppText>
          <AppText color="textSecondary">Peso chileno (CLP)</AppText>
          <AppText variant="caption" color="textSecondary">
            Por ahora la app funciona solo en pesos chilenos.
          </AppText>
        </View>
      </Card>
      {update.isError ? <Notice tone="danger" message="No pudimos guardar el cambio. Intenta de nuevo." /> : null}

      <SectionHeader title="Notificaciones" />
      <NotificationsCard settings={settings} />

      <SectionHeader title="Indicadores" />
      <IndicatorsCard settings={settings} />
    </Screen>
  );
}

function IndicatorsCard({ settings }: { settings: Settings }) {
  const { spacing } = useTheme();
  const update = useUpdateSettings();
  const [saved, setSaved] = useState(false);
  const { indicators } = buildSalaryParams(settings);
  const isCustom = settings.ufValue !== null || settings.utmValue !== null;
  const { control, handleSubmit, reset } = useForm<IndicatorsFormValues, unknown, IndicatorsFormOutput>({
    resolver: zodResolver(indicatorsSchema),
    defaultValues: { ufValue: formatAmountInput(indicators.ufValue), utmValue: formatAmountInput(indicators.utmValue) },
  });

  const save = (values: IndicatorsFormOutput) =>
    update.mutate({ ...values, indicatorsAsOf: toIsoDate(new Date()) }, { onSuccess: () => setSaved(true) });

  const restoreDefaults = () =>
    update.mutate(
      { ufValue: null, utmValue: null, indicatorsAsOf: null },
      {
        onSuccess: (updated) => {
          const defaults = buildSalaryParams(updated).indicators;
          reset({ ufValue: formatAmountInput(defaults.ufValue), utmValue: formatAmountInput(defaults.utmValue) });
          setSaved(true);
        },
      },
    );

  return (
    <Card style={{ gap: spacing.md }}>
      <AppText variant="caption" color="textSecondary">
        Se usan para calcular tu sueldo líquido (topes imponibles, plan Isapre e impuesto). Valores {isCustom ? 'ingresados por ti' : 'aproximados de la app'} al {formatLongDate(indicators.asOf)}.
      </AppText>
      <Controller
        control={control}
        name="ufValue"
        render={({ field, fieldState }) => (
          <AmountField
            label="Valor UF"
            value={field.value}
            onChangeText={(text) => {
              setSaved(false);
              field.onChange(text);
            }}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="utmValue"
        render={({ field, fieldState }) => (
          <AmountField
            label="Valor UTM"
            value={field.value}
            onChangeText={(text) => {
              setSaved(false);
              field.onChange(text);
            }}
            error={fieldState.error?.message}
          />
        )}
      />
      <Notice message={PARAMS_DISCLAIMER} />
      {saved ? <Notice message="Indicadores actualizados." icon="check-circle" /> : null}
      <Button label="Guardar indicadores" icon="check" loading={update.isPending} onPress={() => void handleSubmit(save)()} />
      {isCustom ? <Button label="Usar valores de la app" variant="ghost" onPress={restoreDefaults} /> : null}
    </Card>
  );
}

function NotificationsCard({ settings }: { settings: Settings }) {
  const { spacing } = useTheme();
  const update = useUpdateSettings();
  const [denied, setDenied] = useState(false);

  const toggle = async (enabled: boolean) => {
    setDenied(false);
    if (enabled && !(await ensureNotificationPermission())) {
      setDenied(true);
      return;
    }
    update.mutate({ notificationsEnabled: enabled });
  };

  return (
    <Card style={{ gap: spacing.md }}>
      <SwitchRow
        label="Recordatorios"
        description="Avisos locales de gastos fijos, cuotas y respaldo. No usan internet."
        value={settings.notificationsEnabled}
        onValueChange={(value) => void toggle(value)}
        disabled={update.isPending}
      />
      {denied ? <Notice tone="warning" message="El teléfono no permite notificaciones para esta app. Actívalas en Ajustes del sistema y vuelve a intentarlo." /> : null}
      {settings.notificationsEnabled ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="bodyStrong">Avisarme antes del vencimiento</AppText>
          <SegmentedControl
            accessibilityLabel="Días de anticipación"
            options={[
              { value: 1, label: '1 día antes' },
              { value: 2, label: '2 días antes' },
            ]}
            value={settings.reminderDaysBefore}
            onChange={(reminderDaysBefore) => update.mutate({ reminderDaysBefore })}
          />
        </View>
      ) : null}
    </Card>
  );
}
