import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { AmountField, AppText, Button, ChipGroup, DateField, FormScreen, Notice, TextField } from '@/components';
import { useCategories } from '@/features/categories/queries';
import { useTheme } from '@/theme';
import type { CategoryKind } from '@/types/enums';
import type { Account } from '@/types/models';

import { movementSchema, type MovementFormOutput, type MovementFormValues } from './schemas';

type MovementFormProps = {
  defaultValues: MovementFormValues;
  accounts: readonly Account[];
  /** Tipos de categoría a ofrecer; `null` = el movimiento no lleva categoría. */
  categoryKinds: readonly CategoryKind[] | null;
  submitLabel: string;
  submitting: boolean;
  errorMessage?: string | null;
  onSubmit: (values: MovementFormOutput) => void;
  /** Acciones extra bajo el botón principal (ej.: eliminar). */
  extraActions?: ReactNode;
  intro?: ReactNode;
};

export function MovementForm({ defaultValues, accounts, categoryKinds, submitLabel, submitting, errorMessage, onSubmit, extraActions, intro }: MovementFormProps) {
  const { spacing } = useTheme();
  const categories = useCategories(categoryKinds ?? undefined);
  const { control, handleSubmit } = useForm<MovementFormValues, unknown, MovementFormOutput>({
    resolver: zodResolver(movementSchema),
    defaultValues,
  });

  return (
    <FormScreen
      footer={
        <>
          <Button label={submitLabel} icon="check" loading={submitting} onPress={() => void handleSubmit(onSubmit)()} />
          {extraActions}
        </>
      }
    >
      {intro}
      <Controller
        control={control}
        name="amount"
        render={({ field, fieldState }) => (
          <AmountField label="Monto" autoFocus={!defaultValues.amount} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="date"
        render={({ field, fieldState }) => <DateField label="Fecha" value={field.value} onChange={field.onChange} maximumDate={new Date()} error={fieldState.error?.message} />}
      />
      <Controller
        control={control}
        name="accountId"
        render={({ field, fieldState }) => (
          <View style={{ gap: spacing.sm }}>
            <AppText variant="label" color="textSecondary">
              Cuenta
            </AppText>
            <ChipGroup accessibilityLabel="Cuenta" options={accounts.map((account) => ({ value: account.id, label: account.name }))} value={field.value} onChange={field.onChange} />
            {fieldState.error ? (
              <AppText variant="caption" color="danger">
                {fieldState.error.message}
              </AppText>
            ) : null}
          </View>
        )}
      />
      {categoryKinds && categories.data && categories.data.length > 0 ? (
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <View style={{ gap: spacing.sm }}>
              <AppText variant="label" color="textSecondary">
                Categoría
              </AppText>
              <ChipGroup
                accessibilityLabel="Categoría"
                options={categories.data.map((category) => ({ value: category.id, label: category.name }))}
                value={field.value}
                onChange={field.onChange}
              />
            </View>
          )}
        />
      ) : null}
      <Controller
        control={control}
        name="note"
        render={({ field, fieldState }) => (
          <TextField label="Nota (opcional)" placeholder="Ej.: venta de bicicleta" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
        )}
      />
      {errorMessage ? <Notice tone="danger" message={errorMessage} /> : null}
    </FormScreen>
  );
}
