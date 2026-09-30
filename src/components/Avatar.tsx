import { Image } from 'expo-image';
import { View } from 'react-native';

import { getInitials } from '@/lib/strings';
import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

type AvatarProps = {
  name: string;
  photoUri?: string | null;
  size?: number;
};

/** Avatar circular: foto de perfil, o iniciales si no hay foto. */
export function Avatar({ name, photoUri, size = 56 }: AvatarProps) {
  const { colors } = useTheme();
  const initials = getInitials(name);
  const shape = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[shape, { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }]}
    >
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={shape} contentFit="cover" transition={150} />
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
