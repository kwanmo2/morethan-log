import { idToUuid } from "notion-utils"
import { ExtendedRecordMap, ID } from "notion-types"

export default function getAllPageIds(
  response: ExtendedRecordMap,
  viewId?: string
) {
  const collectionQuery = response.collection_query
  if (!collectionQuery) {
    console.error(
      "[@notion] Missing collection_query in Notion response. Check NOTION_PAGE_ID and database access."
    )
    return []
  }

  const views = Object.values(collectionQuery)[0]

  if (!views) {
    console.error(
      "[@notion] Notion response contains no database views. Check that NOTION_PAGE_ID is a database view page."
    )
    return []
  }

  let pageIds: ID[] = []
  if (viewId) {
    const vId = idToUuid(viewId)
    pageIds = views[vId]?.blockIds ?? []
  } else {
    const pageSet = new Set<ID>()
    // * type not exist
    Object.values(views).forEach((view: any) => {
      view?.collection_group_results?.blockIds?.forEach((id: ID) =>
        pageSet.add(id)
      )
    })
    pageIds = [...pageSet]
  }
  return pageIds
}
