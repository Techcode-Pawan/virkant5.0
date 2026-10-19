/**
 * @forgewise/design-tokens
 * Precision Industrial Tokens (WCAG 2.2 AA Compliant)
 */

export const colors = {
  light: {
    bgBase: 'hsl(210, 20%, 98%)',
    bgSurface: 'hsl(0, 0%, 100%)',
    bgElevated: 'hsl(210, 20%, 96%)',
    textPrimary: 'hsl(222, 47%, 11%)',
    textMuted: 'hsl(215, 16%, 47%)',
    borderSubtle: 'hsl(214, 32%, 91%)',
    borderFocus: 'hsl(199, 89%, 48%)',
    brandPrimary: 'hsl(215, 28%, 17%)',
    accentTeal: 'hsl(187, 85%, 38%)',
    statusSuccess: 'hsl(142, 71%, 38%)',
    statusWarning: 'hsl(38, 92%, 44%)',
    statusDanger: 'hsl(0, 84%, 48%)',
  },
  dark: {
    bgBase: 'hsl(222, 47%, 7%)',
    bgSurface: 'hsl(222, 40%, 11%)',
    bgElevated: 'hsl(217, 33%, 17%)',
    textPrimary: 'hsl(210, 40%, 98%)',
    textMuted: 'hsl(215, 20%, 65%)',
    borderSubtle: 'hsl(217, 33%, 20%)',
    borderFocus: 'hsl(199, 89%, 48%)',
    brandPrimary: 'hsl(210, 40%, 96%)',
    accentTeal: 'hsl(187, 85%, 48%)',
    statusSuccess: 'hsl(142, 71%, 45%)',
    statusWarning: 'hsl(38, 92%, 50%)',
    statusDanger: 'hsl(0, 84%, 60%)',
  },
  highContrast: {
    bgBase: 'hsl(0, 0%, 0%)',
    bgSurface: 'hsl(0, 0%, 5%)',
    bgElevated: 'hsl(0, 0%, 12%)',
    textPrimary: 'hsl(0, 0%, 100%)',
    textMuted: 'hsl(0, 0%, 85%)',
    borderSubtle: 'hsl(0, 0%, 50%)',
    borderFocus: 'hsl(60, 100%, 50%)',
    brandPrimary: 'hsl(0, 0%, 100%)',
    accentTeal: 'hsl(180, 100%, 50%)',
    statusSuccess: 'hsl(120, 100%, 50%)',
    statusWarning: 'hsl(60, 100%, 50%)',
    statusDanger: 'hsl(0, 100%, 50%)',
  },
};

export const motionTokens = {
  duration: {
    fast: 150,
    standard: 240,
    slow: 380,
  },
  easing: {
    easeOutCubic: [0.33, 1, 0.68, 1],
    easeInOutCubic: [0.65, 0, 0.35, 1],
  },
};
