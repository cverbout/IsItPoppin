import { DailyAggregate, RedditPost } from './types'

export function aggregatePostsByDay(posts: RedditPost[]): DailyAggregate[] {
  const dayMap = new Map<
    string,
    {
      posts_count: number
      total_comments: number
      authors: Set<string>
    }
  >()

  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  posts.forEach((post) => {
    const date = dateFormatter.format(new Date(post.created_utc * 1000))
    const existing = dayMap.get(date) ?? {
      posts_count: 0,
      total_comments: 0,
      authors: new Set<string>()
    }

    existing.posts_count += 1
    existing.total_comments += post.num_comments
    existing.authors.add(post.author)
    dayMap.set(date, existing)
  })

  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({
      date,
      posts_count: values.posts_count,
      total_comments: values.total_comments,
      avg_comments_per_post:
        values.posts_count === 0 ? 0 : values.total_comments / values.posts_count,
      unique_posters_count: values.authors.size
    }))
}
