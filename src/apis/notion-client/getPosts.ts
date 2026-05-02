import { CONFIG } from "site.config"
import { parsePageId } from "notion-utils"

import { createNotionApi } from "./createNotionApi"
import getAllPageIds from "src/libs/utils/notion/getAllPageIds"
import getPageProperties from "src/libs/utils/notion/getPageProperties"
import { TPosts } from "src/types"
import { normalizeRecordMap } from "./normalizeRecordMap"
import { withNotionRetry } from "./withNotionRetry"

const getRecordValue = (record: any) => {
  return record?.value?.value || record?.value || record
}

let postsCache: Promise<TPosts> | null = null

/**
 * @param {{ includePages: boolean }} - false: posts only / true: include pages
 */

// TODO: react query를 사용해서 처음 불러온 뒤로는 해당데이터만 사용하도록 수정
export const getPosts = async () => {
  if (!postsCache) {
    postsCache = fetchPosts()
  }

  return postsCache
}

const fetchPosts = async () => {
  let id = CONFIG.notionConfig.pageId as string
  if (!id) {
    console.error(
      "[@notion] CONFIG.notionConfig.pageId is missing. Nothing to fetch."
    )
    return []
  }
  const api = createNotionApi()

  let response
  try {
    response = normalizeRecordMap(
      await withNotionRetry(`load database ${id}`, () => api.getPage(id))
    )
  } catch (error) {
    console.error(
      `[@notion] Failed to load database ${id}: ${(error as Error).message}`,
      "Check that the Notion page is shared to web or that NOTION_TOKEN is set for notion-client access."
    )
    throw error
  }

  id = parsePageId(id, { uuid: true })
  if (!response.collection || !response.collection_view) {
    console.error(
      `[@notion] Database ${id} loaded without collection data.`,
      "Verify NOTION_PAGE_ID points to the Share to Web database view page and that the page/database is accessible."
    )
    throw new Error(`Notion database ${id} loaded without collection data.`)
  }

  const rawMetadata = getRecordValue(response.block?.[id])
  const collectionId = rawMetadata?.collection_id
  const viewId = rawMetadata?.view_ids?.[0]

  if (collectionId && viewId && !response.collection_query?.[collectionId]) {
    const collectionView = getRecordValue(response.collection_view?.[viewId])

    try {
      const collectionData = await withNotionRetry(
        `query collection ${collectionId}`,
        () => api.getCollectionData(collectionId, viewId, collectionView)
      )
      const reducerResults = (collectionData.result as any)?.reducerResults

      const normalizedCollectionRecordMap = normalizeRecordMap(
        collectionData.recordMap
      )

      response.block = {
        ...response.block,
        ...normalizedCollectionRecordMap.block,
      }
      response.collection = {
        ...response.collection,
        ...normalizedCollectionRecordMap.collection,
      }
      response.collection_view = {
        ...response.collection_view,
        ...normalizedCollectionRecordMap.collection_view,
      }
      response.notion_user = {
        ...response.notion_user,
        ...normalizedCollectionRecordMap.notion_user,
      }
      response.collection_query = {
        ...response.collection_query,
        [collectionId]: {
          ...response.collection_query?.[collectionId],
          [viewId]: reducerResults,
        },
      }
    } catch (error) {
      console.error(
        `[@notion] Failed to query collection ${collectionId}: ${
          (error as Error).message
        }`
      )
      throw error
    }
  }

  if (!response.collection_query) {
    console.error(
      `[@notion] Database ${id} loaded without collection query data.`,
      "Verify NOTION_PAGE_ID points to the Share to Web database view page and that the page/database is accessible."
    )
    throw new Error(`Notion database ${id} loaded without collection query data.`)
  }

  const collectionData = Object.values(response.collection)[0]?.value as any
  const collection = collectionData?.value || collectionData
  const block = response.block
  const schema = collection?.schema

  if (!schema) {
    console.error(
      `[@notion] Database ${id} loaded without a collection schema.`,
      "Verify the Notion database view and its properties are accessible."
    )
    throw new Error(`Notion database ${id} loaded without a collection schema.`)
  }

  // Handle nested value structure (Notion API response change)
  const getBlockValue = (blockData: any) => {
    if (!blockData?.value) return null
    // New structure: block.value.value, Old structure: block.value
    return blockData.value.value || blockData.value
  }

  const databaseMetadata = getBlockValue(block[id])

  // Check Type
  if (
    databaseMetadata?.type !== "collection_view_page" &&
    databaseMetadata?.type !== "collection_view"
  ) {
    console.error(
      "[@notion] The provided pageId is not a database view. Verify the DATABASE ID in CONFIG.notionConfig.pageId."
    )
    throw new Error(`Notion page ${id} is not a database view.`)
  }

  // Construct Data
  const pageIds = getAllPageIds(response)
  const data = []
  for (let i = 0; i < pageIds.length; i++) {
    const id = pageIds[i]
    const properties = (await getPageProperties(id, block, schema)) || null
    if (!properties) continue
    // Add fullwidth, createdtime to properties
    const blockValue = getBlockValue(block[id])
    properties.createdTime = new Date(blockValue?.created_time).toString()
    properties.fullWidth =
      (blockValue?.format as any)?.page_full_width ?? false

    data.push(properties)
  }

  console.info(`[@notion] Loaded ${data.length} entries from database ${id}.`)

  // Sort by date
  data.sort((a: any, b: any) => {
    const dateA: any = new Date(a?.date?.start_date || a.createdTime)
    const dateB: any = new Date(b?.date?.start_date || b.createdTime)
    return dateB - dateA
  })

  const posts = data as TPosts
  return posts
}
