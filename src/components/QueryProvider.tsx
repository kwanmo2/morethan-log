"use client"

import { ReactNode, useState } from "react"
import { Hydrate, QueryClientProvider, DehydratedState } from "@tanstack/react-query"
import { createQueryClient } from "src/libs/react-query/createQueryClient"

interface QueryProviderProps {
  children: ReactNode
  dehydratedState?: DehydratedState
}

const QueryProvider = ({ children, dehydratedState }: QueryProviderProps) => {
  const [queryClient] = useState(() => createQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <Hydrate state={dehydratedState}>{children}</Hydrate>
    </QueryClientProvider>
  )
}

export default QueryProvider
