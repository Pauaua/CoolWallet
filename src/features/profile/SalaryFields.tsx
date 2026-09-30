import { Controller, useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { View } from 'react-native';

import { AmountField, AppText, ChipGroup, Notice, SegmentedControl, SwitchRow, TextField } from '@/components';
import { AFP_COMMISSIONS, formatDecimalInput, formatPercent, HONORARIOS_RETENTION_RATE, PARAMS_DISCLAIMER } from '@/lib/finance';
import { useTheme } from '@/theme';

import type { SalaryFormOutput, SalaryFormValues } from './profileSchema';

const AFP_OPTIONS = Object.keys(AFP_COMMISSIONS).map((name) => ({ value: name, label: name }));

type SalaryFieldsProps = {
  control: Control<SalaryFormValues, unknown, SalaryFormOutput>;
  setValue: UseFormSetValue<SalaryFormValues>;
};

/** Campos de sueldo y previsión (onboarding y perfil). */
export function SalaryFields({ control, setValue }: SalaryFieldsProps) {
  const { spacing } = useTheme();
  const contractType = useWatch({ control, name: 'contractType' });
  const healthSystem = useWatch({ control, name: 'healthSystem' });
  const isDependiente = contractType === 'dependiente';

  return (
    <View style={{ gap: spacing.lg }}>
      <Controller
        control={control}
        name="grossSalary"
        render={({ field, fieldState }) => (
          <AmountField
            label="Sueldo bruto mensual"
            hint="Lo que dice tu contrato, antes de descuentos."
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="payDay"
        render={({ field, fieldState }) => (
          <TextField
            label="Día de pago"
            hint="Día del mes en que recibes tu sueldo (1 a 31)."
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={2}
            value={Number.isNaN(field.value) ? '' : String(field.value)}
            onChangeText={(text) => field.onChange(text === '' ? NaN : Number(text.replace(/\D/g, '')))}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="contractType"
        render={({ field }) => (
          <View style={{ gap: spacing.xs }}>
            <AppText variant="label" color="textSecondary">
              Tipo de contrato
            </AppText>
            <SegmentedControl
              accessibilityLabel="Tipo de contrato"
              options={[
                { value: 'dependiente', label: 'Dependiente' },
                { value: 'honorarios', label: 'Honorarios' },
              ]}
              value={field.value}
              onChange={field.onChange}
            />
          </View>
        )}
      />

      {isDependiente ? (
        <>
          <Controller
            control={control}
            name="contractTerm"
            render={({ field }) => (
              <SegmentedControl
                accessibilityLabel="Duración del contrato"
                options={[
                  { value: 'indefinite', label: 'Indefinido' },
                  { value: 'fixedTerm', label: 'Plazo fijo' },
                ]}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />

          <Controller
            control={control}
            name="afpName"
            render={({ field, fieldState }) => (
              <View style={{ gap: spacing.sm }}>
                <AppText variant="label" color="textSecondary">
                  AFP
                </AppText>
                <ChipGroup
                  accessibilityLabel="AFP"
                  options={AFP_OPTIONS}
                  value={field.value}
                  onChange={(name) => {
                    field.onChange(name);
                    const rate = AFP_COMMISSIONS[name];
                    if (rate !== undefined) setValue('afpCommissionPercent', formatDecimalInput(rate * 100), { shouldValidate: true });
                  }}
                />
                {fieldState.error ? (
                  <AppText variant="caption" color="danger">
                    {fieldState.error.message}
                  </AppText>
                ) : null}
              </View>
            )}
          />

          <Controller
            control={control}
            name="afpCommissionPercent"
            render={({ field, fieldState }) => (
              <TextField
                label="Comisión de tu AFP"
                hint="Se suma al 10% obligatorio. Puedes editarla."
                keyboardType="decimal-pad"
                suffix="%"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="healthSystem"
            render={({ field }) => (
              <View style={{ gap: spacing.xs }}>
                <AppText variant="label" color="textSecondary">
                  Sistema de salud
                </AppText>
                <SegmentedControl
                  accessibilityLabel="Sistema de salud"
                  options={[
                    { value: 'fonasa', label: 'Fonasa (7%)' },
                    { value: 'isapre', label: 'Isapre' },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                />
              </View>
            )}
          />

          {healthSystem === 'isapre' ? (
            <Controller
              control={control}
              name="isapreUfText"
              render={({ field, fieldState }) => (
                <TextField
                  label="Valor de tu plan Isapre"
                  hint="Se descuenta el mayor entre el 7% y tu plan."
                  keyboardType="decimal-pad"
                  suffix="UF"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />
          ) : null}

          <Controller
            control={control}
            name="hasUnemploymentInsurance"
            render={({ field }) => (
              <SwitchRow
                label="Seguro de cesantía"
                description="Con contrato indefinido se descuenta 0,6% de tu sueldo."
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
        </>
      ) : (
        <Notice message={`A tus boletas se les retiene ${formatPercent(HONORARIOS_RETENTION_RATE * 100, 2)} para impuestos y cotizaciones.`} />
      )}

      <Controller
        control={control}
        name="otherIncome"
        render={({ field, fieldState }) => (
          <AmountField
            label="Otros ingresos mensuales (opcional)"
            hint="Arriendos, pensiones u otros ingresos que se repiten."
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />

      <Notice message={PARAMS_DISCLAIMER} />
    </View>
  );
}
