import { createVoltraComponent, createVoltraRenderer, env, eq, inList, match } from '@use-voltra/core'

const ControlIf = createVoltraComponent<Record<string, unknown>>('ControlIf')
const ControlSwitch = createVoltraComponent<Record<string, unknown>>('ControlSwitch')
const Text = createVoltraComponent<Record<string, unknown>>('Text')
const View = createVoltraComponent<Record<string, unknown>>('View')

const componentRegistry = {
  getComponentId: (name: string) => {
    const ids: Record<string, number> = { ControlIf: 22, ControlSwitch: 23, Text: 0, View: 20 }
    const id = ids[name]
    if (id === undefined) throw new Error(`Unknown component: ${name}`)
    return id
  },
}

describe('<ControlIf> control-flow component', () => {
  test('renders then-branch as children with serialized condition', () => {
    const renderer = createVoltraRenderer(componentRegistry)

    renderer.addRootNode('main', {
      type: ControlIf,
      props: {
        condition: eq(env.renderingMode, 'accented'),
        children: { type: Text, props: { children: 'Accented' } },
      },
    } as never)

    expect(renderer.render()).toEqual({
      v: 2,
      main: {
        t: 22,
        c: { t: 0, c: 'Accented' },
        p: {
          // condition: eq(env.renderingMode, 'accented')
          // eq opcode = 0, env.renderingMode = {$rv:[0,0]}, 'accented'
          cond: [0, { $rv: [0, 0] }, 'accented'],
        },
      },
    })
  })

  test('renders else branch in props when provided', () => {
    const renderer = createVoltraRenderer(componentRegistry)

    renderer.addRootNode('main', {
      type: ControlIf,
      props: {
        condition: eq(env.renderingMode, 'accented'),
        children: { type: Text, props: { children: 'Accented' } },
        else: { type: Text, props: { children: 'Other' } },
      },
    } as never)

    expect(renderer.render()).toEqual({
      v: 2,
      main: {
        t: 22,
        c: { t: 0, c: 'Accented' },
        p: {
          cond: [0, { $rv: [0, 0] }, 'accented'],
          els: { t: 0, c: 'Other' },
        },
      },
    })
  })

  test('renders with empty children when none provided', () => {
    const renderer = createVoltraRenderer(componentRegistry)

    renderer.addRootNode('main', {
      type: ControlIf,
      props: {
        condition: inList(env.renderingMode, ['accented', 'fullColor']),
      },
    } as never)

    expect(renderer.render()).toEqual({
      v: 2,
      main: {
        t: 22,
        c: [],
        p: {
          // inList opcode = 5
          cond: [5, { $rv: [0, 0] }, ['accented', 'fullColor']],
        },
      },
    })
  })
})

describe('<ControlSwitch> control-flow component', () => {
  test('renders all cases with serialized env value', () => {
    const renderer = createVoltraRenderer(componentRegistry)

    renderer.addRootNode('main', {
      type: ControlSwitch,
      props: {
        value: env.renderingMode,
        cases: {
          accented: { type: Text, props: { children: 'Accented' } },
          fullColor: { type: Text, props: { children: 'Full Color' } },
          default: { type: Text, props: { children: 'Default' } },
        },
      },
    } as never)

    expect(renderer.render()).toEqual({
      v: 2,
      main: {
        t: 23,
        p: {
          // env.renderingMode = {$rv:[0,0]}
          v: { $rv: [0, 0] },
          cas: {
            accented: { t: 0, c: 'Accented' },
            fullColor: { t: 0, c: 'Full Color' },
            default: { t: 0, c: 'Default' },
          },
        },
      },
    })
  })

  test('supports match() expression as value', () => {
    const renderer = createVoltraRenderer(componentRegistry)

    renderer.addRootNode('main', {
      type: ControlSwitch,
      props: {
        value: match(env.renderingMode, {
          accented: 'dark',
          default: 'light',
        }),
        cases: {
          dark: { type: Text, props: { children: 'Dark' } },
          light: { type: Text, props: { children: 'Light' } },
        },
      },
    } as never)

    expect(renderer.render()).toEqual({
      v: 2,
      main: {
        t: 23,
        p: {
          v: { $rv: [2, { $rv: [0, 0] }, { accented: 'dark', default: 'light' }] },
          cas: {
            dark: { t: 0, c: 'Dark' },
            light: { t: 0, c: 'Light' },
          },
        },
      },
    })
  })

  test('renders cases with component subtrees', () => {
    const renderer = createVoltraRenderer(componentRegistry)

    renderer.addRootNode('main', {
      type: ControlSwitch,
      props: {
        value: env.renderingMode,
        cases: {
          accented: { type: View, props: {} },
          default: { type: View, props: {} },
        },
      },
    } as never)

    expect(renderer.render()).toEqual({
      v: 2,
      main: {
        t: 23,
        p: {
          v: { $rv: [0, 0] },
          cas: {
            accented: { t: 20 },
            default: { t: 20 },
          },
        },
      },
    })
  })
})
