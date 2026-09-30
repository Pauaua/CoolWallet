import { View } from 'react-native';

import { getInitials } from '@/lib/strings';
import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

type AvatarProps = {
  name: string;
  size?: number;
};

/** Avatar circular con iniciales (la foto de perfil se agrega en la fase 3). */
export function Avatar({ name, size = 56 }: AvatarProps) {
  const { colors } = useTheme();
  const initials = getInitials(name);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {initials ? (
        <AppText variant="heading" color="primary">
          {initials}
        </AppText>
      ) : (
        <Icon name="user" color="primary" />
      )}
    </View>
  );
}
