import { ExtendedRecordMap } from "notion-types"

const normalizeRecordTable = <T extends Record<string, any>>(table?: T) => {
  if (!table) return table

  return Object.fromEntries(
    Object.entries(table).map(([id, record]) => [
      id,
      record?.value?.value
        ? {
            ...record,
            value: record.value.value,
          }
        : record,
    ])
  ) as T
}

export const normalizeRecordMap = (recordMap: Partial<ExtendedRecordMap>) => {
  return {
    ...recordMap,
    block: normalizeRecordTable(recordMap.block),
    collection: normalizeRecordTable(recordMap.collection),
    collection_view: normalizeRecordTable(recordMap.collection_view),
    notion_user: normalizeRecordTable(recordMap.notion_user),
  } as ExtendedRecordMap
}
