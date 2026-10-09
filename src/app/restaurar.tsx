import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { AppText, Button, FormScreen, Notice } from '@/components';
import { BackupSummaryCard } from '@/features/backup/BackupSummaryCard';
import { useImportBackup, usePickBackup } from '@/features/backup/useBackup';
import { PinSetup } from '@/features/security/PinSetup';
import { useRepositories } from '@/services/RepositoriesProvider';
import { pinService } from '@/services/security';
import { useSessionStore } from '@/store/sessionStore';

/**
 * "Olvidé mi PIN" → restaurar un respaldo: elegir archivo, confirmar,
 * reemplazar los datos y crear un PIN nuevo (el PIN nunca viaja en el respaldo).
 */
export default function RestoreScreen() {
  const repositories = useRepositories();
  const queryClient = useQueryClient();
  const pick = usePickBackup();
  const importBackup = useImportBackup();
  const [step, setStep] = useState<'pick' | 'pin'>('pick');
  const [saving, setSaving] = useState(false);
  const prepared = pick.data;

  const confirmImport = () => {
    if (!prepared?.ok) return;
    Alert.alert('¿Restaurar este respaldo?', 'Los datos actuales de este teléfono se reemplazarán por los del respaldo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Restaurar',
        style: 'destructive',
        onPress: () =>
          importBackup.mutate(prepared.backup, {
            onSuccess: async () => {
              await pinService.clear();
              setStep('pin');
            },
          }),
      },
    ]);
  };

  const finish = async (pin: string) => {
    setSaving(true);
    try {
      await pinService.setPin(pin);
      const [profile, settings] = await Promise.all([repositories.profile.get(), repositories.settings.get()]);
      await queryClient.invalidateQueries();
      // Si el respaldo no tenía un perfil completo, se termina el onboarding.
      if (profile && settings.onboardingCompletedAt) useSessionStore.getState().completeOnboarding();
      else useSessionStore.getState().reset();
    } catch {
      Alert.alert('No pudimos guardar tu PIN', 'Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (step === 'pin') {
    return (
      <FormScreen withTopInset title="Respaldo restaurado" subtitle="Ahora crea un PIN nuevo para proteger tu app.">
        <PinSetup onComplete={finish} busy={saving} />
      </FormScreen>
    );
  }

  return (
    <FormScreen
      withTopInset
      title="Restaurar un respaldo"
      subtitle="Elige el archivo de respaldo que guardaste. Tus datos volverán tal como estaban cuando lo exportaste."
      footer={
        <>
          {prepared?.ok ? (
            <Button label="Restaurar respaldo" icon="refresh-cw" variant="danger" loading={importBackup.isPending} onPress={confirmImport} />
          ) : (
            <Button label="Elegir archivo" icon="download" loading={pick.isPending} onPress={() => pick.mutate()} />
          )}
          <Button label="Volver" variant="ghost" onPress={() => router.back()} disabled={importBackup.isPending} />
        </>
      }
    >
      {prepared && !prepared.ok ? <Notice tone="danger" message={prepared.error} /> : null}
      {pick.isError ? <Notice tone="danger" message="No pudimos leer el archivo." /> : null}
      {prepared?.ok ? (
        <>
          <BackupSummaryCard summary={prepared.summary} fileName={prepared.name} />
          <Button label="Elegir otro archivo" variant="ghost" onPress={() => pick.mutate()} />
        </>
      ) : (
        <AppText color="textSecondary">El archivo se llama algo como “respaldo-coolwallet-2026-09-30.json”.</AppText>
      )}
      {importBackup.isError ? <Notice tone="danger" message="No pudimos restaurar el respaldo. Tus datos no cambiaron." /> : null}
    </FormScreen>
  );
}
