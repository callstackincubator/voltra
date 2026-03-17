import { Text } from '../../jsx/Text'
import { renderLiveActivityToString } from '../../server'

describe('Compression', () => {
  test('Small payload compression', async () => {
    const content = 'a'.repeat(500)
    const result = await renderLiveActivityToString({ lockScreen: <Text>{content}</Text> })

    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  test('Large payload compression', async () => {
    const content = 'repetition '.repeat(300)
    const inputSizeEstimate = content.length

    const result = await renderLiveActivityToString({ lockScreen: <Text>{content}</Text> })
    const outputSize = result.length

    expect(outputSize).toBeLessThan(inputSizeEstimate * 0.5)
  })

  test('Already small payload', async () => {
    const content = 'short'
    const result = await renderLiveActivityToString({ lockScreen: <Text>{content}</Text> })
    expect(result.length).toBeGreaterThan(0)
  })

  test('Repetitive content', async () => {
    const items = Array.from({ length: 100 }, (_, i) => <Text key={i}>item</Text>)
    const result = await renderLiveActivityToString({ lockScreen: <>{items}</> })

    expect(result.length).toBeLessThan(1000)
  })

  test('Unique content', async () => {
    const unique = Array.from({ length: 1000 }, (_, i) => String.fromCharCode(i % 128)).join('')
    const repetitive = 'a'.repeat(1000)

    const resUnique = await renderLiveActivityToString({ lockScreen: <Text>{unique}</Text> })
    const resRepetitive = await renderLiveActivityToString({ lockScreen: <Text>{repetitive}</Text> })

    expect(resRepetitive.length).toBeLessThan(resUnique.length)
  })

  test('Base64 overhead', async () => {
    const content = 'a'.repeat(1000)
    const base64 = await renderLiveActivityToString({ lockScreen: <Text>{content}</Text> })
    const buffer = Buffer.from(base64, 'base64')

    const expectedBase64Size = Math.ceil(buffer.length / 3) * 4
    expect(base64.length).toBeGreaterThanOrEqual(buffer.length)
    expect(Math.abs(base64.length - expectedBase64Size)).toBeLessThan(4)
  })
})
