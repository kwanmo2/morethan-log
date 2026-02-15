import { CONFIG } from "../../site.config"
import { NextPageWithLayout } from "../types"
import CustomError from "../routes/Error"
import MetaConfig from "src/components/MetaConfig"

const NotFoundPage: NextPageWithLayout = () => {
  return <CustomError />
}

NotFoundPage.getLayout = (page) => {
  return (
    <>
      <MetaConfig
        {...{
          title: CONFIG.blog.title,
          description: CONFIG.blog.description,
          type: "Page",
          url: CONFIG.link,
          noindex: true,
        }}
      />
      {page}
    </>
  )
}

export default NotFoundPage
