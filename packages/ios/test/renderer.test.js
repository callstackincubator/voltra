const assert = require('node:assert/strict')
const test = require('node:test')
const React = require('react')

const ios = require('../build/commonjs/index.js')
const { createVoltraComponent } = require('../build/commonjs/jsx/createVoltraComponent.js')

const {
  COMPONENT_NAME_TO_ID,
  Voltra,
  getComponentId,
  renderLiveActivityToJson,
  renderLiveActivityToString,
  renderVoltraVariantToJson,
  renderWidgetToJson,
  renderWidgetToString,
} = ios

test('renders widget families into the expected payload roots', () => {
  const widgetJson = renderWidgetToJson({
    systemSmall: React.createElement(Voltra.Text, null, 'Small'),
    systemMedium: React.createElement(
      Voltra.View,
      { testID: 'medium-root' },
      React.createElement(Voltra.Text, null, 'Medium')
    ),
    systemLarge: React.createElement(Voltra.VStack, null, React.createElement(Voltra.Text, null, 'Large')),
    accessoryCircular: React.createElement(Voltra.Text, null, 'Circle'),
    accessoryInline: null,
    accessoryRectangular: undefined,
  })

  assert.deepEqual(widgetJson, {
    v: 1,
    systemSmall: {
      t: getComponentId('Text'),
      c: 'Small',
    },
    systemMedium: {
      t: getComponentId('View'),
      c: {
        t: getComponentId('Text'),
        c: 'Medium',
      },
      p: {
        testID: 'medium-root',
      },
    },
    systemLarge: {
      t: getComponentId('VStack'),
      c: {
        t: getComponentId('Text'),
        c: 'Large',
      },
    },
    accessoryCircular: {
      t: getComponentId('Text'),
      c: 'Circle',
    },
  })

  assert.equal(
    renderWidgetToString({ systemSmall: React.createElement(Voltra.Text, null, 'Small') }),
    JSON.stringify({
      v: 1,
      systemSmall: {
        t: getComponentId('Text'),
        c: 'Small',
      },
    })
  )
  assert.ok(!('accessoryInline' in widgetJson))
  assert.ok(!('accessoryRectangular' in widgetJson))
})

test('renders live activity slots and metadata into the expected keys', () => {
  const liveActivityJson = renderLiveActivityToJson({
    lockScreen: {
      content: React.createElement(Voltra.Text, null, 'Lock screen'),
      activityBackgroundTint: '#112233',
    },
    island: {
      expanded: {
        center: React.createElement(Voltra.View, null, React.createElement(Voltra.Text, null, 'Center')),
        leading: React.createElement(Voltra.Text, null, 'Leading'),
        trailing: React.createElement(Voltra.Text, null, 'Trailing'),
        bottom: React.createElement(Voltra.Text, null, 'Bottom'),
      },
      compact: {
        leading: React.createElement(Voltra.Text, null, 'Compact leading'),
        trailing: React.createElement(Voltra.Text, null, 'Compact trailing'),
      },
      minimal: React.createElement(Voltra.Text, null, 'Minimal'),
      keylineTint: '#445566',
    },
    supplementalActivityFamilies: {
      small: React.createElement(Voltra.Text, null, 'Supplemental'),
    },
  })

  assert.deepEqual(liveActivityJson, {
    v: 1,
    ls: {
      t: getComponentId('Text'),
      c: 'Lock screen',
    },
    isl_exp_c: {
      t: getComponentId('View'),
      c: {
        t: getComponentId('Text'),
        c: 'Center',
      },
    },
    isl_exp_l: {
      t: getComponentId('Text'),
      c: 'Leading',
    },
    isl_exp_t: {
      t: getComponentId('Text'),
      c: 'Trailing',
    },
    isl_exp_b: {
      t: getComponentId('Text'),
      c: 'Bottom',
    },
    isl_cmp_l: {
      t: getComponentId('Text'),
      c: 'Compact leading',
    },
    isl_cmp_t: {
      t: getComponentId('Text'),
      c: 'Compact trailing',
    },
    isl_min: {
      t: getComponentId('Text'),
      c: 'Minimal',
    },
    saf_sm: {
      t: getComponentId('Text'),
      c: 'Supplemental',
    },
    ls_background_tint: '#112233',
    isl_keyline_tint: '#445566',
  })

  assert.equal(
    renderLiveActivityToString({
      lockScreen: React.createElement(Voltra.Text, null, 'Lock screen'),
      island: {
        minimal: React.createElement(Voltra.Text, null, 'Minimal'),
      },
    }),
    JSON.stringify({
      v: 1,
      ls: {
        t: getComponentId('Text'),
        c: 'Lock screen',
      },
      isl_min: {
        t: getComponentId('Text'),
        c: 'Minimal',
      },
    })
  )
})

test('omits absent live activity roots and metadata', () => {
  const liveActivityJson = renderLiveActivityToJson({
    lockScreen: {
      content: null,
    },
    island: {
      expanded: {
        leading: undefined,
      },
      compact: {
        trailing: null,
      },
      minimal: undefined,
    },
    supplementalActivityFamilies: {
      small: null,
    },
  })

  assert.deepEqual(liveActivityJson, {
    v: 1,
  })
})

test('uses the generated component registry for known components', () => {
  assert.equal(COMPONENT_NAME_TO_ID.Text, getComponentId('Text'))
  assert.equal(COMPONENT_NAME_TO_ID.View, getComponentId('View'))

  assert.deepEqual(
    renderVoltraVariantToJson(React.createElement(Voltra.View, null, React.createElement(Voltra.Text, null, 'Hello'))),
    {
      t: getComponentId('View'),
      c: {
        t: getComponentId('Text'),
        c: 'Hello',
      },
    }
  )
})

test('fails loudly for unknown generated component names', () => {
  const Unknown = createVoltraComponent('UnknownWidget')

  assert.throws(() => renderVoltraVariantToJson(React.createElement(Unknown, null)), {
    message: /Unknown component name: "UnknownWidget"/,
  })
})
