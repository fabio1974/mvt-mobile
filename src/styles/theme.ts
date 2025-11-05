// Tema e estilos globais do app

export const theme = {
  colors: {
    // Primary
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    primaryLight: '#60a5fa',
    
    // Secondary
    secondary: '#8b5cf6',
    secondaryDark: '#7c3aed',
    secondaryLight: '#a78bfa',
    
    // Success
    success: '#10b981',
    successDark: '#059669',
    successLight: '#34d399',
    
    // Warning
    warning: '#f59e0b',
    warningDark: '#d97706',
    warningLight: '#fbbf24',
    
    // Error
    error: '#ef4444',
    errorDark: '#dc2626',
    errorLight: '#f87171',
    
    // Neutral
    white: '#ffffff',
    black: '#000000',
    gray50: '#f9fafb',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray300: '#d1d5db',
    gray400: '#9ca3af',
    gray500: '#6b7280',
    gray600: '#4b5563',
    gray700: '#374151',
    gray800: '#1f2937',
    gray900: '#111827',
    
    // Background
    background: '#ffffff',
    backgroundDark: '#f3f4f6',
    
    // Text
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    textDisabled: '#9ca3af',
    textInverse: '#ffffff',
    
    // Border
    border: '#e5e7eb',
    borderDark: '#d1d5db',
    
    // Status
    online: '#10b981',
    offline: '#6b7280',
    pending: '#f59e0b',
    completed: '#3b82f6',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 30,
  },
  
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.23,
      shadowRadius: 2.62,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
    },
  },
};

export type Theme = typeof theme;

export default theme;
