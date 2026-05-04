import { RedditPost } from './types'

export async function fetchSubredditPosts(subreddit: string, maxPosts = 300): Promise<RedditPost[]> {
  const slug = encodeURIComponent(subreddit.trim())
  const posts: RedditPost[] = []
  let after: string | null = null
  const limit = 100
  const maxPages = Math.ceil(maxPosts / limit)

  for (let page = 0; page < maxPages; page += 1) {
    const url = `https://www.reddit.com/r/${slug}/new.json?limit=${limit}${after ? `&after=${after}` : ''}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const children = data?.data?.children

    if (!Array.isArray(children) || children.length === 0) {
      break
    }

    const pagePosts = children
      .map((child: any) => child?.data)
      .filter((post: any) => post && typeof post.id === 'string' && typeof post.created_utc !== 'undefined')
      .map((post: any) => ({
        id: String(post.id),
        title: String(post.title ?? ''),
        created_utc: Number(post.created_utc),
        num_comments: Number(post.num_comments ?? 0),
        score: Number(post.score ?? 0),
        author: String(post.author ?? '[deleted]')
      }))

    posts.push(...pagePosts)
    after = data?.data?.after ?? null

    if (!after) {
      break
    }
  }

  return posts.slice(0, maxPosts)
}
