import { useEffect } from "react"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import styled from "@emotion/styled"
import { AiFillCodeSandboxCircle } from "react-icons/ai"

import { Emoji } from "src/components/Emoji"
import { queryKey } from "src/constants/queryKey"
import { getDateKeyForTimeZone } from "src/libs/utils/date"
import type { VisitorStats } from "src/types/analytics"
import { CONFIG } from "site.config"

const VISITOR_TIMEZONE =
  process.env.NEXT_PUBLIC_VISITOR_TIMEZONE || "Asia/Seoul"
const LAST_VISIT_STORAGE_KEY = "visitor:last-visit"

const fetchVisitorStats = async (): Promise<VisitorStats> => {
  const response = await fetch("/api/visits")
  if (!response.ok) {
    throw new Error("Failed to fetch visitor stats")
  }
  return (await response.json()) as VisitorStats
}

const recordVisit = async (): Promise<VisitorStats | null> => {
  const response = await fetch("/api/visits", { method: "POST" })
  if (!response.ok) {
    return null
  }
  return (await response.json()) as VisitorStats
}

const ServiceCard: React.FC = () => {
  const queryClient = useQueryClient()
  const {
    data: stats,
    isLoading,
    isError,
  } = useQuery(queryKey.visitorStats(), fetchVisitorStats, {
    staleTime: 1000 * 60,
  })

  useEffect(() => {
    if (typeof window === "undefined") return

    const todayKey = getDateKeyForTimeZone(new Date(), VISITOR_TIMEZONE)
    const stored = localStorage.getItem(LAST_VISIT_STORAGE_KEY)

    if (stored === todayKey) return

    recordVisit()
      .then((updated) => {
        if (updated) {
          queryClient.setQueryData(queryKey.visitorStats(), updated)
          localStorage.setItem(LAST_VISIT_STORAGE_KEY, todayKey)
        }
      })
      .catch((error) => {
        console.error("Failed to record visit", error)
      })
  }, [queryClient])

  const projects = CONFIG.projects ?? []
  const hasProjects = projects.length > 0

  return (
    <>
      <StatsWrapper>
        <div className="title">
          <Emoji>👥</Emoji> Visitors
        </div>
        {isLoading && <div className="description">Loading visitor data…</div>}
        {isError && (
          <div className="description error">
            Unable to load visitor statistics right now.
          </div>
        )}
        {!isLoading && !isError && stats && (
          <div className="grid">
            <div>
              <div className="label">Yesterday</div>
              <div className="value">{stats.yesterday.toLocaleString()}</div>
            </div>
            <div>
              <div className="label">Today</div>
              <div className="value">{stats.today.toLocaleString()}</div>
            </div>
            <div>
              <div className="label">Total</div>
              <div className="value">{stats.total.toLocaleString()}</div>
            </div>
          </div>
        )}
      </StatsWrapper>
      {hasProjects && (
        <>
          <StyledTitle>
            <Emoji>🌟</Emoji> Service
          </StyledTitle>
          <StyledWrapper>
            {projects.map((project, idx) => (
              <a
                key={idx}
                href={`${project.href}`}
                rel="noreferrer"
                target="_blank"
              >
                <AiFillCodeSandboxCircle className="icon" />
                <div className="name">{project.name}</div>
              </a>
            ))}
          </StyledWrapper>
        </>
      )}
    </>
  )
}

export default ServiceCard

const StatsWrapper = styled.div`
  padding: 0.75rem;
  margin-bottom: 1.5rem;
  border-radius: 1rem;
  background-color: ${({ theme }) =>
    theme.scheme === "light" ? "white" : theme.colors.gray4};
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);

  .title {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  .description {
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.gray11};
  }

  .description.error {
    color: ${({ theme }) => theme.colors.red10};
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;

    > div {
      padding: 0.5rem;
      border-radius: 0.75rem;
      background-color: ${({ theme }) => theme.colors.gray5};

      .label {
        font-size: 0.75rem;
        color: ${({ theme }) => theme.colors.gray11};
        margin-bottom: 0.25rem;
      }

      .value {
        font-size: 1rem;
        font-weight: 600;
      }
    }
  }
`

const StyledTitle = styled.div`
  padding: 0.25rem;
  margin-bottom: 0.75rem;
`

const StyledWrapper = styled.div`
  display: flex;
  padding: 0.25rem;
  margin-bottom: 2.25rem;
  flex-direction: column;
  border-radius: 1rem;
  background-color: ${({ theme }) =>
    theme.scheme === "light" ? "white" : theme.colors.gray4};
  > a {
    display: flex;
    padding: 0.75rem;
    gap: 0.75rem;
    align-items: center;
    border-radius: 1rem;
    color: ${({ theme }) => theme.colors.gray11};
    cursor: pointer;

    :hover {
      color: ${({ theme }) => theme.colors.gray12};
      background-color: ${({ theme }) => theme.colors.gray5};
    }
    .icon {
      font-size: 1.5rem;
      line-height: 2rem;
    }
    .name {
      font-size: 0.875rem;
      line-height: 1.25rem;
    }
  }
`
