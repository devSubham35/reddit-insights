"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, } from "next/navigation";
import StatCard from "../../../components/StatCard";
import SparklineChart from "../../../components/SparklineChart";
import { GroupResponse, Post, TrendPoint } from "@/typescript/type";

export default function TopicPage() {
  const params = useParams();
  const slug = decodeURIComponent((params.slug as string) || "");
  
  const [group, setGroup] = useState<GroupResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to get data from sessionStorage first
    const storedData = sessionStorage.getItem('trendingTopics');
    
    if (storedData) {
      try {
        const topics = JSON.parse(storedData);
        const foundGroup = topics.find((g: GroupResponse) => {
          const categoryLower = (g.category || "").toLowerCase();
          const slugLower = slug.toLowerCase();
          return categoryLower === slugLower || 
                 categoryLower.includes(slugLower) || 
                 slugLower.includes(categoryLower);
        });
        
        if (foundGroup) {
          setGroup(foundGroup);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error("Error parsing stored data:", e);
      }
    }

    // If no stored data, fetch from API
    fetchTopicData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function fetchTopicData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/trending?query=${encodeURIComponent(slug)}`);
      const data = await res.json();

      if (data.success && data.groupedTopics?.length) {
        // Find matching group or use first one
        const foundGroup = data.groupedTopics.find((g: GroupResponse) => {
          const categoryLower = (g.category || "").toLowerCase();
          const slugLower = slug.toLowerCase();
          return categoryLower === slugLower || 
                 categoryLower.includes(slugLower) || 
                 slugLower.includes(categoryLower);
        }) || data.groupedTopics[0];

        setGroup(foundGroup);
      } else {
        setGroup(null);
      }
    } catch (err) {
      console.error(err);
      setGroup(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-10">
        <Link href="/" className="text-sm text-primary mb-4 inline-block">
          &larr; Back to Dashboard
        </Link>
        <div className="text-center text-neutral-500 mt-8">Loading...</div>
      </div>
    );
  }

  if (!group || !group.posts || group.posts.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-10">
        <Link href="/" className="text-sm text-primary mb-4 inline-block">
          &larr; Back to Dashboard
        </Link>
        <h1 className="text-3xl font-extrabold text-white mb-1">{slug}</h1>
        <div className="text-center text-neutral-500 mt-8">
          No posts found for this topic.
        </div>
      </div>
    );
  }

  // Build 7-day trend graph
  const now = Math.floor(Date.now() / 1000);
  const days = [6, 5, 4, 3, 2, 1, 0];

  const trend: TrendPoint[] = days.map((d) => {
    const start = now - (d + 1) * 24 * 60 * 60;
    const end = now - d * 24 * 60 * 60;

    const count = group.posts.filter(
      (p: Post) => p.createdUtc >= start && p.createdUtc <= end
    ).length;

    return {
      time: d === 0 ? "Today" : `${d}d ago`,
      value: count,
    };
  });

  // Stats
  const mentions = group.posts.length;
  const subredditCount = new Set(group.posts.map((p) => p.subreddit)).size;
  const score = group.posts.reduce(
    (sum, p) => sum + (p.engagementScore || 0),
    0
  );

  // Count mentions per subreddit
  const subredditMentions = group.posts.reduce((acc, p) => {
    acc[p.subreddit] = (acc[p.subreddit] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topSubreddits = Object.entries(subredditMentions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <Link href="/" className="text-sm text-primary mb-4 inline-block">
        &larr; Back to Dashboard
      </Link>

      <h1 className="text-3xl font-extrabold text-white mb-1">
        {group.category || slug}
      </h1>
      <p className="text-sm text-neutral-400 mb-6">
        Keywords: {group.category || slug}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Mentions" value={mentions} />
        <StatCard label="DOD %" value={"0%"} />
        <StatCard label="Subreddit Breadth" value={subredditCount} />
        <StatCard label="Total Score" value={score} />
      </div>

      <SparklineChart data={trend} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Top Examples */}
        <div className="bg-card p-4 rounded-2xl border border-neutral-800">
          <h3 className="text-white font-semibold mb-3">Top Examples</h3>
          <ul className="space-y-3">
            {group.posts.slice(0, 6).map((post: Post) => (
              <li key={post.id} className="bg-neutral-900/20 p-3 rounded-md">
                <Link
                  href={post.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-white block line-clamp-2 hover:text-primary"
                >
                  {post.title}
                </Link>
                <div className="text-xs text-neutral-400 mt-1">
                  r/{post.subreddit} • {post.upvotes} upvotes • {post.comments}{" "}
                  comments
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Top Subreddits */}
        <div className="bg-card p-4 rounded-2xl border border-neutral-800">
          <h3 className="text-white font-semibold mb-3">Top Subreddits Today</h3>
          <ul className="space-y-2">
            {topSubreddits.map(([sub, count], i) => (
              <li
                key={i}
                className="flex items-center justify-between p-2 rounded-md bg-neutral-900/10"
              >
                <div className="text-sm text-primary font-medium">
                  r/{sub}
                </div>
                <div className="text-xs text-neutral-400">
                  {count} mention{count !== 1 ? 's' : ''}
                </div>
              </li>
            ))}

            {topSubreddits.length === 0 && (
              <div className="text-neutral-500">No subreddits</div>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}