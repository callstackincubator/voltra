import dedent from 'dedent'

/**
 * Generates placeholder layout XML for widgets
 * This will be replaced by Glance at runtime
 */
export function generatePlaceholderLayoutXml(): string {
  return dedent`
    <?xml version="1.0" encoding="utf-8"?>
    <FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:background="?android:attr/colorBackground">
        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_gravity="center"
            android:text="Loading..."
            android:textColor="?android:attr/textColorPrimary" />
    </FrameLayout>
  `
}
