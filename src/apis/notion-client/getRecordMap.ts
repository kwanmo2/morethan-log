import { createNotionApi } from "./createNotionApi"
import { normalizeRecordMap } from "./normalizeRecordMap"
import { withNotionRetry } from "./withNotionRetry"

const recordMapCache = new Map<string, Promise<any>>()

export const getRecordMap = async (pageId: string) => {
  const cached = recordMapCache.get(pageId)
  if (cached) return cached

  const api = createNotionApi()
  const request = withNotionRetry(`load recordMap ${pageId}`, () =>
    api.getPage(pageId)
  )
    .then((recordMap) => normalizeRecordMap(recordMap))
    .catch((error) => {
      recordMapCache.delete(pageId)
      console.error(
        `[@notion] Failed to load recordMap for ${pageId}: ${
          (error as Error).message
        }`,
        "Verify the page is shared to web or that NOTION_TOKEN is set for notion-client access."
      )
      throw error
    })

  recordMapCache.set(pageId, request)
  return request
}
