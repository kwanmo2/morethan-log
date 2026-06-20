import styled from "@emotion/styled"
import { useRouter } from "next/router"
import React from "react"

type Props = {
  children: string
}

const Tag: React.FC<Props> = ({ children }) => {
  const router = useRouter()

  const handleClick = (value: string) => {
    router.push(`/?tag=${value}`)
  }
  return (
    <StyledWrapper onClick={() => handleClick(children)}>
      {children}
    </StyledWrapper>
  )
}

export default Tag

const StyledWrapper = styled.div`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  border-radius: 50px;
  font-size: 0.75rem;
  line-height: 1rem;
  font-weight: 500;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.gray12};
  background-color: ${({ theme }) => theme.colors.gray3};
  cursor: pointer;
  transition: background-color 0.2s ease;

  :hover {
    background-color: ${({ theme }) => theme.colors.gray4};
  }
`
