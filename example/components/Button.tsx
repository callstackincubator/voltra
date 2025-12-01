import { StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native'

export type ButtonProps = {
  style?: StyleProp<ViewStyle>
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
}

export const Button = ({ title, onPress, style, variant = 'primary', disabled = false }: ButtonProps) => {
  const buttonStyle =
    variant === 'primary' ? styles.primaryButton : variant === 'secondary' ? styles.secondaryButton : styles.ghostButton

  const buttonTextStyle =
    variant === 'primary'
      ? styles.primaryButtonText
      : variant === 'secondary'
        ? styles.secondaryButtonText
        : styles.ghostButtonText

  return (
    <TouchableOpacity
      style={[styles.button, buttonStyle, disabled && styles.buttonDisabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={disabled ? 1 : 0.8}
    >
      <Text style={[styles.buttonText, buttonTextStyle, disabled && styles.disabledText]}>{title}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#8232FF',
  },
  primaryButtonPressed: {
    backgroundColor: '#6B28E0', // Darker purple for pressed state
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: 'rgba(130, 50, 255, 0.1)', // Light purple background using primary color
    borderWidth: 1,
    borderColor: 'rgba(130, 50, 255, 0.4)', // Purple border using primary color
  },
  secondaryButtonText: {
    color: '#E2E8F0',
  },
  ghostButton: {
    borderWidth: 1,
    borderColor: 'rgba(130, 50, 255, 0.6)', // Purple border using primary color with higher opacity
    backgroundColor: 'transparent',
  },
  ghostButtonText: {
    color: '#E2E8F0',
    fontWeight: '600',
  },
  secondaryActionButton: {
    marginLeft: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  disabledText: {
    color: '#9CA3AF', // Light gray for disabled text
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  endAllButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  endAllButtonText: {
    color: '#F87171',
  },
})
