const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const withNotionRetry = async <T>(
  label: string,
  request: () => Promise<T>
) => {
  const delays = [500, 1500, 3000]
  let lastError: unknown

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await request()
    } catch (error) {
      lastError = error
      const message = (error as Error).message

      if (!message.includes("429") || attempt === delays.length) {
        break
      }

      console.warn(
        `[@notion] ${label} hit rate limit. Retrying in ${delays[attempt]}ms.`
      )
      await wait(delays[attempt])
    }
  }

  throw lastError
}
