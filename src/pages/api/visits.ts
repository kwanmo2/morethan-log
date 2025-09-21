import type { NextApiRequest, NextApiResponse } from "next"

import { runRedisCommand, runRedisPipeline } from "src/libs/upstash"
import { getDateKeyForTimeZone, getOffsetDateKey } from "src/libs/utils/date"
import type { VisitorStats } from "src/types/analytics"

const DEFAULT_TIME_ZONE = process.env.VISITOR_TIMEZONE || "Asia/Seoul"
const TOTAL_KEY = "visitors:total"

const getDailyKey = (dateKey: string) => `visitors:daily:${dateKey}`

const buildStats = (values: (string | number | null)[]): VisitorStats => {
  const [totalRaw, todayRaw, yesterdayRaw] = values
  return {
    total: Number(totalRaw ?? 0),
    today: Number(todayRaw ?? 0),
    yesterday: Number(yesterdayRaw ?? 0),
  }
}

const readStats = async () => {
  const now = new Date()
  const todayKey = getDateKeyForTimeZone(now, DEFAULT_TIME_ZONE)
  const yesterdayKey = getOffsetDateKey(-1, DEFAULT_TIME_ZONE, now)

  const result = (await runRedisCommand([
    "MGET",
    TOTAL_KEY,
    getDailyKey(todayKey),
    getDailyKey(yesterdayKey),
  ])) as (string | null)[]

  return buildStats(result)
}

const recordVisit = async () => {
  const now = new Date()
  const todayKey = getDateKeyForTimeZone(now, DEFAULT_TIME_ZONE)
  const yesterdayKey = getOffsetDateKey(-1, DEFAULT_TIME_ZONE, now)
  const dailyKey = getDailyKey(todayKey)

  const [totalResult, todayResult] = (await runRedisPipeline([
    ["INCRBY", TOTAL_KEY, "1"],
    ["INCRBY", dailyKey, "1"],
    ["EXPIRE", dailyKey, String(60 * 60 * 24 * 60)],
  ])) as (number | string)[]

  const yesterdayValue = (await runRedisCommand([
    "GET",
    getDailyKey(yesterdayKey),
  ])) as string | null

  return buildStats([
    totalResult,
    todayResult,
    yesterdayValue,
  ])
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VisitorStats | { message: string }>
) {
  try {
    if (req.method === "GET") {
      const stats = await readStats()
      return res.status(200).json(stats)
    }

    if (req.method === "POST") {
      const stats = await recordVisit()
      return res.status(200).json(stats)
    }

    res.setHeader("Allow", "GET,POST")
    return res.status(405).json({ message: "Method Not Allowed" })
  } catch (error) {
    console.error("Failed to handle visitor stats", error)
    return res.status(500).json({ message: "Failed to process visitor stats" })
  }
}
