import { createNotionApi } from "./createNotionApi"

export const getRecordMap = async (pageId: string) => {
  const api = createNotionApi()
  try {
    const recordMap = await api.getPage(pageId)
    return recordMap
  } catch (error) {
    console.error(
      `[@notion] Failed to load recordMap for ${pageId}: ${(error as Error).message}`,
      "Verify the page is shared to web or that NOTION_TOKEN is set for notion-client access."
    )
    throw error
  }
}
