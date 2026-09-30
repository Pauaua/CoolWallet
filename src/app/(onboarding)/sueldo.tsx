import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';

import { Button, FormScreen } from '@/components';
import { useOnboardingStore } from '@/features/onboarding/onboardingStore';
import { salarySchema, toSalaryFormValues, type SalaryFormOutput, type SalaryFormValues } from '@/features/profile/profileSchema';
import { SalaryFields } from '@/features/profile/SalaryFields';

export default function OnboardingSalaryScreen() {
  const setSalary = useOnboardingStore((state) => state.setSalary);
  const { control, handleSubmit, setValue } = useForm<SalaryFormValues, unknown, SalaryFormOutput>({
    resolver: zodResolver(salarySchema),
    defaultValues: toSalaryFormValues(null),
  });

  const onSubmit = handleSubmit((values) => {
    setSalary(values);
    router.push('/pin');
  });

  return (
    <FormScreen
      title="Tu sueldo"
      subtitle="Con esto calculamos tu sueldo líquido y tu mes financiero. Puedes cambiarlo después en tu perfil."
      footer={<Button label="Continuar" onPress={onSubmit} />}
    >
      <SalaryFields control={control} setValue={setValue} />
    </FormScreen>
  );
}
