import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, View } from 'react-native';

import { AmountField, AppText, Button, ChipGroup, ErrorState, FormScreen, LoadingState, Notice, SegmentedControl, TextField } from '@/components';
import { ACCOUNT_TYPE_OPTIONS, getAccountTypeOption } from '@/features/wallet/labels';
import { useAccount, useDeleteAccount, useSaveAccount } from '@/features/wallet/queries';
import { accountSchema, type AccountFormOutput, type AccountFormValues } from '@/features/wallet/schemas';
import { formatAmountInput } from '@/lib/finance';
import { useTheme } from '@/theme';
import type { Account } from '@/types/models';

/** Las cuentas nuevas van después de las por defecto y entre ellas se ordenan por nombre. */
const NEW_ACCOUNT_SORT_ORDER = 100;

/** Crear (sin `id`) o editar una cuenta o bolsillo. */
export default function AccountScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const navigation = useNavigation();
  const account = useAccount(id);

  useEffect(() => {
    navigation.setOptions({ title: id ? 'Editar cuenta' : 'Nueva cuenta' });
  }, [navigation, id]);

  if (id && account.isPending) return <LoadingState />;
  if (id && (account.isError || !account.data)) return <ErrorState message="No encontramos esta cuenta." />;
  return <AccountForm account={account.data ?? null} />;
}

function AccountForm({ account }: { account: Account | null }) {
  const { spacing } = useTheme();
  const save = useSaveAccount();
  const remove = useDeleteAccount();
  const { control, handleSubmit } = useForm<AccountFormValues, unknown, AccountFormOutput>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: account?.name ?? '',
      type: account?.type ?? 'checking',
      initialBalance: account ? formatAmountInput(Math.abs(account.initialBalance)) : '0',
      isNegative: (account?.initialBalance ?? 0) < 0,
    },
  });

  const onSubmit = (values: AccountFormOutput) => {
    const option = getAccountTypeOption(values.type);
    save.mutate(
      {
        id: account?.id,
        input: { ...values, icon: option.icon, color: account?.type === values.type ? account.color : option.color, sortOrder: account?.sortOrder ?? NEW_ACCOUNT_SORT_ORDER },
      },
      { onSuccess: () => router.back() },
    );
  };

  const confirmDelete = () => {
    if (!account) return;
    Alert.alert('¿Eliminar esta cuenta?', 'Sus movimientos se conservan en el historial, pero dejarán de sumar al disponible.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate(account.id, { onSuccess: () => router.back() }) },
    ]);
  };

  return (
    <FormScreen
      footer={
        <>
          <Button label={account ? 'Guardar cambios' : 'Crear cuenta'} icon="check" loading={save.isPending} onPress={() => void handleSubmit(onSubmit)()} />
          {account ? <Button label="Eliminar cuenta" variant="ghost" icon="trash-2" loading={remove.isPending} onPress={confirmDelete} /> : null}
        </>
      }
    >
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField label="Nombre" placeholder="Ej.: Cuenta RUT" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <View style={{ gap: spacing.sm }}>
            <AppText variant="label" color="textSecondary">
              Tipo
            </AppText>
            <ChipGroup accessibilityLabel="Tipo de cuenta" options={ACCOUNT_TYPE_OPTIONS.map(({ value, label }) => ({ value, label }))} value={field.value} onChange={field.onChange} />
          </View>
        )}
      />
      <Controller
        control={control}
        name="isNegative"
        render={({ field }) => (
          <SegmentedControl
            accessibilityLabel="Signo del saldo inicial"
            options={[
              { value: 'positive', label: 'Saldo a favor' },
              { value: 'negative', label: 'Saldo en contra' },
            ]}
            value={field.value ? 'negative' : 'positive'}
            onChange={(value) => field.onChange(value === 'negative')}
          />
        )}
      />
      <Controller
        control={control}
        name="initialBalance"
        render={({ field, fieldState }) => (
          <AmountField
            label="Saldo inicial"
            hint="Lo que tenías en esta cuenta al empezar a usar la app. Para una tarjeta, lo que debes (saldo en contra)."
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      {save.isError || remove.isError ? <Notice tone="danger" message="No pudimos guardar los cambios. Intenta de nuevo." /> : null}
    </FormScreen>
  );
}
