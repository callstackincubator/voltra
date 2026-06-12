# Interactive Controls (Android)

User interface controls that respond to user interaction on Android widgets.

### Button

Standard button component. On Android, all buttons always open the application when clicked. You can provide a `deepLinkUrl` to open a specific screen.

**Parameters:**

- `enabled` (boolean, optional): Whether the button is enabled.
- `deepLinkUrl` (string, optional): URL to open when the button is clicked. If not provided, the app will open to its main activity.

Voltra also provides specialized button variants:

#### FilledButton
- `text` (string): Button label.
- `enabled` (boolean, optional).
- `deepLinkUrl` (string, optional).
- `icon` (object, optional): `{ assetName: string }`.
- `backgroundColor` (string, optional).
- `contentColor` (string, optional).
- `maxLines` (number, optional).

#### OutlineButton
- `text` (string): Button label.
- `enabled` (boolean, optional).
- `deepLinkUrl` (string, optional).
- `icon` (object, optional): `{ assetName: string }`.
- `contentColor` (string, optional).
- `maxLines` (number, optional).

#### CircleIconButton & SquareIconButton
- `enabled` (boolean, optional).
- `deepLinkUrl` (string, optional).
- `icon` (object, optional): `{ assetName: string, base64: string }`.
- `contentDescription` (string, optional).
- `backgroundColor` (string, optional).
- `contentColor` (string, optional).

---

### Clickable Components

Most components support being clickable by setting the `pressable` prop (short name `prs` in raw elements) in their props.

**Parameters:**
- `pressable` (boolean): Set to `true` to make the component respond to clicks.
- `deepLinkUrl` (string, optional): URL to open when clicked.

---

### Switch

A toggle switch component. On Android, toggles always open the application when clicked.

**Parameters:**

- `checked` (boolean, optional): Current state of the switch.
- `deepLinkUrl` (string, optional): URL to open when clicked.
- `text` (string, optional): Label displayed next to the switch.
- `thumbCheckedColor` (string, optional).
- `thumbUncheckedColor` (string, optional).
- `trackCheckedColor` (string, optional).
- `trackUncheckedColor` (string, optional).
- `maxLines` (number, optional): Maximum lines for the label.

---

### CheckBox

Standard checkbox component. On Android, checkboxes always open the application when clicked.

**Parameters:**

- `checked` (boolean, optional).
- `deepLinkUrl` (string, optional).
- `text` (string, optional).
- `checkedColor` (string, optional).
- `uncheckedColor` (string, optional).
- `maxLines` (number, optional).

---

### RadioButton

Standard radio button component. On Android, radio buttons always open the application when clicked.

**Parameters:**

- `checked` (boolean, optional).
- `enabled` (boolean, optional).
- `deepLinkUrl` (string, optional).
- `text` (string, optional).
- `checkedColor` (string, optional).
- `uncheckedColor` (string, optional).
- `maxLines` (number, optional).
