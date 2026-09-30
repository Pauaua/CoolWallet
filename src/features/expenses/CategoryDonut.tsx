import { View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

import { AppText, ColorIcon } from '@/components';
import { foldSmallCategories, formatCLP, formatPercent, UNCATEGORIZED, type CategoryShare } from '@/lib/finance';
import { resolveCategoryColor, useTheme } from '@/theme';
import type { Category } from '@/types/models';

const MAX_SLICES = 6;
const OTHER_ID = '__other__';

type CategoryDonutProps = {
  shares: readonly CategoryShare[];
  categories: ReadonlyMap<string, Category>;
  total: number;
};

/**
 * Dona por categoría (máx. 6 porciones; el resto se agrupa en "Otras").
 * El color sigue a la categoría y cada porción está en la leyenda con
 * ícono, nombre, monto y porcentaje, así no depende solo del color.
 */
export function CategoryDonut({ shares, categories, total }: CategoryDonutProps) {
  const { colors, scheme, spacing } = useTheme();
  const slices = foldSmallCategories(shares, MAX_SLICES, OTHER_ID).filter((slice) => slice.total > 0);

  const describe = (categoryId: string) => {
    if (categoryId === OTHER_ID) return { name: 'Otras categorías', icon: 'more-horizontal', color: 'slate' };
    if (categoryId === UNCATEGORIZED) return { name: 'Sin categoría', icon: 'tag', color: 'sage' };
    const category = categories.get(categoryId);
    return { name: category?.name ?? 'Categoría eliminada', icon: category?.icon ?? 'tag', color: category?.color ?? 'sage' };
  };

  const data = slices.map((slice) => ({ value: slice.total, color: resolveCategoryColor(describe(slice.categoryId).color, scheme) }));

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ alignItems: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <PieChart
          data={data}
          donut
          radius={96}
          innerRadius={66}
          innerCircleColor={colors.surface}
          strokeWidth={2}
          strokeColor={colors.surface}
          centerLabelComponent={() => (
            <View style={{ alignItems: 'center' }}>
              <AppText variant="caption" color="textSecondary">
                Total
              </AppText>
              <AppText variant="bodyStrong">{formatCLP(total)}</AppText>
            </View>
          )}
        />
      </View>
      <View style={{ gap: spacing.sm }}>
        {slices.map((slice) => {
          const info = describe(slice.categoryId);
          return (
            <View
              key={slice.categoryId}
              accessible
              accessibilityLabel={`${info.name}: ${formatCLP(slice.total)}, ${formatPercent(slice.percentage)} del total`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
            >
              <ColorIcon icon={info.icon} colorKey={info.color} size={32} />
              <AppText style={{ flex: 1 }} numberOfLines={1}>
                {info.name}
              </AppText>
              <AppText variant="caption" color="textSecondary">
                {formatPercent(slice.percentage)}
              </AppText>
              <AppText variant="bodyStrong" style={{ minWidth: 88, textAlign: 'right' }}>
                {formatCLP(slice.total)}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}
