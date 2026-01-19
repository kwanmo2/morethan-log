import React, { useEffect, useState } from "react"
import styled from "@emotion/styled"
import Image from "next/image"
import Link from "next/link"
import { TOgMetadata } from "src/libs/server/fetchOgMetadata"

type Props = {
  url: string
}

type State = {
  metadata: TOgMetadata | null
  loading: boolean
  error: boolean
}

const useOgMetadata = (url: string) => {
  const [state, setState] = useState<State>({
    metadata: null,
    loading: true,
    error: false,
  })

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch(
          `/api/og-metadata?url=${encodeURIComponent(url)}`
        )
        const data = await res.json()
        if (data.data) {
          setState({ metadata: data.data, loading: false, error: false })
        } else {
          setState({ metadata: null, loading: false, error: true })
        }
      } catch {
        setState({ metadata: null, loading: false, error: true })
      }
    }

    fetchMetadata()
  }, [url])

  return state
}

const LinkCard: React.FC<Props> = ({ url }) => {
  const { metadata, loading, error } = useOgMetadata(url)

  if (loading) {
    return (
      <StyledLoadingCard href={url} target="_blank" rel="noopener noreferrer">
        Loading...
      </StyledLoadingCard>
    )
  }

  if (error || !metadata) {
    return (
      <StyledFallbackCard href={url} target="_blank" rel="noopener noreferrer">
        {url}
      </StyledFallbackCard>
    )
  }

  const displayUrl = new URL(url).hostname

  return (
    <StyledCard href={url} target="_blank" rel="noopener noreferrer">
      <StyledImageWrapper>
        {metadata.image ? (
          <Image
            src={metadata.image}
            alt={metadata.title || "Link preview"}
            fill
            style={{ objectFit: "cover" }}
          />
        ) : (
          <StyledPlaceholder />
        )}
      </StyledImageWrapper>
      <StyledContent>
        {metadata.favicon && (
          <StyledFavicon src={metadata.favicon} alt="" width={16} height={16} />
        )}
        <StyledDomain>{displayUrl}</StyledDomain>
        {metadata.title && <StyledTitle>{metadata.title}</StyledTitle>}
        {metadata.description && (
          <StyledDescription>{metadata.description}</StyledDescription>
        )}
      </StyledContent>
    </StyledCard>
  )
}

export default LinkCard

const StyledCard = styled(Link)`
  display: flex;
  border: 1px solid ${({ theme }) => theme.colors.gray4};
  border-radius: 8px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.gray6};
  }
`

const StyledLoadingCard = styled(Link)`
  display: block;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.gray4};
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.gray8};
  font-size: 14px;
  text-decoration: none;
`

const StyledFallbackCard = styled(Link)`
  display: block;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.gray4};
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.gray8};
  font-size: 14px;
  text-decoration: none;
  word-break: break-all;
`

const StyledImageWrapper = styled.div`
  position: relative;
  width: 180px;
  min-width: 180px;
  height: 120px;
  background-color: ${({ theme }) => theme.colors.gray3};

  @media (max-width: 640px) {
    width: 100%;
    height: 160px;
  }
`

const StyledPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.gray3};
`

const StyledContent = styled.div`
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  min-width: 0;
`

const StyledFavicon = styled(Image)`
  width: 16px;
  height: 16px;
  object-fit: contain;
`

const StyledDomain = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.gray7};
`

const StyledTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.gray10};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
`

const StyledDescription = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.gray8};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
`
