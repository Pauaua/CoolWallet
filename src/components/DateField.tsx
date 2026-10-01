import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, View } from 'react-native';

import { formatLongDate } from '@/lib/dates';
import { parseIsoDate, toIsoDate, type IsoDate } from '@/lib/finance';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

type DateFieldProps = {
  label: string;
  value: IsoDate;
  onChange: (value: IsoDate) => void;
  /** Fecha máxima permitida (ej.: hoy para movimientos). */
  maximumDate?: Date;
  error?: string;
};

/** Selector de fecha nativo (diálogo en Android, compacto en iOS). */
export function DateField({ label, value, onChange, maximumDate, error }: DateFieldProps) {
  const { colors, radius, scheme, spacing } = useTheme();
  const date = parseIsoDate(value);

  const openAndroid = () =>
    DateTimePickerAndroid.open({
      value: date,
      mode: 'date',
      maximumDate,
      onValueChange: (_event, selected) => onChange(toIsoDate(selected)),
    });

  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="label" color="textSecondary">
        {label}
      </AppText>
      {Platform.OS === 'ios' ? (
        <View style={{ alignItems: 'flex-start' }}>
          <DateTimePicker
            value={date}
            mode="date"
            display="compact"
            locale="es-CL"
            maximumDate={maximumDate}
            accentColor={colors.primary}
            themeVariant={scheme}
            onValueChange={(_event, selected) => onChange(toIsoDate(selected))}
          />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${formatLongDate(value)}. Cambiar fecha`}
          onPress={openAndroid}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            minHeight: MIN_TOUCH_TARGET + 4,
            paddingHorizontal: spacing.md,
            borderWidth: 1,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Icon name="calendar" size={18} color="primary" />
          <AppText style={{ flex: 1 }}>{formatLongDate(value)}</AppText>
        </Pressable>
      )}
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
