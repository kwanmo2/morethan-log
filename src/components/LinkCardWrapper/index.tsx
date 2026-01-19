import React, { useEffect, useRef, useState } from "react"
import styled from "@emotion/styled"
import dynamic from "next/dynamic"

const LinkCard = dynamic(
  () => import("src/components/LinkCard").then((m) => m.default),
  {
    ssr: false,
  }
)

type Props = {
  children: React.ReactNode
}

const LinkCardWrapper: React.FC<Props> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [processed, setProcessed] = useState(false)

  useEffect(() => {
    if (!containerRef.current || processed) return

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement
              const links = element.querySelectorAll("a")

              links.forEach((link) => {
                const href = link.getAttribute("href")
                if (!href) return

                try {
                  const currentUrl = window.location.origin
                  const urlObj = new URL(href, currentUrl)
                  const isExternal = urlObj.origin !== currentUrl

                  if (isExternal) {
                    const linkCard = document.createElement("div")
                    linkCard.setAttribute("data-linkcard-url", href)

                    link.parentNode?.insertBefore(linkCard, link)
                    link.style.display = "none"
                  }
                } catch {
                  // Invalid URL, skip
                }
              })
            }
          })
        }
      })
    })

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
    })

    setProcessed(true)

    return () => observer.disconnect()
  }, [processed])

  return (
    <StyledWrapper ref={containerRef}>
      {children}
      <LinkCardContainer containerRef={containerRef} />
    </StyledWrapper>
  )
}

const LinkCardContainer: React.FC<{
  containerRef: React.RefObject<HTMLDivElement>
}> = ({ containerRef }) => {
  const [linkCards, setLinkCards] = useState<{ id: string; url: string }[]>([])

  useEffect(() => {
    if (!containerRef.current) return

    const observer = new MutationObserver(() => {
      const elements = containerRef.current?.querySelectorAll(
        "[data-linkcard-url]"
      )
      const newLinkCards: { id: string; url: string }[] = []

      elements?.forEach((el) => {
        const url = el.getAttribute("data-linkcard-url")
        if (url && !newLinkCards.some((card) => card.url === url)) {
          newLinkCards.push({
            id: `linkcard-${Math.random().toString(36).substr(2, 9)}`,
            url,
          })
        }
      })

      setLinkCards(newLinkCards)
    })

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [containerRef])

  return (
    <>
      {linkCards.map((card) => (
        <div key={card.id} style={{ margin: "12px 0" }}>
          <LinkCard url={card.url} />
        </div>
      ))}
    </>
  )
}

export default LinkCardWrapper

const StyledWrapper = styled.div`
  width: 100%;
`
