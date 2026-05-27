declare module 'cosmiconfig' {
  export interface CosmiconfigResult {
    config: unknown
    filepath: string
    isEmpty?: boolean
  }

  export interface CosmiconfigExplorer {
    search(searchFrom?: string): Promise<CosmiconfigResult | null>
    load(filepath: string): Promise<CosmiconfigResult | null>
  }

  export interface CosmiconfigOptions {
    searchPlaces?: string[]
    loaders?: Record<string, unknown>
  }

  export const defaultLoaders: Record<string, unknown>

  export function cosmiconfig(moduleName: string, options?: CosmiconfigOptions): CosmiconfigExplorer
}
