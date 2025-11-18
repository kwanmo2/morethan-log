import Link from "next/link"
import styled from "@emotion/styled"
import { formatDate } from "src/libs/utils"
import { buildPostPath } from "src/libs/utils/paths"
import Tag from "src/components/Tag"
import Category from "src/components/Category"
import useLanguage from "src/hooks/useLanguage"
import { TPostBase } from "src/types"
import { CONFIG } from "site.config"

type Props = {
  posts: TPostBase[]
}

const RelatedPosts: React.FC<Props> = ({ posts }) => {
  const [language] = useLanguage()

  return (
    <Section>
      <h3 className="title">Related posts</h3>
      <div className="grid">
        {posts.map((post) => {
          const href = buildPostPath(post, language)
          const category = (post.category && post.category?.[0]) || undefined

          return (
            <ArticleLink href={href} key={post.id}>
              <article>
                {category && (
                  <div className="category">
                    <Category>{category}</Category>
                  </div>
                )}
                <h4 className="headline">{post.title}</h4>
                <p className="date">
                  {formatDate(post?.date?.start_date || post.createdTime, CONFIG.lang)}
                </p>
                {post.summary && <p className="summary">{post.summary}</p>}
                {post.tags && post.tags.length > 0 && (
                  <div className="tags">
                    {post.tags.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                )}
              </article>
            </ArticleLink>
          )
        })}
      </div>
    </Section>
  )
}

export default RelatedPosts

const Section = styled.section`
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid ${({ theme }) => theme.colors.gray4};

  .title {
    margin-bottom: 1.5rem;
    font-size: 1.125rem;
    line-height: 1.75rem;
    font-weight: 600;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: 1rem;
  }
`

const ArticleLink = styled(Link)`
  article {
    height: 100%;
    padding: 1.25rem;
    border-radius: 1rem;
    background-color: ${({ theme }) =>
      theme.scheme === "light" ? "white" : theme.colors.gray4};
    border: 1px solid ${({ theme }) => theme.colors.gray5};
    transition: transform 150ms ease, box-shadow 150ms ease;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    :hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
    }

    .category {
      align-self: flex-start;
    }

    .headline {
      font-size: 1rem;
      line-height: 1.5rem;
      font-weight: 600;
      color: ${({ theme }) => theme.colors.gray12};
      margin: 0.25rem 0;
    }

    .date {
      color: ${({ theme }) => theme.colors.gray10};
      font-size: 0.875rem;
      line-height: 1.25rem;
      margin: 0;
    }

    .summary {
      color: ${({ theme }) => theme.colors.gray11};
      font-size: 0.95rem;
      line-height: 1.5rem;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: auto;
    }
  }
`
