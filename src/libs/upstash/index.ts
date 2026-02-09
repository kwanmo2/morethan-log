const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = process.env

const hasUpstashConfig = Boolean(
  UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN
)

type Command = string[]

type InMemoryRedisValue =
  | string
  | number
  | null
  | InMemoryRedisValue[]

type MemoryEntry = {
  value: string
  expiresAt?: number
}

type MemoryStore = Map<string, MemoryEntry>

declare global {
  // eslint-disable-next-line no-var
  var __IN_MEMORY_REDIS__: MemoryStore | undefined
}

const getMemoryStore = (): MemoryStore => {
  const globalObject = globalThis as { __IN_MEMORY_REDIS__?: MemoryStore }
  if (!globalObject.__IN_MEMORY_REDIS__) {
    globalObject.__IN_MEMORY_REDIS__ = new Map<string, MemoryEntry>()
  }
  return globalObject.__IN_MEMORY_REDIS__
}

const normalizeResult = (input: any): any => {
  if (Array.isArray(input)) {
    return input.map((item) => normalizeResult(item))
  }
  if (input && typeof input === "object" && "result" in input) {
    return normalizeResult((input as any).result)
  }
  return input
}

const executeInMemory = (command: Command): InMemoryRedisValue => {
  const [action, ...args] = command
  const store = getMemoryStore()

  switch (action) {
    case "GET": {
      const entry = store.get(args[0])
      if (!entry) return null
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        store.delete(args[0])
        return null
      }
      return entry.value
    }
    case "SET": {
      const key = args[0]
      const value = args[1]
      store.set(key, { value })
      return "OK"
    }
    case "INCRBY": {
      const key = args[0]
      const increment = Number(args[1])
      const currentEntry = store.get(key)
      const currentValue = currentEntry ? Number(currentEntry.value) : 0
      const nextValue = currentValue + increment
      store.set(key, { value: String(nextValue) })
      return nextValue
    }
    case "EXPIRE": {
      const key = args[0]
      const seconds = Number(args[1])
      const entry = store.get(key)
      if (!entry) return 0
      entry.expiresAt = Date.now() + seconds * 1000
      store.set(key, entry)
      return 1
    }
    case "MGET": {
      return args.map((key) => executeInMemory(["GET", key]))
    }
    default: {
      throw new Error(`Unsupported in-memory redis command: ${action}`)
    }
  }
}

export const runRedisCommand = async (
  command: Command,
): Promise<InMemoryRedisValue> => {
  if (!hasUpstashConfig) {
    return executeInMemory(command)
  }

  const response = await fetch(UPSTASH_REDIS_REST_URL as string, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  })

  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload.error || "Failed to execute redis command")
  }

  return normalizeResult(payload.result)
}

export const runRedisPipeline = async (
  commands: Command[],
): Promise<InMemoryRedisValue> => {
  if (!hasUpstashConfig) {
    return commands.map((command) => executeInMemory(command))
  }

  const pipelineUrl = `${(UPSTASH_REDIS_REST_URL as string).replace(/\/+$/, "")}/pipeline`
  const response = await fetch(pipelineUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  })

  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload.error || "Failed to execute redis pipeline")
  }

  return normalizeResult(payload)
}
