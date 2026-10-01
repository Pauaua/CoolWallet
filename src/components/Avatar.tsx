import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';

import { getInitials } from '@/lib/strings';
import { resolveProfilePhotoUri } from '@/services/files/profilePhoto';
import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

type AvatarProps = {
  name: string;
  /** Foto guardada en el perfil (ruta relativa a documentos o URI). */
  photoUri?: string | null;
  size?: number;
};

/**
 * Avatar circular: foto de perfil, o iniciales si no hay foto o si el archivo
 * ya no existe (por ejemplo, al restaurar un respaldo en otro teléfono).
 */
export function Avatar({ name, photoUri, size = 56 }: AvatarProps) {
  const { colors } = useTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const uri = resolveProfilePhotoUri(photoUri);
  const showPhoto = uri !== null && uri !== failedUri;
  const initials = getInitials(name);
  const shape = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[shape, { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }]}
    >
      {showPhoto ? (
        <Image source={{ uri }} style={shape} contentFit="cover" transition={150} onError={() => setFailedUri(uri)} />
      ) : initials ? (
        <AppText variant={size >= 72 ? 'title' : 'heading'} color="primary">
          {initials}
        </AppText>
      ) : (
        <Icon name="user" color="primary" size={size / 2.4} />
      )}
    </View>
  );
}
