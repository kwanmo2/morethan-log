import React, { useMemo } from "react"
import PostHeader from "./PostHeader"
import Footer from "./PostFooter"
import CommentBox from "./CommentBox"
import Category from "src/components/Category"
import styled from "@emotion/styled"
import NotionRenderer from "../components/NotionRenderer"
import usePostQuery from "src/hooks/usePostQuery"
import useLanguage from "src/hooks/useLanguage"
import { DEFAULT_LANGUAGE } from "src/constants/language"
import {
  collectPostContents,
  selectContentByLanguage,
} from "src/libs/utils/language"
import { TPostBase } from "src/types"

type Props = {}

const PostDetail: React.FC<Props> = () => {
  const data = usePostQuery()
  const [language] = useLanguage()

  const contents = useMemo(
    () => (data ? collectPostContents(data) : []),
    [data]
  )

  const activeContent = useMemo(
    () =>
      data && contents.length
        ? selectContentByLanguage(contents, language, DEFAULT_LANGUAGE)
        : null,
    [contents, language, data]
  )

  if (!data || !activeContent) return null

  const category =
    (activeContent.category && activeContent.category?.[0]) || undefined

  const commentTarget: TPostBase = {
    ...activeContent,
    id: data.id,
    slug: data.slug,
    status: data.status,
    type: activeContent.type,
    date: activeContent.date ?? data.date,
    createdTime: activeContent.createdTime || data.createdTime,
    fullWidth: activeContent.fullWidth,
  }

  return (
    <StyledWrapper>
      <article>
        {category && (
          <div css={{ marginBottom: "0.5rem" }}>
            <Category readOnly={data.status?.[0] === "PublicOnDetail"}>
              {category}
            </Category>
          </div>
        )}
        {activeContent.type[0] === "Post" && <PostHeader data={activeContent} />}
        <div>
          <NotionRenderer recordMap={activeContent.recordMap} />
        </div>
        {activeContent.type[0] === "Post" && (
          <>
            <Footer />
            <CommentBox data={commentTarget} />
          </>
        )}
      </article>
    </StyledWrapper>
  )
}

export default PostDetail

const StyledWrapper = styled.div`
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  padding-top: 3rem;
  padding-bottom: 3rem;
  border-radius: 1.5rem;
  max-width: 56rem;
  background-color: ${({ theme }) =>
    theme.scheme === "light" ? "white" : theme.colors.gray4};
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  margin: 0 auto;
  > article {
    margin: 0 auto;
    max-width: 42rem;
  }
`
