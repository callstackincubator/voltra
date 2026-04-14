import { and, env, eq, inList, match, ne, not, or, when } from '../index'

describe('Resolvable helpers', () => {
  test('builds branded expression objects through the public surface', () => {
    expect(env.renderingMode).toMatchObject({ kind: 'env', key: 'renderingMode' })
    expect(env.showsWidgetContainerBackground).toMatchObject({
      kind: 'env',
      key: 'showsWidgetContainerBackground',
    })

    expect(when(eq(env.renderingMode, 'accented'), 'a', 'b')).toMatchObject({
      kind: 'when',
      thenValue: 'a',
      elseValue: 'b',
    })

    expect(match(env.renderingMode, { accented: 'x', default: 'y' })).toMatchObject({
      kind: 'match',
      cases: { accented: 'x', default: 'y' },
    })

    expect(and(eq(env.renderingMode, 'accented'), ne(env.renderingMode, 'vibrant'))).toMatchObject({ kind: 'and' })
    expect(or(eq(env.renderingMode, 'accented'), eq(env.renderingMode, 'fullColor'))).toMatchObject({ kind: 'or' })
    expect(not(eq(env.showsWidgetContainerBackground, true))).toMatchObject({ kind: 'not' })
    expect(inList(env.renderingMode, ['accented', 'fullColor'])).toMatchObject({ kind: 'inList' })
  })
})
