/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RiArrowLeftLine, RiExternalLinkLine } from "react-icons/ri";
import { Topic } from "@/typescript/type";
import DetailChart from "@/components/DetailChart";
import LoadingBlock from "@/components/LoadingBlock";
import Link from "next/link";

export default function TopicDetailPage() {
  const router = useRouter();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [rank, setRank] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Small delay to ensure sessionStorage is ready
    const loadData = () => {
      try {
        const storedTopic = sessionStorage.getItem("selectedTopic");
        const storedRank = sessionStorage.getItem("selectedTopicRank");
        const storedAllTopics = sessionStorage.getItem("trendingTopics");

        console.log("Loading from sessionStorage:", {
          hasTopic: !!storedTopic,
          hasRank: !!storedRank,
          hasAllTopics: !!storedAllTopics
        });

        if (storedTopic) {
          const parsedTopic: Topic = JSON.parse(storedTopic);
          setTopic(parsedTopic);
          setRank(storedRank ? parseInt(storedRank, 10) : 1);

          if (storedAllTopics) {
            setAllTopics(JSON.parse(storedAllTopics));
          }
        }
      } catch (e) {
        console.error("Error loading topic data:", e);
      }
      setLoading(false);
    };

    // Use setTimeout to ensure this runs after navigation is complete
    setTimeout(loadData, 50);
  }, []);

  const handleBackClick = () => {
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1114]">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <LoadingBlock text="Loading topic details..." />
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-[#0f1114] flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-400 mb-4">No topic selected. Please go back to the dashboard and select a topic.</p>
          <button
            onClick={handleBackClick}
            className="text-[#ff4d9d] hover:underline"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Extract keywords from title
  const stopWords = new Set([
    "the", "and", "for", "that", "this", "with", "was", "are", "have", "has",
    "had", "been", "will", "would", "could", "should", "what", "when", "where",
    "which", "who", "whom", "how", "why", "all", "any", "both", "each", "few",
    "more", "most", "other", "some", "such", "than", "too", "very", "just",
    "but", "only", "own", "same", "into", "over", "after", "before", "between",
    "under", "again", "there", "here", "from", "about", "your", "they", "them",
    "their", "its", "our", "out", "not", "also", "you", "can", "while", "today"
  ]);

  const keywords = topic.title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))
    .slice(0, 3)
    .join(", ");

  // Get related posts from the topic itself (these are the actual Reddit posts in this topic)
  const relatedPosts = topic.relatedPosts || [];

  // Count subreddit mentions from related posts
  const subredditCounts: Record<string, number> = {};
  
  // Count from related posts first
  if (relatedPosts.length > 0) {
    relatedPosts.forEach((post: any) => {
      const sub = post.subreddit || "unknown";
      subredditCounts[sub] = (subredditCounts[sub] || 0) + 1;
    });
  } else {
    // Fallback to topic's subreddit
    subredditCounts[topic.subreddit] = topic.mentions || 1;
  }
  
  // Also add from all topics if available
  if (allTopics.length > 0) {
    allTopics.forEach((t) => {
      const sub = t.subreddit || "unknown";
      if (!subredditCounts[sub]) {
        subredditCounts[sub] = 1;
      }
    });
  }
  
  const topSubreddits = Object.entries(subredditCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const dodChange = topic.dodChange ?? 0;
  const isPositive = dodChange >= 0;
  const dodColor = isPositive ? "text-emerald-400" : "text-red-400";
  const dodIcon = isPositive ? "▲" : "▼";
  const dodLabel = dodChange === 0 ? "Stable" : isPositive ? "Rising" : "Falling";

  return (
    <div className="min-h-screen bg-[#0f1114]">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={handleBackClick}
          className="flex items-center gap-2 text-[#ff4d9d] hover:text-[#ff6db3] mb-6 transition-colors"
        >
          <RiArrowLeftLine className="text-lg" />
          <span>Back to Dashboard</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <p className="text-neutral-500 text-sm mb-2">Rank #{rank}</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
            {topic.title}
          </h1>
          <p className="text-neutral-500 text-sm">
            Keywords: {keywords || "trending, reddit, popular"}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1a1d24] border border-neutral-800 rounded-xl p-5 text-center">
            <p className="text-neutral-500 text-xs uppercase tracking-wide mb-2">Mentions</p>
            <p className="text-white text-2xl font-bold">{topic.mentions ?? 0}</p>
          </div>
          <div className="bg-[#1a1d24] border border-neutral-800 rounded-xl p-5 text-center">
            <p className="text-neutral-500 text-xs uppercase tracking-wide mb-2">DoD %</p>
            <p className={`text-2xl font-bold ${dodColor}`}>
              {dodIcon} {Math.abs(dodChange)}%
            </p>
            <p className={`text-xs ${dodColor}`}>{dodLabel}</p>
          </div>
          <div className="bg-[#1a1d24] border border-neutral-800 rounded-xl p-5 text-center">
            <p className="text-neutral-500 text-xs uppercase tracking-wide mb-2">Subreddit Breadth</p>
            <p className="text-white text-2xl font-bold">{topic.breadth ?? 0}</p>
          </div>
          <div className="bg-[#1a1d24] border border-neutral-800 rounded-xl p-5 text-center">
            <p className="text-neutral-500 text-xs uppercase tracking-wide mb-2">Total Score</p>
            <p className="text-white text-2xl font-bold">{(topic.engagementScore ?? 0).toLocaleString()}</p>
          </div>
        </div>

        {/* 7-Day Chart */}
        <div className="bg-[#1a1d24] border border-neutral-800 rounded-xl p-6 mb-6">
          <h2 className="text-neutral-300 font-medium mb-4">7-Day Mention Trend</h2>
          <DetailChart data={topic.trendData || []} />
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Top Examples - Related Reddit posts in this topic */}
          <div className="bg-[#1a1d24] border border-neutral-800 rounded-xl p-5">
            <h3 className="text-neutral-300 font-medium mb-4">Top Examples</h3>
            <div className="flex flex-col gap-3">
              {relatedPosts.length > 0 ? (
                relatedPosts.slice(0, 3).map((post: any, i: number) => (
                  <Link
                    key={`example-${post.id}-${i}`}
                    href={post.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#0f1114] border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition-colors group"
                  >
                    <p className="text-white text-sm font-medium truncate pr-6 mb-1">
                      {post.title}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-neutral-500 text-xs">r/{post.subreddit}</p>
                      <RiExternalLinkLine className="text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                    </div>
                  </Link>
                ))
              ) : (
                <Link
                  href={topic.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#0f1114] border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition-colors group"
                >
                  <p className="text-white text-sm font-medium truncate pr-6 mb-1">
                    {topic.originalTitle || topic.title}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-neutral-500 text-xs">r/{topic.subreddit}</p>
                    <RiExternalLinkLine className="text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                  </div>
                </Link>
              )}
            </div>
          </div>

          {/* Top Subreddits Today */}
          <div className="bg-[#1a1d24] border border-neutral-800 rounded-xl p-5">
            <h3 className="text-neutral-300 font-medium mb-4">Top Subreddits Today</h3>
            <div className="flex flex-col gap-2">
              {topSubreddits.map(([subreddit, count]) => (
                <div
                  key={`sub-${subreddit}`}
                  className="flex items-center justify-between py-2 border-b border-neutral-800/50 last:border-0"
                >
                  <Link
                    href={`https://reddit.com/r/${subreddit}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#ff4d9d] hover:text-[#ff6db3] text-sm transition-colors"
                  >
                    r/{subreddit}
                  </Link>
                  <span className="text-neutral-500 text-xs font-mono">
                    {count} mentions
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-neutral-600 text-sm py-4">
          Powered by Reddit & Gemini
        </div>
      </div>
    </div>
  );
}