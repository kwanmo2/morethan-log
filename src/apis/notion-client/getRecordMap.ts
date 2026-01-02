export const getRecordMap = async (pageId: string) => {
  const { NotionAPI } = await import("notion-client")
  const api = new NotionAPI()
  try {
    const recordMap = await api.getPage(pageId)
    return recordMap
  } catch (error) {
    console.error(
      `[@notion] Failed to load recordMap for ${pageId}: ${(error as Error).message}`,
      "Verify the page is shared with the integration and that the Notion tokens are still valid."
    )
    throw error
  }
}
