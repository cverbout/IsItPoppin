export interface RedditPost {
  id: string
  title: string
  created_utc: number
  num_comments: number
  score: number
  author: string
}

export interface DailyAggregate {
  date: string
  posts_count: number
  total_comments: number
  avg_comments_per_post: number
  unique_posters_count: number
}
