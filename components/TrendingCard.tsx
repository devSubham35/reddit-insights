"use client";

import { GroupedTopic, Post } from "@/typescript/type";

interface TrendingCardProps {
  rank: number;
  topic: GroupedTopic,
}

export default function TrendingCard({ topic, rank }: TrendingCardProps) {
  return (
    <div className="bg-card border border-neutral-800 rounded-2xl p-4 shadow-neon hover:shadow-lg transition-all">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-xs text-neutral-400">#{rank} Trending Topic</p>
          <h3 className="text-white font-semibold text-lg line-clamp-2">{topic.category || topic.name || "Topic"}</h3>
          {topic.posts?.length ? (
            <p className="text-xs text-neutral-500 mt-1 line-clamp-1">{topic.posts[0].title}</p>
          ) : null}
        </div>
        <div className="text-right">
          <div className="text-xs text-neutral-400">Mentions</div>
          <div className="text-white font-semibold text-lg">{topic.posts?.length ?? 0}</div>
        </div>
      </div>

      <div className="mt-3 border-t border-neutral-800/50 pt-3 text-sm text-neutral-400">
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="text-xs">Subreddits</div>
            <div className="font-medium text-white">{(new Set((topic.posts || []).map((post:Post)=>post.subreddit))).size}</div>
          </div>
          <div className="flex-1">
            <div className="text-xs">Top Upvotes</div>
            <div className="font-medium text-white">{Math.max(0, ...(topic.posts||[]).map((post:Post)=>post.upvotes||0))}</div>
          </div>
          <div className="flex-1">
            <div className="text-xs">Score</div>
            <div className="font-medium text-white">
              {(topic.posts||[]).reduce((s, post:Post)=>s + (post.engagementScore||0), 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
