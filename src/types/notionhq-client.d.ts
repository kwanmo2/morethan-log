declare module "@notionhq/client" {
  export class Client {
    constructor(config: { auth: string })
    search(params: any): Promise<any>
    pages: {
      create(params: any): Promise<any>
      update(params: any): Promise<any>
    }
    blocks: {
      children: {
        list(params: any): Promise<any>
        append(params: any): Promise<any>
      }
      delete(params: any): Promise<any>
    }
  }
}

declare module "@notionhq/client/build/src/api-endpoints" {
  export interface CreatePageParameters {
    children?: any[]
  }
}

