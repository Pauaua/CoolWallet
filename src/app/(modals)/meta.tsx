import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, View } from 'react-native';

import { AmountField, Button, ColorIcon, DateField, ErrorState, FormScreen, LoadingState, Notice, TextField } from '@/components';
import { ColorPicker, IconPicker } from '@/features/categories/Pickers';
import { useDeleteGoal, useSavingsGoals, useSaveGoal } from '@/features/goals/queries';
import { goalSchema, type GoalFormOutput, type GoalFormValues } from '@/features/goals/schemas';
import { calcMonthlySavingNeeded, formatAmountInput, formatCLP, parseCLPInput, toIsoDate } from '@/lib/finance';
import { useTheme } from '@/theme';
import { CATEGORY_COLORS, type CategoryColor } from '@/types/enums';
import type { SavingsGoal } from '@/types/models';

const GOAL_ICONS = ['target', 'sun', 'globe', 'home', 'truck', 'gift', 'book-open', 'heart', 'umbrella', 'smartphone', 'briefcase', 'award'] as const;

export default function GoalScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const navigation = useNavigation();
  const goals = useSavingsGoals();

  useEffect(() => {
    navigation.setOptions({ title: id ? 'Editar meta' : 'Nueva meta' });
  }, [navigation, id]);

  if (goals.isPending) return <LoadingState />;
  if (goals.isError) return <ErrorState onRetry={() => void goals.refetch()} />;
  const goal = id ? goals.data.find((item) => item.id === id) : null;
  if (id && !goal) return <ErrorState message="No encontramos esta meta." />;
  return <GoalForm goal={goal ?? null} />;
}

function isCategoryColor(value: string): value is CategoryColor {
  return (CATEGORY_COLORS as readonly string[]).includes(value);
}

function GoalForm({ goal }: { goal: SavingsGoal | null }) {
  const { spacing } = useTheme();
  const save = useSaveGoal();
  const remove = useDeleteGoal();
  const today = toIsoDate(new Date());
  const { control, handleSubmit } = useForm<GoalFormValues, unknown, GoalFormOutput>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: goal?.name ?? '',
      targetAmount: goal ? formatAmountInput(goal.targetAmount) : '',
      savedAmount: goal ? formatAmountInput(goal.savedAmount) : '0',
      targetDate: goal?.targetDate ?? '',
      icon: goal?.icon ?? 'target',
      color: goal && isCategoryColor(goal.color) ? goal.color : 'forest',
    },
  });
  const [icon, color, targetText, savedText, targetDate] = useWatch({ control, name: ['icon', 'color', 'targetAmount', 'savedAmount', 'targetDate'] });
  const target = parseCLPInput(targetText) ?? 0;
  const plan = target > 0 && targetDate ? calcMonthlySavingNeeded(target, parseCLPInput(savedText) ?? 0, targetDate, today) : null;

  const onSubmit = (values: GoalFormOutput) =>
    save.mutate({ id: goal?.id, input: { ...values, targetDate: values.targetDate || null } }, { onSuccess: () => router.back() });

  const confirmDelete = () => {
    if (!goal) return;
    Alert.alert('¿Eliminar esta meta?', 'Solo se borra el registro de la meta; tus cuentas no cambian.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate(goal.id, { onSuccess: () => router.back() }) },
    ]);
  };

  return (
    <FormScreen
      footer={
        <>
          <Button label={goal ? 'Guardar cambios' : 'Crear meta'} icon="check" loading={save.isPending} onPress={() => void handleSubmit(onSubmit)()} />
          {goal ? <Button label="Eliminar meta" variant="ghost" icon="trash-2" loading={remove.isPending} onPress={confirmDelete} /> : null}
        </>
      }
    >
      <View style={{ alignItems: 'center' }}>
        <ColorIcon icon={icon} colorKey={color} size={72} />
      </View>
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => <TextField label="Nombre" placeholder="Ej.: Vacaciones en el sur" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />}
      />
      <Controller
        control={control}
        name="targetAmount"
        render={({ field, fieldState }) => <AmountField label="Monto objetivo" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />}
      />
      <Controller
        control={control}
        name="savedAmount"
        render={({ field, fieldState }) => <AmountField label="Llevas ahorrado" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />}
      />
      <Controller
        control={control}
        name="targetDate"
        render={({ field, fieldState }) =>
          field.value ? (
            <View style={{ gap: spacing.sm }}>
              <DateField label="Fecha objetivo" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
              <Button label="Quitar fecha objetivo" variant="ghost" onPress={() => field.onChange('')} />
            </View>
          ) : (
            <Button label="Agregar fecha objetivo" variant="secondary" icon="calendar" onPress={() => field.onChange(today)} />
          )
        }
      />
      {plan && !plan.isOverdue && plan.remaining > 0 ? <Notice message={`Para llegar a tiempo necesitas ahorrar ${formatCLP(plan.monthlyAmount)} al mes durante ${plan.monthsRemaining} ${plan.monthsRemaining === 1 ? 'mes' : 'meses'}.`} /> : null}
      {plan?.isOverdue ? <Notice tone="warning" message="La fecha objetivo ya pasó. Elige una fecha futura para calcular el ahorro mensual." /> : null}
      <Controller control={control} name="icon" render={({ field }) => <IconPicker value={field.value} onChange={field.onChange} icons={GOAL_ICONS} />} />
      <Controller control={control} name="color" render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} />} />
      {save.isError || remove.isError ? <Notice tone="danger" message="No pudimos guardar la meta. Intenta de nuevo." /> : null}
    </FormScreen>
  );
}
