/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

// ⏱️ helper to format "time ago"
function timeAgo(utcSeconds: number) {
  if (!utcSeconds) return "";
  const seconds = Math.floor(Date.now() / 1000 - utcSeconds);
  const intervals: [number, string][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.34524, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];

  let count = seconds;
  let unit = "second";
  for (const [limit, name] of intervals) {
    if (count < limit) {
      unit = name;
      break;
    }
    count /= limit;
  }
  const rounded = Math.floor(count);
  return `${rounded} ${unit}${rounded !== 1 ? "s" : ""} ago`;
}

const HomePage = () => {
  const [query, setQuery] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<unknown[]>([]);

  useEffect(() => {
    fetchTrending();
  }, []);

  const fetchTrending = async (searchQuery?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trending${searchQuery ? `?query=${encodeURIComponent(searchQuery)}` : ""}`);
      const data = await res.json();

      if (data.success) {
        setTopics(data.groupedTopics || []);
        setSummary(data.marketingSummary || "");
      } else {
        setTopics([]);
      }
    } catch (err) {
      console.error("Error fetching trending topics:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTrending(query);
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-white flex flex-col items-center px-6 py-10">
      <div className="max-w-6xl w-full">
        {/* 🔍 Search Section */}
        <form
          onSubmit={handleSearch}
          className="flex items-center gap-2 mb-10 bg-neutral-900/70 border border-neutral-800 rounded-2xl p-2 backdrop-blur-md shadow-sm"
        >
          <Input
            type="text"
            placeholder="Search trending topic (e.g. AI, marketing, crypto, Christmas)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-transparent border-none text-white placeholder:text-neutral-500 focus-visible:ring-0"
          />
          <Button
            type="submit"
            disabled={loading}
            className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
          </Button>
        </form>

        {/* 🧠 Summary */}
        {summary && (
          <div className="mb-8 text-sm text-neutral-400 italic text-center">
            <p>{summary}</p>
          </div>
        )}

        {/* ⚡ Loader */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
            <div className="relative w-12 h-12 mb-3">
              <div className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin"></div>
            </div>
            <p className="text-sm">Analyzing trending topics on Reddit...</p>
          </div>
        )}

        {/* 🧩 Trending Categories */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.slice(0, 8).map((group, idx) => (
              <Card
                key={idx}
                className="bg-neutral-800/60 border border-neutral-700/50 rounded-2xl backdrop-blur-lg hover:border-violet-500/50 transition-all shadow-sm"
              >
                <CardHeader>
                  <CardTitle className="text-violet-400 text-lg font-semibold">
                    {group.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {group.posts.slice(0, 2).map((post: any) => (
                      <li key={post.id} className="text-sm leading-snug">
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-violet-300 transition-colors line-clamp-2"
                        >
                          <h1 className="text-white">{post.title}</h1>
                        </a>
                        <div className="text-xs text-neutral-500 mt-1">
                          🔥 {post.upvotes} • 💬 {post.comments} 🕒 {timeAgo(post.createdUtc)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 🫙 Empty State */}
        {!loading && topics.length === 0 && (
          <div className="text-center text-neutral-500 mt-10">
            No trending data found. Try another keyword.
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
