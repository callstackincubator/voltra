import { ReactNode } from 'react'

import { VoltraNodeJson } from '../types.js'

export type VoltraVariantRenderer = (node: ReactNode) => VoltraNodeJson
