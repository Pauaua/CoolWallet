import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText, Card, ColorIcon, Divider, ErrorState, Icon, LoadingState, Screen, SectionHeader } from '@/components';
import { useCategories } from '@/features/categories/queries';
import { CATEGORY_KIND_OPTIONS } from '@/features/expenses/labels';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

/** Categorías agrupadas por uso, con acceso a crear y editar. */
export default function CategoriesScreen() {
  const { spacing } = useTheme();
  const categories = useCategories();

  if (categories.isPending) return <LoadingState />;
  if (categories.isError) return <ErrorState onRetry={() => void categories.refetch()} />;

  return (
    <Screen>
      {CATEGORY_KIND_OPTIONS.map((kind) => {
        const items = categories.data.filter((category) => category.kind === kind.value);
        return (
          <View key={kind.value} style={{ gap: spacing.sm }}>
            <SectionHeader title={kind.label} action={{ label: 'Agregar', onPress: () => router.push({ pathname: '/categoria', params: { kind: kind.value } }) }} />
            <AppText variant="caption" color="textSecondary">
              {kind.description}
            </AppText>
            <Card style={{ paddingVertical: spacing.xs }}>
              {items.length === 0 ? (
                <AppText color="textSecondary">Sin categorías de este tipo.</AppText>
              ) : (
                items.map((category, index) => (
                  <View key={category.id}>
                    {index > 0 ? <Divider /> : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Editar ${category.name}`}
                      onPress={() => router.push({ pathname: '/categoria', params: { id: category.id } })}
                      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: MIN_TOUCH_TARGET + 12, opacity: pressed ? 0.6 : 1 })}
                    >
                      <ColorIcon icon={category.icon} colorKey={category.color} size={36} />
                      <AppText style={{ flex: 1 }}>{category.name}</AppText>
                      <Icon name="chevron-right" size={18} color="textSecondary" />
                    </Pressable>
                  </View>
                ))
              )}
            </Card>
          </View>
        );
      })}
    </Screen>
  );
}
