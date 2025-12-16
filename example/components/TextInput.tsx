import { StyleProp, StyleSheet, TextInput as RNTextInput, View, ViewStyle } from 'react-native'

export type TextInputProps = {
  style?: StyleProp<ViewStyle>
  placeholder?: string
  value?: string
  onChangeText?: (text: string) => void
  disabled?: boolean
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'url'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  autoCorrect?: boolean
}

export const TextInput = ({
  style,
  placeholder,
  value,
  onChangeText,
  disabled = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
}: TextInputProps) => {
  return (
    <View style={[styles.container, style]}>
      <RNTextInput
        style={[styles.input, disabled && styles.inputDisabled]}
        placeholder={placeholder}
        placeholderTextColor="#64748B"
        value={value}
        onChangeText={onChangeText}
        editable={!disabled}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    backgroundColor: '#1E293B',
    overflow: 'hidden',
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#E2E8F0',
    minHeight: 48,
  },
  inputDisabled: {
    opacity: 0.5,
  },
})
