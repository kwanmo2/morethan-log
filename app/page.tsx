import Feed from "src/routes/Feed"
import RootLayout from "src/layouts/RootLayout"
import QueryProvider from "src/components/QueryProvider"
import { prefetchFeed } from "src/libs/server/prefetch"

const HomePage = async () => {
  const { dehydratedState } = await prefetchFeed()

  return (
    <QueryProvider dehydratedState={dehydratedState}>
      <RootLayout>
        <Feed />
      </RootLayout>
    </QueryProvider>
  )
}

export default HomePage
