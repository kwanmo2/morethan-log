import { useQuery } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { queryKey } from "src/constants/queryKey"
import useScheme from "src/hooks/useScheme"

/**
 *  Wait for mermaid to be defined in the dom
 *  Additionally, verify that the HTML CollectionOf has an array value.
 */
const useMermaidEffect = () => {
  const memoMermaidRef = useRef<Map<number, string>>(new Map())

  const { data, isFetched } = useQuery({
    queryKey: queryKey.scheme(),
    enabled: false,
  })

  useEffect(() => {
    if (!isFetched) return
    const elements = document.getElementsByClassName("language-mermaid")
    if (elements.length === 0) return

    import("mermaid")
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          theme: (data as "dark" | "light") === "dark" ? "dark" : "default",
        })
        const promises = Array.from(elements)
          .filter((elements) => elements.tagName === "PRE")
          .map(async (element, i) => {
            const cached = memoMermaidRef.current.get(i)
            if (cached !== undefined) {
              const svg = await mermaid
                .render("mermaid" + i, cached || "")
                .then((res) => res.svg)
              element.animate(
                [
                  { easing: "ease-in", opacity: 0 },
                  { easing: "ease-out", opacity: 1 },
                ],
                { duration: 300, fill: "both" }
              )
              element.innerHTML = svg
              return
            }
            const svg = await mermaid
              .render("mermaid" + i, element.textContent || "")
              .then((res) => res.svg)
            memoMermaidRef.current = new Map(memoMermaidRef.current).set(
              i,
              element.textContent ?? ""
            )
            element.innerHTML = svg
          })
        await Promise.all(promises)
      })
      .catch((error) => {
        console.warn(error)
      })
  }, [data, isFetched])

  return
}

export default useMermaidEffect
