import { useState } from 'react';
import { View } from 'react-native';

import { AmountField, AppText, Button, Card, ChipGroup, Icon, Notice } from '@/components';
import { useCategories } from '@/features/categories/queries';
import { formatAmountInput, formatCLP, parseCLPInput, toIsoDate } from '@/lib/finance';
import { useTheme } from '@/theme';

import { useCreateTransaction } from './queries';
import type { AccountWithBalance } from './walletSummary';

type SalaryPendingCardProps = {
  expectedSalary: number;
  accounts: readonly AccountWithBalance[];
};

/** "¿Recibiste tu sueldo?": registra el sueldo con un toque, o con otro monto/cuenta. */
export function SalaryPendingCard({ expectedSalary, accounts }: SalaryPendingCardProps) {
  const { spacing } = useTheme();
  const incomeCategories = useCategories(['income']);
  const create = useCreateTransaction();
  const [editing, setEditing] = useState(false);
  const [amountText, setAmountText] = useState(formatAmountInput(expectedSalary));
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? null);
  const [error, setError] = useState<string | null>(null);

  const salaryCategory = incomeCategories.data?.find((category) => category.name === 'Sueldo') ?? incomeCategories.data?.[0];

  const register = (amount: number) => {
    if (!accountId) {
      setError('Primero crea una cuenta en la Billetera.');
      return;
    }
    if (amount <= 0) {
      setError('Ingresa un monto mayor a $0.');
      return;
    }
    setError(null);
    create.mutate({
      type: 'income',
      amount,
      date: toIsoDate(new Date()),
      accountId,
      categoryId: salaryCategory?.id ?? null,
      note: 'Sueldo',
      isSalary: true,
    });
  };

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
        <Icon name="briefcase" color="primary" />
        <AppText variant="heading" style={{ flex: 1 }}>
          ¿Recibiste tu sueldo?
        </AppText>
      </View>

      {editing ? (
        <View style={{ gap: spacing.md }}>
          <AmountField label="Monto recibido" value={amountText} onChangeText={setAmountText} />
          {accounts.length > 1 ? (
            <ChipGroup
              accessibilityLabel="Cuenta donde llegó"
              options={accounts.map((account) => ({ value: account.id, label: account.name }))}
              value={accountId}
              onChange={setAccountId}
            />
          ) : null}
          <Button label="Registrar sueldo" icon="check" loading={create.isPending} onPress={() => register(parseCLPInput(amountText) ?? 0)} />
          <Button label="Cancelar" variant="ghost" onPress={() => setEditing(false)} />
        </View>
      ) : (
        <>
          <AppText color="textSecondary">
            Tu líquido calculado es <AppText variant="bodyStrong">{formatCLP(expectedSalary)}</AppText>
            {accounts[0] ? ` y se registrará en ${accounts[0].name}.` : '.'}
          </AppText>
          <Button label={`Sí, recibí ${formatCLP(expectedSalary)}`} icon="check" loading={create.isPending} onPress={() => register(expectedSalary)} />
          <Button label="Recibí otro monto" variant="secondary" onPress={() => setEditing(true)} />
        </>
      )}

      {error ? <Notice tone="warning" message={error} /> : null}
      {create.isError ? <Notice tone="danger" message="No pudimos registrar el sueldo. Intenta de nuevo." /> : null}
    </Card>
  );
}
