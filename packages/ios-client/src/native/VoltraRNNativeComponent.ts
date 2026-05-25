import type { HostComponent, ViewProps } from 'react-native'
import { codegenNativeComponent } from 'react-native'

export interface NativeProps extends ViewProps {
  payload: string
  viewId: string
}

export default codegenNativeComponent<NativeProps>('VoltraView') as HostComponent<NativeProps>
