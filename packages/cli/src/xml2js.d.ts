declare module 'xml2js' {
  export interface ParserOptions {
    explicitArray?: boolean
    preserveChildrenOrder?: boolean
  }

  export interface BuilderOptions {
    headless?: boolean
    renderOpts?: {
      pretty?: boolean
      indent?: string
      newline?: string
    }
  }

  export class Builder {
    constructor(options?: BuilderOptions)
    buildObject(rootObj: unknown): string
  }

  export function parseStringPromise(value: string, options?: ParserOptions): Promise<unknown>
}
