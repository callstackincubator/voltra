import { createVoltraComponent, createVoltraRenderer, env, eq, match, when } from '@use-voltra/core'

const componentRegistry = {
  getComponentId: () => 1,
}

const View = createVoltraComponent<Record<string, unknown>>('View')

describe('Resolvable payload serialization', () => {
  test('serializes nested resolvable values with the $rv sentinel', () => {
    const renderer = createVoltraRenderer(componentRegistry)

    renderer.addRootNode('main', {
      type: View,
      props: {
        style: {
          backgroundColor: when(eq(env.renderingMode, 'accented'), 'red', 'blue'),
          shadowOffset: {
            width: match(env.renderingMode, {
              accented: 1,
              fullColor: 2,
              default: 0,
            }),
            height: 4,
          },
        },
      },
    } as never)

    expect(renderer.render()).toEqual({
      v: 2,
      main: {
        t: 1,
        p: {
          s: 0,
        },
      },
      s: [
        {
          bg: {
            $rv: [1, [0, { $rv: [0, 0] }, 'accented'], 'red', 'blue'],
          },
          sho: {
            width: {
              $rv: [2, { $rv: [0, 0] }, { accented: 1, fullColor: 2, default: 0 }],
            },
            height: 4,
          },
        },
      ],
    })
  })

  test('rejects plain objects that collide with the reserved sentinel key', () => {
    const renderer = createVoltraRenderer(componentRegistry)

    renderer.addRootNode('main', {
      type: View,
      props: {
        metadata: {
          $rv: 'reserved',
        },
      },
    } as never)

    expect(() => renderer.render()).toThrow('reserved for serialized resolvable values')
  })
})
