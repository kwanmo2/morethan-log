import React from "react"
import styled from "@emotion/styled"
import NotionRenderer from "../components/NotionRenderer"
import usePostQuery from "src/hooks/usePostQuery"
type Props = {}

const PageDetail: React.FC<Props> = () => {
  const data = usePostQuery()

  if (!data) return null
  return (
    <StyledWrapper>
      <h1>{data.title}</h1>
      <NotionRenderer recordMap={data.recordMap} />
    </StyledWrapper>
  )
}

export default PageDetail

const StyledWrapper = styled.div`
  margin: 0 auto;
  max-width: 56rem;

  > h1 {
    margin-bottom: 2rem;
    font-size: 1.875rem;
    line-height: 2.25rem;
    font-weight: 700;
  }
`
