import { formatAmountInput, parseCLPInput } from '@/lib/finance';

import { TextField, type TextFieldProps } from './TextField';

type AmountFieldProps = Omit<TextFieldProps, 'value' | 'onChangeText' | 'keyboardType'> & {
  value: string;
  onChangeText: (text: string) => void;
};

/** Campo de monto en pesos: agrega los puntos de miles mientras se escribe. */
export function AmountField({ value, onChangeText, ...props }: AmountFieldProps) {
  return (
    <TextField
      {...props}
      prefix="$"
      value={value}
      keyboardType="number-pad"
      inputMode="numeric"
      placeholder={props.placeholder ?? '0'}
      onChangeText={(text) => {
        const parsed = parseCLPInput(text);
        onChangeText(parsed === null ? '' : formatAmountInput(Math.abs(parsed)));
      }}
    />
  );
}
