import styled from "@emotion/styled"
import React from "react"
import Link from "next/link"
import useLanguage from "src/hooks/useLanguage"

type Props = {}

const Footer: React.FC<Props> = () => {
  const [language] = useLanguage()
  return (
    <StyledWrapper>
      <Link href={`/${language}`}>← Back</Link>
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        ↑ Top
      </button>
    </StyledWrapper>
  )
}

export default Footer

const StyledWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.gray10};
  a,
  button {
    margin-top: 0.5rem;
    cursor: pointer;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;

    :hover {
      color: ${({ theme }) => theme.colors.gray12};
    }
  }
`
