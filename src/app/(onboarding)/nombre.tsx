import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';

import { Button, FormScreen, TextField } from '@/components';
import { useOnboardingStore } from '@/features/onboarding/onboardingStore';
import { nameSchema, type NameFormValues } from '@/features/profile/profileSchema';

export default function OnboardingNameScreen() {
  const { name, setName } = useOnboardingStore();
  const { control, handleSubmit } = useForm<NameFormValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name },
  });

  const onSubmit = handleSubmit((values) => {
    setName(values.name);
    router.push('/sueldo');
  });

  return (
    <FormScreen title="¿Cómo te llamas?" subtitle="Lo usaremos para saludarte." footer={<Button label="Continuar" onPress={onSubmit} />}>
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            label="Nombre"
            autoFocus
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="next"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            onSubmitEditing={onSubmit}
            error={fieldState.error?.message}
          />
        )}
      />
    </FormScreen>
  );
}
