import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import styled from "@emotion/styled"

import { queryKey } from "src/constants/queryKey"
import type { StoredComment } from "src/types/comment"
import type { TPostBase } from "src/types"
import useScheme from "src/hooks/useScheme"

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
const DISPLAY_TIME_ZONE =
  process.env.NEXT_PUBLIC_VISITOR_TIMEZONE || "Asia/Seoul"

let googleClientInitialized = false

interface GoogleCredentialPayload {
  sub: string
  name?: string
  email?: string
  picture?: string
}

type GoogleUser = {
  id: string
  name: string
  email?: string
  picture?: string
  credential: string
}

type CredentialResponse = {
  credential: string
}

type RenderButtonOptions = {
  theme?: "outline" | "filled_blue" | "filled_black"
  size?: "small" | "medium" | "large"
  text?: "signin_with" | "signup_with" | "continue_with" | "signin"
  shape?: "rectangular" | "pill" | "circle" | "square"
  width?: string
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string
            callback: (response: CredentialResponse) => void
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: RenderButtonOptions
          ) => void
          prompt: () => void
          disableAutoSelect: () => void
        }
      }
    }
  }
}

const decodeCredential = (credential: string): GoogleCredentialPayload => {
  const payload = credential.split(".")[1]
  if (!payload) throw new Error("Invalid credential token")

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/")
  const decoded = atob(normalized)
  const json = decodeURIComponent(
    decoded
      .split("")
      .map((char) => `%${("00" + char.charCodeAt(0).toString(16)).slice(-2)}`)
      .join("")
  )
  return JSON.parse(json) as GoogleCredentialPayload
}

const fetchComments = async (slug: string) => {
  const response = await fetch(`/api/comments?slug=${encodeURIComponent(slug)}`)
  if (!response.ok) {
    throw new Error("Failed to fetch comments")
  }

  const payload = (await response.json()) as { comments: StoredComment[] }
  return Array.isArray(payload.comments) ? payload.comments : []
}

const initializeGoogleSdk = (
  callback: (response: CredentialResponse) => void,
  onReady: () => void
) => {
  if (typeof window === "undefined" || !GOOGLE_CLIENT_ID) return

  const initClient = () => {
    if (!window.google?.accounts?.id) return
    if (!googleClientInitialized) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback,
      })
      googleClientInitialized = true
    }
    onReady()
  }

  const existingScript = document.getElementById(
    "google-identity-services"
  ) as HTMLScriptElement | null

  if (existingScript) {
    if (existingScript.dataset.loaded === "true") {
      initClient()
    } else {
      const handleLoad = () => {
        existingScript.dataset.loaded = "true"
        initClient()
      }
      existingScript.addEventListener("load", handleLoad, { once: true })
    }
    return
  }

  const script = document.createElement("script")
  script.id = "google-identity-services"
  script.src = "https://accounts.google.com/gsi/client"
  script.async = true
  script.defer = true
  script.onload = () => {
    script.dataset.loaded = "true"
    initClient()
  }
  document.body.appendChild(script)
}

const GoogleComments: React.FC<{ data: Pick<TPostBase, "id" | "slug" | "title"> }> = ({
  data,
}) => {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [comment, setComment] = useState("")
  const [sdkReady, setSdkReady] = useState(false)
  const buttonRef = useRef<HTMLDivElement | null>(null)
  const [scheme] = useScheme()

  const {
    data: comments = [],
    isLoading,
    isError,
  } = useQuery<StoredComment[]>(
    queryKey.comments(data.slug),
    () => fetchComments(data.slug),
    {
      initialData: [],
      staleTime: 30 * 1000,
    }
  )

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return

    initializeGoogleSdk((response) => {
      try {
        const payload = decodeCredential(response.credential)
        setUser({
          id: payload.sub,
          name: payload.name || payload.email || "Anonymous",
          email: payload.email,
          picture: payload.picture,
          credential: response.credential,
        })
      } catch (error) {
        console.error("Failed to decode Google credential", error)
      }
    }, () => setSdkReady(true))
  }, [])

  useEffect(() => {
    if (!sdkReady || user || !buttonRef.current) return
    if (!window.google?.accounts?.id) return

    const theme: RenderButtonOptions["theme"] =
      scheme === "dark" ? "filled_black" : "outline"

    buttonRef.current.innerHTML = ""
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme,
      size: "large",
      text: "signin_with",
      width: "100%",
    })
  }, [sdkReady, user, scheme])

  const mutation = useMutation<StoredComment, Error, string>(
    async (content) => {
      if (!user) throw new Error("Google 인증 후 댓글을 남길 수 있어요.")

      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.credential}`,
        },
        body: JSON.stringify({
          postId: data.id,
          postSlug: data.slug,
          postTitle: data.title,
          content,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload) {
        const message =
          (payload && typeof payload === "object" && "message" in payload
            ? (payload as { message?: string }).message
            : undefined) || "댓글 등록에 실패했어요."
        throw new Error(message)
      }

      return payload as StoredComment
    },
    {
      onSuccess: (created) => {
        queryClient.setQueryData<StoredComment[]>(
          queryKey.comments(data.slug),
          (prev = []) => [...prev, created]
        )
        setComment("")
      },
    }
  )

  const sortedComments = useMemo(
    () =>
      [...comments].sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [comments]
  )

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = comment.trim()
    if (!value) return
    mutation.mutate(value)
  }

  const handleSignOut = () => {
    window.google?.accounts?.id?.disableAutoSelect?.()
    setUser(null)
  }

  const submissionError =
    mutation.error instanceof Error ? mutation.error.message : null

  const formatDate = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    return date.toLocaleString("ko-KR", { timeZone: DISPLAY_TIME_ZONE })
  }

  return (
    <Wrapper>
      <header>
        <h3>Comments</h3>
        {user ? (
          <div className="profile">
            {user.picture && (
              <Image
                src={user.picture}
                alt={user.name}
                width={32}
                height={32}
                style={{ borderRadius: "9999px", objectFit: "cover" }}
              />
            )}
            <span>{user.name}</span>
            <button type="button" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        ) : GOOGLE_CLIENT_ID ? (
          <div className="signin" ref={buttonRef} />
        ) : (
          <div className="notice">
            Google 로그인 클라이언트 ID가 설정되어 있지 않아요.
          </div>
        )}
      </header>

      <Form onSubmit={handleSubmit}>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder={
            user
              ? "따뜻한 댓글을 남겨주세요."
              : "Google 로그인 후 댓글을 남길 수 있어요."
          }
          disabled={!user || mutation.isLoading}
          rows={4}
        />
        <div className="actions">
          <button
            type="submit"
            disabled={!user || mutation.isLoading || !comment.trim()}
          >
            {mutation.isLoading ? "Posting…" : "Post comment"}
          </button>
        </div>
        {submissionError && <p className="error">{submissionError}</p>}
      </Form>

      <section>
        {isLoading && <p className="info">Loading comments…</p>}
        {isError && (
          <p className="error">댓글을 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>
        )}
        {!isLoading && !isError && sortedComments.length === 0 && (
          <p className="info">아직 댓글이 없어요. 첫 댓글을 남겨보세요!</p>
        )}
        <ul>
          {sortedComments.map((item) => (
            <li key={item.id}>
              <div className="meta">
                {item.author.picture && (
                  <Image
                    src={item.author.picture}
                    alt={item.author.name}
                    width={36}
                    height={36}
                    style={{ borderRadius: "9999px", objectFit: "cover" }}
                  />
                )}
                <div>
                  <div className="name">{item.author.name}</div>
                  <div className="date">{formatDate(item.createdAt)}</div>
                </div>
              </div>
              <p className="content">{item.content}</p>
            </li>
          ))}
        </ul>
      </section>
    </Wrapper>
  )
}

export default GoogleComments

const Wrapper = styled.div`
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${({ theme }) => theme.colors.gray6};
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  header {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    h3 {
      font-size: 1.125rem;
      font-weight: 600;
    }

    .profile {
      display: flex;
      align-items: center;
      gap: 0.75rem;

      span {
        font-weight: 500;
      }

      button {
        margin-left: auto;
        background: transparent;
        border: none;
        color: ${({ theme }) => theme.colors.gray11};
        cursor: pointer;
        font-size: 0.875rem;

        :hover {
          color: ${({ theme }) => theme.colors.gray12};
        }
      }
    }

    .notice {
      font-size: 0.875rem;
      color: ${({ theme }) => theme.colors.red10};
    }
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 1rem;

    .info {
      font-size: 0.875rem;
      color: ${({ theme }) => theme.colors.gray11};
    }

    .error {
      font-size: 0.875rem;
      color: ${({ theme }) => theme.colors.red10};
    }

    ul {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      list-style: none;
      padding: 0;
      margin: 0;

      li {
        padding: 1rem;
        border-radius: 1rem;
        background-color: ${({ theme }) =>
          theme.scheme === "light" ? theme.colors.gray3 : theme.colors.gray5};

        .meta {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          margin-bottom: 0.75rem;

          .name {
            font-weight: 600;
          }

          .date {
            font-size: 0.75rem;
            color: ${({ theme }) => theme.colors.gray11};
          }
        }

        .content {
          line-height: 1.6;
          white-space: pre-wrap;
        }
      }
    }
  }
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  textarea {
    width: 100%;
    padding: 0.75rem;
    border-radius: 1rem;
    border: 1px solid ${({ theme }) => theme.colors.gray6};
    resize: vertical;
    font-size: 0.95rem;
    min-height: 120px;
    background-color: ${({ theme }) =>
      theme.scheme === "light" ? "white" : theme.colors.gray4};

    :disabled {
      background-color: ${({ theme }) => theme.colors.gray5};
      cursor: not-allowed;
    }
  }

  .actions {
    display: flex;
    justify-content: flex-end;

    button {
      padding: 0.5rem 1.25rem;
      border-radius: 9999px;
      border: none;
      background-color: ${({ theme }) => theme.colors.gray12};
      color: white;
      cursor: pointer;
      font-weight: 500;

      :disabled {
        background-color: ${({ theme }) => theme.colors.gray7};
        cursor: not-allowed;
      }
    }
  }

  .error {
    font-size: 0.875rem;
    color: ${({ theme }) => theme.colors.red10};
  }
`
