const DEFAULT_TIME_ZONE = "Asia/Seoul"

export const getDateKeyForTimeZone = (
  date: Date,
  timeZone: string = DEFAULT_TIME_ZONE
) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

export const getTodayKey = (timeZone: string = DEFAULT_TIME_ZONE) => {
  return getDateKeyForTimeZone(new Date(), timeZone)
}

export const getOffsetDateKey = (
  offsetDays: number,
  timeZone: string = DEFAULT_TIME_ZONE,
  baseDate: Date = new Date()
) => {
  const base = new Date(baseDate.getTime())
  base.setUTCDate(base.getUTCDate() + offsetDays)
  return getDateKeyForTimeZone(base, timeZone)
}
