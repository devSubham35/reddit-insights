export interface TrendPoint {
  time: string;
  value: number;
}

export interface Topic {
  id: string;
  title: string;
  subtitle?: string;
  subreddit: string;
  author: string;
  upvotes: number;
  comments: number;
  createdUtc: number;
  url: string;
  thumbnail?: string;
  mediaUrl: string;
  isVideo: boolean;
  nsfw: boolean;
  domain: string;
  subreddit_subscribers: number;
  engagementScore: number;
  mentions: number;
  breadth: number;
  dodChange: number;
  trendData: TrendPoint[];
}

export interface TrendingApiResponse {
  success: boolean;
  query: string;
  totalPosts: number;
  topics: Topic[];
  lastUpdated: string;
}

// Legacy types for backwards compatibility
export interface RedditDataResponse {
  success: boolean;
  query: string;
  totalPosts: number;
  groupedTopics: GroupedTopic[];
  marketingSummary: string;
}

export interface GroupedTopic {
  name: string;
  category: string;
  posts: Post[];
}

export interface Post {
  id: string;
  title: string;
  subreddit: string;
  author: string;
  upvotes: number;
  comments: number;
  createdUtc: number;
  url: string;
  thumbnail?: string;
  mediaUrl: string;
  isVideo: boolean;
  nsfw: boolean;
  domain: string;
  subreddit_subscribers: number;
  engagementScore: number;
}

export interface GroupResponse {
  category: string;
  posts: Post[];
}