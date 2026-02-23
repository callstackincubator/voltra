import { VoltraAndroid } from 'voltra/android'

interface ImageFallbackWidgetProps {
  example?: 'colors' | 'styled' | 'transparent' | 'custom' | 'mixed'
}

export const AndroidImageFallbackWidget = ({ example = 'colors' }: ImageFallbackWidgetProps) => {
  if (example === 'colors') {
    return (
      <VoltraAndroid.Column
        style={{
          backgroundColor: '#0F172A',
          width: '100%',
          height: '100%',
          padding: 16,
        }}
        horizontalAlignment="start"
        verticalAlignment="top"
      >
        <VoltraAndroid.Text
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: '#FFFFFF',
            marginBottom: 12,
          }}
        >
          Image Fallback: Background Colors
        </VoltraAndroid.Text>
        <VoltraAndroid.Text
          style={{
            fontSize: 12,
            color: '#94A3B8',
            marginBottom: 12,
          }}
        >
          Missing images with backgroundColor from styles:
        </VoltraAndroid.Text>
        <VoltraAndroid.Row style={{ width: '100%' }} horizontalAlignment="start" verticalAlignment="center-vertically">
          <VoltraAndroid.Image
            source={{ assetName: 'missing-image-1' }}
            style={{
              width: 60,
              height: 60,
              backgroundColor: '#EF4444',
              borderRadius: 12,
              marginRight: 8,
            }}
          />
          <VoltraAndroid.Image
            source={{ assetName: 'missing-image-2' }}
            style={{
              width: 60,
              height: 60,
              backgroundColor: '#F59E0B',
              borderRadius: 12,
              marginRight: 8,
            }}
          />
          <VoltraAndroid.Image
            source={{ assetName: 'missing-image-3' }}
            style={{
              width: 60,
              height: 60,
              backgroundColor: '#10B981',
              borderRadius: 12,
              marginRight: 8,
            }}
          />
          <VoltraAndroid.Image
            source={{ assetName: 'missing-image-4' }}
            style={{
              width: 60,
              height: 60,
              backgroundColor: '#3B82F6',
              borderRadius: 12,
            }}
          />
        </VoltraAndroid.Row>
      </VoltraAndroid.Column>
    )
  }

  if (example === 'styled') {
    return (
      <VoltraAndroid.Column
        style={{
          backgroundColor: '#1E293B',
          width: '100%',
          height: '100%',
          padding: 16,
        }}
        horizontalAlignment="center-horizontally"
        verticalAlignment="center-vertically"
      >
        <VoltraAndroid.Text
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: '#FFFFFF',
            marginBottom: 12,
          }}
        >
          Combined Style Properties
        </VoltraAndroid.Text>
        <VoltraAndroid.Image
          source={{ assetName: 'missing-styled' }}
          style={{
            width: 120,
            height: 80,
            backgroundColor: '#8B5CF6',
            borderRadius: 20,
          }}
        />
        <VoltraAndroid.Text
          style={{
            fontSize: 11,
            color: '#94A3B8',
            marginTop: 8,
          }}
        >
          backgroundColor + borderRadius
        </VoltraAndroid.Text>
      </VoltraAndroid.Column>
    )
  }

  if (example === 'transparent') {
    return (
      <VoltraAndroid.Column
        style={{
          backgroundColor: '#6366F1',
          width: '100%',
          height: '100%',
          padding: 16,
        }}
        horizontalAlignment="center-horizontally"
        verticalAlignment="center-vertically"
      >
        <VoltraAndroid.Text
          style={{
            fontSize: 14,
            fontWeight: 'bold',
            color: '#FFFFFF',
            marginBottom: 8,
          }}
        >
          Transparent Fallback
        </VoltraAndroid.Text>
        <VoltraAndroid.Text
          style={{
            fontSize: 10,
            color: '#E0E7FF',
            marginBottom: 12,
          }}
        >
          Parent: Purple background
        </VoltraAndroid.Text>
        <VoltraAndroid.Image
          source={{ assetName: 'nonexistent' }}
          style={{
            width: 100,
            height: 100,
          }}
        />
        <VoltraAndroid.Text
          style={{
            fontSize: 10,
            color: '#E0E7FF',
            marginTop: 8,
          }}
        >
          ↑ Image has no backgroundColor
        </VoltraAndroid.Text>
        <VoltraAndroid.Text
          style={{
            fontSize: 10,
            color: '#E0E7FF',
          }}
        >
          Purple shows through = transparent!
        </VoltraAndroid.Text>
      </VoltraAndroid.Column>
    )
  }

  if (example === 'custom') {
    return (
      <VoltraAndroid.Column
        style={{
          backgroundColor: '#0F172A',
          width: '100%',
          height: '100%',
          padding: 16,
        }}
        horizontalAlignment="center-horizontally"
        verticalAlignment="center-vertically"
      >
        <VoltraAndroid.Text
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: '#FFFFFF',
            marginBottom: 12,
          }}
        >
          Custom Fallback Component
        </VoltraAndroid.Text>
        <VoltraAndroid.Image
          source={{ assetName: 'missing-custom' }}
          fallback={
            <VoltraAndroid.Column
              style={{ width: '100%', height: '100%' }}
              horizontalAlignment="center-horizontally"
              verticalAlignment="center-vertically"
            >
              <VoltraAndroid.Text
                style={{
                  fontSize: 32,
                  color: '#64748B',
                  marginBottom: 4,
                }}
              >
                📷
              </VoltraAndroid.Text>
              <VoltraAndroid.Text
                style={{
                  fontSize: 12,
                  color: '#64748B',
                  textAlign: 'center',
                }}
              >
                No Image
              </VoltraAndroid.Text>
            </VoltraAndroid.Column>
          }
          style={{
            width: 100,
            height: 100,
            backgroundColor: '#1E293B',
            borderRadius: 12,
          }}
        />
      </VoltraAndroid.Column>
    )
  }

  if (example === 'mixed') {
    return (
      <VoltraAndroid.Column
        style={{
          backgroundColor: '#111827',
          width: '100%',
          height: '100%',
          padding: 16,
        }}
        horizontalAlignment="start"
        verticalAlignment="top"
      >
        <VoltraAndroid.Text
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: '#FFFFFF',
            marginBottom: 12,
          }}
        >
          Mixed Image Grid
        </VoltraAndroid.Text>
        <VoltraAndroid.Row
          style={{ width: '100%', marginBottom: 8 }}
          horizontalAlignment="start"
          verticalAlignment="center-vertically"
        >
          <VoltraAndroid.Image
            source={{ assetName: 'grid-1' }}
            style={{
              width: 70,
              height: 70,
              backgroundColor: '#DC2626',
              borderRadius: 8,
              marginRight: 8,
            }}
          />
          <VoltraAndroid.Image
            source={{ assetName: 'grid-2' }}
            style={{
              width: 70,
              height: 70,
              backgroundColor: '#059669',
              borderRadius: 8,
              marginRight: 8,
            }}
          />
          <VoltraAndroid.Image
            source={{ assetName: 'grid-3' }}
            style={{
              width: 70,
              height: 70,
              backgroundColor: '#2563EB',
              borderRadius: 8,
            }}
          />
        </VoltraAndroid.Row>
        <VoltraAndroid.Text
          style={{
            fontSize: 11,
            color: '#6B7280',
          }}
        >
          All missing - styled with different colors
        </VoltraAndroid.Text>
      </VoltraAndroid.Column>
    )
  }

  return null
}
