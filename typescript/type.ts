export interface RedditDataResponse {
  success: boolean
  query: string
  totalPosts: number
  groupedTopics: GroupedTopic[]
  marketingSummary: string
}

export interface GroupedTopic {
  name: string
  category: string
  posts: Post[]
}

export interface Post {
  id: string
  title: string
  subreddit: string
  author: string
  upvotes: number
  comments: number
  createdUtc: number
  url: string
  thumbnail?: string
  mediaUrl: string
  isVideo: boolean
  nsfw: boolean
  domain: string
  subreddit_subscribers: number
  engagementScore: number
}



export interface TrendingApiResponse {
  groupedTopics: GroupResponse[];
}

export interface TrendPoint {
  time: string;
  value: number;
}

export interface GroupResponse {
  category: string
  posts: Post[]
}

export interface Post {
  id: string
  title: string
  subreddit: string
  author: string
  upvotes: number
  comments: number
  createdUtc: number
  url: string
  thumbnail?: string
  mediaUrl: string
  isVideo: boolean
  nsfw: boolean
  domain: string
  subreddit_subscribers: number
  engagementScore: number
}
