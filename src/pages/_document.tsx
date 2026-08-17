import Document, { Html, Head, Main, NextScript } from "next/document"
import { CONFIG } from "site.config"

class MyDocument extends Document {
  render() {
    const queryLanguage = this.props.__NEXT_DATA__.query.lang
    const documentLanguage = queryLanguage === "ko" ? "ko" : "en"
    const googleVerification =
      CONFIG.googleSearchConsole.config.siteVerification.replace(
        /^google-site-verification=/,
        ""
      )

    return (
      <Html lang={documentLanguage}>
        <Head>
          <link rel="icon" href="/favicon.ico" />
          <link
            rel="apple-touch-icon"
            sizes="192x192"
            href="/apple-touch-icon.png"
          ></link>
          {/* google search console */}
          {CONFIG.googleSearchConsole.enable === true && (
            <>
              <meta
                name="google-site-verification"
                content={googleVerification}
              />
            </>
          )}
          {/* naver search advisor */}
          {CONFIG.naverSearchAdvisor.enable === true && (
            <>
              <meta
                name="naver-site-verification"
                content={CONFIG.naverSearchAdvisor.config.siteVerification}
              />
            </>
          )}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
