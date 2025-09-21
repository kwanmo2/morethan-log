import dynamic from "next/dynamic"

import type { TPostBase } from "src/types"

type Props = {
  data: Pick<TPostBase, "id" | "slug" | "title">
}

const GoogleComments = dynamic(() => import("./GoogleComments"), {
  ssr: false,
})

const CommentBox: React.FC<Props> = ({ data }) => {
  return (
    <div>
      <GoogleComments data={data} />
    </div>
  )
}

export default CommentBox
