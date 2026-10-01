import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';

import { AmountField, AppText, Button, Card, ErrorState, FormScreen, LoadingState, Notice, SegmentedControl } from '@/components';
import { useAddContribution, useSavingsGoals } from '@/features/goals/queries';
import { contributionSchema, type ContributionFormOutput, type ContributionFormValues } from '@/features/goals/schemas';
import { formatCLP } from '@/lib/finance';
import { useTheme } from '@/theme';

/** Sumar (o retirar) dinero de una meta de ahorro. */
export default function ContributionScreen() {
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const { spacing } = useTheme();
  const goals = useSavingsGoals();
  const add = useAddContribution();
  const { control, handleSubmit } = useForm<ContributionFormValues, unknown, ContributionFormOutput>({
    resolver: zodResolver(contributionSchema),
    defaultValues: { amount: '', direction: 'add' },
  });

  if (goals.isPending) return <LoadingState />;
  const goal = goals.data?.find((item) => item.id === goalId);
  if (goals.isError || !goal) return <ErrorState message="No encontramos esta meta." />;

  const onSubmit = (values: ContributionFormOutput) =>
    add.mutate({ id: goal.id, amount: values.direction === 'add' ? values.amount : -values.amount }, { onSuccess: () => router.back() });

  return (
    <FormScreen footer={<Button label="Guardar" icon="check" loading={add.isPending} onPress={() => void handleSubmit(onSubmit)()} />}>
      <Card style={{ gap: spacing.xs }}>
        <AppText variant="bodyStrong">{goal.name}</AppText>
        <AppText variant="caption" color="textSecondary">
          Llevas {formatCLP(goal.savedAmount)} de {formatCLP(goal.targetAmount)}
        </AppText>
      </Card>
      <Controller
        control={control}
        name="direction"
        render={({ field }) => (
          <SegmentedControl
            accessibilityLabel="Tipo de movimiento"
            options={[
              { value: 'add', label: 'Agregar' },
              { value: 'withdraw', label: 'Retirar' },
            ]}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="amount"
        render={({ field, fieldState }) => <AmountField label="Monto" autoFocus value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />}
      />
      <Notice message="Solo actualiza tu avance en la meta; no mueve dinero entre tus cuentas." />
      {add.isError ? <Notice tone="danger" message="No pudimos guardar el aporte. Intenta de nuevo." /> : null}
    </FormScreen>
  );
}
