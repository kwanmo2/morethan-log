import { Client } from "@notionhq/client"
import { CreatePageParameters } from "@notionhq/client/build/src/api-endpoints"
import { ExtendedRecordMap } from "notion-types"
import { getTextContent } from "notion-utils"

import { TranslationMetadata } from "./aiTranslations"

type NotionBlock = NonNullable<CreatePageParameters["children"]>[number]

const NOTION_TEXT_LIMIT = 1900

const truncateText = (text: string) => {
  if (text.length <= NOTION_TEXT_LIMIT) return text
  return `${text.slice(0, NOTION_TEXT_LIMIT - 1)}…`
}

const extractParagraphTexts = (
  recordMap: ExtendedRecordMap,
  rootId: string
) => {
  const texts: string[] = []

  const visit = (blockId: string) => {
    const block = recordMap.block?.[blockId]?.value as any
    if (!block) return
    const title = block.properties?.title
    if (title) {
      const text = getTextContent(title).trim()
      if (text) texts.push(text)
    }
    const children = block.content as string[] | undefined
    if (Array.isArray(children)) {
      children.forEach((childId) => visit(childId))
    }
  }

  const root = recordMap.block?.[rootId]?.value as any
  if (root?.content) {
    root.content.forEach((blockId: string) => visit(blockId))
  }

  return texts
}

const buildParagraphBlocks = (texts: string[]): NotionBlock[] =>
  texts.map((text) => ({
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [
        {
          type: "text",
          text: { content: truncateText(text) },
        },
      ],
    },
  }))

const buildMetadataBlock = (translation: TranslationMetadata): NotionBlock => ({
  object: "block",
  type: "callout",
  callout: {
    icon: { emoji: "🤖" },
    rich_text: [
      {
        type: "text",
        text: {
          content: `Auto-generated English draft for ${translation.slug} using ${translation.model} at ${translation.generatedAt}. Source page: ${translation.sourcePostId}.`,
        },
      },
    ],
  },
})

const findExistingDraftId = async (
  notion: Client,
  parentPageId: string,
  title: string
) => {
  const search = await notion.search({
    query: title,
    filter: { property: "object", value: "page" },
    sort: { direction: "descending", timestamp: "last_edited_time" },
  })

  const match = search.results.find((result: any) => {
    if (result.object !== "page") return false
    if (result.parent?.page_id !== parentPageId) return false
    const pageTitle = result?.properties?.title?.title?.[0]?.plain_text
    return pageTitle === title
  }) as { id: string } | undefined

  return match?.id ?? null
}

const deleteExistingChildren = async (notion: Client, pageId: string) => {
  const children = await notion.blocks.children.list({ block_id: pageId })
  await Promise.all(
    children.results.map((child: any) =>
      notion.blocks.delete({ block_id: child.id }).catch(() => null)
    )
  )
}

const appendDraftBlocks = async (
  notion: Client,
  pageId: string,
  blocks: NotionBlock[]
) => {
  if (!blocks.length) return
  await notion.blocks.children.append({
    block_id: pageId,
    children: blocks,
  })
}

export const publishTranslationToNotion = async (
  translation: TranslationMetadata
) => {
  const notionToken = process.env.NOTION_TRANSLATION_TOKEN
  const parentPageId = process.env.NOTION_TRANSLATION_PARENT_PAGE_ID

  if (!notionToken || !parentPageId) return

  const notion = new Client({ auth: notionToken })
  const title = `${translation.slug} (English draft)`
  const paragraphs = extractParagraphTexts(
    translation.recordMap,
    translation.sourcePostId
  )

  const blocks = [buildMetadataBlock(translation), ...buildParagraphBlocks(paragraphs)]

  try {
    const existingId = await findExistingDraftId(notion, parentPageId, title)

    if (existingId) {
      await notion.pages.update({
        page_id: existingId,
        properties: { title: { title: [{ text: { content: title } }] } },
      })
      await deleteExistingChildren(notion, existingId)
      await appendDraftBlocks(notion, existingId, blocks)
      console.info(`[ai-translation] Synced draft to Notion page ${existingId}.`)
      return
    }

    const page = await notion.pages.create({
      parent: { page_id: parentPageId },
      properties: { title: { title: [{ text: { content: title } }] } },
      children: blocks,
    })

    console.info(`[ai-translation] Published draft to Notion page ${page.id}.`)
  } catch (error) {
    console.warn(
      `[ai-translation] Failed to sync draft to Notion: ${(error as Error).message}`
    )
  }
}

