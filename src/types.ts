export type VoltraElementJson = {
  type: string
  id?: string
  children?: VoltraNodeJson
  props: Record<string, unknown>
}

export type VoltraNodeJson = VoltraElementJson | VoltraElementJson[] | string

export type VoltraIslandVariants = {
  minimal?: VoltraNodeJson
  compact?: {
    leading?: VoltraNodeJson
    trailing?: VoltraNodeJson
  }
  expanded?: {
    center?: VoltraNodeJson
    leading?: VoltraNodeJson
    trailing?: VoltraNodeJson
    bottom?: VoltraNodeJson
  }
}

export type VoltraVariantsJson = {
  lockScreen?: VoltraNodeJson
  island?: VoltraIslandVariants
}

export type VoltraJson = VoltraVariantsJson
