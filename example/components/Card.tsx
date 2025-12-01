import { ReactNode } from 'react'
import { StyleSheet, Text, TextProps, View } from 'react-native'

export type CardProps = {
  children?: ReactNode
}

export type TitleProps = TextProps & {
  children: ReactNode
}

export type CardTextProps = TextProps & {
  children: ReactNode
}

const CardTitle = ({ children, style, ...props }: TitleProps) => (
  <Text style={[styles.cardTitle, style]} {...props}>
    {children}
  </Text>
)

const CardText = ({ children, style, ...props }: CardTextProps) => (
  <Text style={[styles.cardDescription, style]} {...props}>
    {children}
  </Text>
)

const CardComponent = ({ children }: CardProps) => <View style={styles.card}>{children}</View>

export const Card = Object.assign(CardComponent, {
  Title: CardTitle,
  Text: CardText,
}) as typeof CardComponent & {
  Title: typeof CardTitle
  Text: typeof CardText
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
    marginTop: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  cardDescription: {
    marginTop: 10,
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
})
