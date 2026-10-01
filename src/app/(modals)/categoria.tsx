import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, View } from 'react-native';

import { AppText, Button, ChipGroup, ColorIcon, ErrorState, FormScreen, LoadingState, Notice, TextField } from '@/components';
import { useCategory, useDeleteCategory, useSaveCategory } from '@/features/categories/queries';
import { ColorPicker, IconPicker } from '@/features/categories/Pickers';
import { BUDGET_GROUP_OPTIONS, CATEGORY_KIND_OPTIONS } from '@/features/expenses/labels';
import { categorySchema, type CategoryFormOutput, type CategoryFormValues } from '@/features/expenses/schemas';
import { useTheme } from '@/theme';
import { CATEGORY_COLORS, type CategoryColor, type CategoryKind } from '@/types/enums';
import type { Category } from '@/types/models';

const NO_GROUP = 'none';

/** Crear (sin `id`) o editar una categoría: nombre, tipo, ícono, color y grupo 50/30/20. */
export default function CategoryScreen() {
  const { id, kind } = useLocalSearchParams<{ id?: string; kind?: CategoryKind }>();
  const navigation = useNavigation();
  const category = useCategory(id);

  useEffect(() => {
    navigation.setOptions({ title: id ? 'Editar categoría' : 'Nueva categoría' });
  }, [navigation, id]);

  if (id && category.isPending) return <LoadingState />;
  if (id && !category.data) return <ErrorState message="No encontramos esta categoría." />;
  return <CategoryForm category={category.data ?? null} initialKind={kind ?? 'variable'} />;
}

function isCategoryColor(value: string): value is CategoryColor {
  return (CATEGORY_COLORS as readonly string[]).includes(value);
}

function CategoryForm({ category, initialKind }: { category: Category | null; initialKind: CategoryKind }) {
  const { spacing } = useTheme();
  const save = useSaveCategory();
  const remove = useDeleteCategory();
  const { control, handleSubmit } = useForm<CategoryFormValues, unknown, CategoryFormOutput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? '',
      kind: category?.kind ?? initialKind,
      icon: category?.icon ?? 'tag',
      color: category && isCategoryColor(category.color) ? category.color : 'forest',
      budgetGroup: category?.budgetGroup ?? (initialKind === 'income' ? null : 'wants'),
    },
  });
  const [icon, color] = useWatch({ control, name: ['icon', 'color'] });

  const onSubmit = (values: CategoryFormOutput) =>
    save.mutate(
      { id: category?.id, input: { ...values, isDefault: category?.isDefault ?? false, sortOrder: category?.sortOrder ?? 100 } },
      { onSuccess: () => router.back() },
    );

  const confirmDelete = () => {
    if (!category) return;
    Alert.alert('¿Eliminar esta categoría?', 'Los movimientos que la usan se conservan y seguirán mostrando su nombre en reportes antiguos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate(category.id, { onSuccess: () => router.back() }) },
    ]);
  };

  return (
    <FormScreen
      footer={
        <>
          <Button label={category ? 'Guardar cambios' : 'Crear categoría'} icon="check" loading={save.isPending} onPress={() => void handleSubmit(onSubmit)()} />
          {category ? <Button label="Eliminar categoría" variant="ghost" icon="trash-2" loading={remove.isPending} onPress={confirmDelete} /> : null}
        </>
      }
    >
      <View style={{ alignItems: 'center' }}>
        <ColorIcon icon={icon} colorKey={color} size={72} />
      </View>
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => <TextField label="Nombre" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />}
      />
      <Controller
        control={control}
        name="kind"
        render={({ field }) => (
          <View style={{ gap: spacing.sm }}>
            <AppText variant="label" color="textSecondary">
              Se usa en
            </AppText>
            <ChipGroup accessibilityLabel="Tipo de categoría" options={CATEGORY_KIND_OPTIONS.map(({ value, label }) => ({ value, label }))} value={field.value} onChange={field.onChange} />
          </View>
        )}
      />
      <Controller control={control} name="color" render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} />} />
      <Controller control={control} name="icon" render={({ field }) => <IconPicker value={field.value} onChange={field.onChange} />} />
      <Controller
        control={control}
        name="budgetGroup"
        render={({ field }) => (
          <View style={{ gap: spacing.sm }}>
            <AppText variant="label" color="textSecondary">
              Grupo en la regla 50/30/20
            </AppText>
            <ChipGroup
              accessibilityLabel="Grupo 50/30/20"
              options={[...BUDGET_GROUP_OPTIONS, { value: NO_GROUP, label: 'Ninguno' }]}
              value={field.value ?? NO_GROUP}
              onChange={(value) => field.onChange(value === NO_GROUP ? null : value)}
            />
          </View>
        )}
      />
      {save.isError || remove.isError ? <Notice tone="danger" message="No pudimos guardar los cambios. Intenta de nuevo." /> : null}
    </FormScreen>
  );
}
