import { VoltraAndroid } from 'voltra/android'

export const AndroidVoltraWidget = ({ time }: { time: string }) => {
  return (
    <VoltraAndroid.Column
      style={{
        backgroundColor: '#FFFFFF',
        width: '100%',
        height: '100%',
        padding: 16,
      }}
      horizontalAlignment="center-horizontally"
      verticalAlignment="center-vertically"
    >
      <VoltraAndroid.Image source={{ assetName: 'voltra_logo' }} />
      <VoltraAndroid.Spacer style={{ height: 12 }} />
      <VoltraAndroid.Text>Launched: {time}</VoltraAndroid.Text>
    </VoltraAndroid.Column>
  )
}
