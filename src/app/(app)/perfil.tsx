import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, View } from 'react-native';

import { AppText, Avatar, Button, Card, ErrorState, FormScreen, Icon, LoadingState, Notice, TextField } from '@/components';
import { pickProfilePhoto } from '@/features/profile/pickProfilePhoto';
import { nameSchema, salarySchema, toProfileInput, toSalaryFormValues, type NameFormValues, type SalaryFormOutput, type SalaryFormValues } from '@/features/profile/profileSchema';
import { useProfile, useSaveProfile } from '@/features/profile/queries';
import { SalaryFields } from '@/features/profile/SalaryFields';
import { deleteProfilePhoto } from '@/services/files/profilePhoto';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';
import type { Profile } from '@/types/models';

export default function ProfileScreen() {
  const profile = useProfile();
  if (profile.isPending) return <LoadingState />;
  if (profile.isError) return <ErrorState onRetry={() => void profile.refetch()} />;
  if (!profile.data) return <ErrorState message="No encontramos tu perfil." />;
  return <ProfileForm profile={profile.data} />;
}

function ProfileForm({ profile }: { profile: Profile }) {
  const { colors, spacing } = useTheme();
  const save = useSaveProfile();
  const [photoUri, setPhotoUri] = useState(profile.photoUri);
  const [saved, setSaved] = useState(false);
  // Foto elegida pero aún no guardada: se borra si se reemplaza o si se sale sin guardar.
  const pendingPhoto = useRef<string | null>(null);

  const nameForm = useForm<NameFormValues>({ resolver: zodResolver(nameSchema), defaultValues: { name: profile.name } });
  const salaryForm = useForm<SalaryFormValues, unknown, SalaryFormOutput>({
    resolver: zodResolver(salarySchema),
    defaultValues: toSalaryFormValues(profile),
  });

  useEffect(
    () => () => {
      if (pendingPhoto.current) deleteProfilePhoto(pendingPhoto.current);
    },
    [],
  );

  const replacePending = (uri: string | null) => {
    if (pendingPhoto.current && pendingPhoto.current !== uri) deleteProfilePhoto(pendingPhoto.current);
    pendingPhoto.current = uri !== profile.photoUri ? uri : null;
    setPhotoUri(uri);
    setSaved(false);
  };

  const changePhoto = async () => {
    try {
      const result = await pickProfilePhoto();
      if (result.status === 'picked') replacePending(result.uri);
      if (result.status === 'denied') Alert.alert('Sin acceso a tus fotos', 'Permite el acceso a la galería en la configuración del teléfono para elegir una foto.');
    } catch {
      Alert.alert('No pudimos usar esa foto', 'Intenta con otra imagen.');
    }
  };

  const onSave = () => {
    void nameForm.handleSubmit((nameValues) =>
      salaryForm.handleSubmit((salaryValues) => {
        save.mutate(toProfileInput(nameValues.name, salaryValues, photoUri), {
          onSuccess: () => {
            pendingPhoto.current = null;
            setSaved(true);
          },
        });
      })(),
    )();
  };

  return (
    <FormScreen footer={<Button label="Guardar cambios" icon="check" onPress={onSave} loading={save.isPending} />}>
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cambiar foto de perfil" onPress={changePhoto}>
          <Avatar name={profile.name} photoUri={photoUri} size={96} />
          <View
            style={{
              position: 'absolute',
              right: -4,
              bottom: -4,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.primary,
              borderWidth: 2,
              borderColor: colors.background,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="camera" size={16} color="onPrimary" />
          </View>
        </Pressable>
        {photoUri ? <Button label="Quitar foto" variant="ghost" onPress={() => replacePending(null)} /> : null}
      </View>

      <Controller
        control={nameForm.control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            label="Nombre"
            autoCapitalize="words"
            value={field.value}
            onChangeText={(text) => {
              setSaved(false);
              field.onChange(text);
            }}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />

      <AppText variant="heading" accessibilityRole="header" style={{ marginTop: spacing.sm }}>
        Datos financieros
      </AppText>
      <SalaryFields control={salaryForm.control} setValue={salaryForm.setValue} />

      {saved ? <Notice message="Cambios guardados." icon="check-circle" /> : null}
      {save.isError ? <Notice tone="danger" message="No pudimos guardar los cambios. Intenta de nuevo." /> : null}

      <Card style={{ padding: 0 }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/seguridad')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            minHeight: MIN_TOUCH_TARGET + 12,
            paddingHorizontal: spacing.lg,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Icon name="shield" color="primary" />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">Seguridad</AppText>
            <AppText variant="caption" color="textSecondary">
              PIN, huella o Face ID y bloqueo automático
            </AppText>
          </View>
          <Icon name="chevron-right" color="textSecondary" size={18} />
        </Pressable>
      </Card>
    </FormScreen>
  );
}
