const GOOGLE_TOKEN_INFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo"

export type GoogleTokenInfo = {
  aud: string
  sub: string
  email?: string
  email_verified?: string
  name?: string
  picture?: string
  exp?: string
  iat?: string
}

export const verifyGoogleIdToken = async (token: string) => {
  if (!token) {
    throw new Error("Missing Google ID token")
  }

  const url = `${GOOGLE_TOKEN_INFO_ENDPOINT}?id_token=${encodeURIComponent(token)}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error("Failed to verify Google token")
  }

  const payload = (await response.json()) as GoogleTokenInfo

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  if (clientId && payload.aud !== clientId) {
    throw new Error("Token audience mismatch")
  }

  return payload
}
