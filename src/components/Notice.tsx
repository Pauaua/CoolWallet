import { View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type NoticeProps = {
  message: string;
  tone?: 'info' | 'warning' | 'danger';
  icon?: IconName;
};

/** Aviso en línea (ej.: valores aproximados, advertencias antes de borrar). */
export function Notice({ message, tone = 'info', icon }: NoticeProps) {
  const { colors, radius, spacing } = useTheme();
  const toneColor = tone === 'info' ? 'primary' : tone;
  const defaultIcon: IconName = tone === 'info' ? 'info' : 'alert-triangle';
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors[toneColor],
        backgroundColor: colors.surface,
      }}
    >
      <Icon name={icon ?? defaultIcon} size={18} color={toneColor} />
      <AppText variant="caption" style={{ flex: 1 }}>
        {message}
      </AppText>
    </View>
  );
}
