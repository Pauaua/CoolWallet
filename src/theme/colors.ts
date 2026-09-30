/**
 * Tokens de color de la app. Es el ÚNICO lugar donde se escriben colores
 * literales; los componentes siempre leen `useTheme().colors`.
 */
export type ColorTokens = {
  primary: string;
  primaryDark: string;
  accent: string;
  /** Fondo suave del primario (ítem activo del drawer, chips, íconos). */
  primarySoft: string;
  /** Texto/ícono sobre fondo `primary`. */
  onPrimary: string;
  background: string;
  surface: string;
  border: string;
  text: string;
  textSecondary: string;
  success: string;
  warning: string;
  danger: string;
  /** Velo detrás de modales y del drawer. */
  overlay: string;
  shadow: string;
};

export const lightColors: ColorTokens = {
  primary: '#1F6F50',
  primaryDark: '#144D38',
  accent: '#3FA27A',
  primarySoft: '#E3F0EA',
  onPrimary: '#FFFFFF',
  background: '#F5F8F6',
  surface: '#FFFFFF',
  border: '#DCE7E1',
  text: '#16261F',
  textSecondary: '#5B6F66',
  success: '#2E9E6B',
  warning: '#D9A13B',
  danger: '#C4524A',
  overlay: 'rgba(22, 38, 31, 0.45)',
  shadow: '#0B1A13',
};

export const darkColors: ColorTokens = {
  primary: '#3FA27A',
  primaryDark: '#1F6F50',
  accent: '#5BBF94',
  primarySoft: '#1C3A2D',
  onPrimary: '#0F1A15',
  background: '#0F1A15',
  surface: '#16241D',
  border: '#24382E',
  text: '#E6EFEA',
  textSecondary: '#9DB2A8',
  success: '#3DB77F',
  warning: '#E0B055',
  danger: '#D9695F',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
};
