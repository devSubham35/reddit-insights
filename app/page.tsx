"use client";

import { RiRefreshLine, RiSearchLine } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { Topic } from "@/typescript/type";
import React, { useEffect, useState } from "react";
import TopicRow from "../components/TopicRow";
import LoadingBlock from "../components/LoadingBlock";
import { useRouter } from "next/navigation";

type FilterType = "all" | "rising" | "falling";

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    const storedTopics = sessionStorage.getItem("trendingTopics");
    const storedTime = sessionStorage.getItem("trendingLastUpdated");

    if (storedTopics) {
      try {
        setTopics(JSON.parse(storedTopics));
        setLastUpdated(storedTime || "");
        return;
      } catch (e) {
        console.error("Error parsing stored data:", e);
      }
    }
    fetchTrending();
  }, []);

  async function fetchTrending(q?: string) {
    setLoading(true);
    try {
      const path = "/api/trending" + (q ? `?query=${encodeURIComponent(q)}` : "");
      const res = await fetch(path);
      const data = await res.json();

      if (data.success) {
        const fetchedTopics = data.topics || [];
        setTopics(fetchedTopics);
        setLastUpdated(data.lastUpdated || new Date().toISOString());

        sessionStorage.setItem("trendingTopics", JSON.stringify(fetchedTopics));
        sessionStorage.setItem("trendingLastUpdated", data.lastUpdated || "");
      } else {
        setTopics([]);
        setLastUpdated("");
        sessionStorage.removeItem("trendingTopics");
        sessionStorage.removeItem("trendingLastUpdated");
      }
    } catch (err) {
      console.error(err);
      setTopics([]);
      setLastUpdated("");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchTrending(query);
  }

  function handleRefresh() {
    sessionStorage.removeItem("trendingTopics");
    sessionStorage.removeItem("trendingLastUpdated");
    setQuery("");
    setSearchFilter("");
    fetchTrending();
  }

  function handleTopicClick(topic: Topic, rank: number) {
    // Store the selected topic and rank before navigating
    sessionStorage.setItem("selectedTopic", JSON.stringify(topic));
    sessionStorage.setItem("selectedTopicRank", String(rank));
    router.push(`/topic/${topic.id}`);
  }

  // Filter topics based on filter type and search
  const filteredTopics = topics.filter((topic) => {
    const title = topic.title || "";
    const subreddit = topic.subreddit || "";
    const dodChange = topic.dodChange ?? 0;

    const matchesSearch =
      searchFilter === "" ||
      title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      subreddit.toLowerCase().includes(searchFilter.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === "rising") return dodChange > 0;
    if (filter === "falling") return dodChange < 0;
    return true;
  });

  const formatDate = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="min-h-screen bg-[#0f1114]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-white italic">Reddit Topic </span>
            <span className="text-[#ff4d9d]">Radar</span>
          </h1>
          {lastUpdated && (
            <p className="text-neutral-500 text-sm">
              Last updated: {formatDate(lastUpdated)}
            </p>
          )}
          <Button
            onClick={handleRefresh}
            disabled={loading}
            className="mt-4 bg-[#ff4d9d] hover:bg-[#ff3385] text-white font-medium px-6 py-2 rounded-full"
          >
            <RiRefreshLine className={`mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh Topics
          </Button>
        </div>

        {/* Search Form for API query */}
        <form onSubmit={onSubmit} className="flex items-center gap-2 mb-6">
          <input
            className="flex-1 bg-[#1a1d24] border border-neutral-800 rounded-xl outline-none text-white placeholder:text-neutral-500 px-4 py-3"
            placeholder="Search Reddit (AI, crypto, gaming...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-[#ff4d9d] hover:bg-[#ff3385] text-white font-semibold"
          >
            {loading ? "Searching..." : "Search"}
          </Button>
        </form>

        {/* Filter Bar */}
        <div className="flex items-center gap-4 mb-6 bg-[#1a1d24] border border-neutral-800 rounded-xl p-3">
          <div className="flex-1 flex items-center gap-2 bg-[#0f1114] rounded-lg px-3 py-2">
            <RiSearchLine className="text-neutral-500" />
            <input
              className="flex-1 bg-transparent outline-none text-white placeholder:text-neutral-500 text-sm"
              placeholder="Search topics..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {(["all", "rising", "falling"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === f
                    ? "bg-[#2a8a8a] text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Topics List */}
        {loading ? (
          <LoadingBlock text="Analyzing trending topics on Reddit..." />
        ) : (
          <div className="flex flex-col gap-3">
            {filteredTopics.length ? (
              filteredTopics.map((topic, i) => (
                <div
                  key={topic.id}
                  onClick={() => handleTopicClick(topic, i + 1)}
                  className="cursor-pointer"
                >
                  <TopicRow topic={topic} rank={i + 1} />
                </div>
              ))
            ) : (
              <div className="text-center text-neutral-500 py-16">
                No trending topics found. Try another search.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}