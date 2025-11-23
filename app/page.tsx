"use client";

import { RiRefreshLine } from "react-icons/ri";
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
    setFilter("all");
    fetchTrending();
  }

  function handleTopicClick(topic: Topic, rank: number) {
    // Store the selected topic and rank before navigating
    sessionStorage.setItem("selectedTopic", JSON.stringify(topic));
    sessionStorage.setItem("selectedTopicRank", String(rank));
    router.push(`/topic/${topic.id}`);
  }

  // Filter topics based on filter type only
  const filteredTopics = topics.filter((topic) => {
    const dodChange = topic.dodChange ?? 0;

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

        {/* Search Form with Filters */}
        <div className="mb-6 flex items-center gap-2 w-full h-12">
          {/* Search Form */}
          <form
            onSubmit={onSubmit}
            className="flex items-center gap-2 w-full h-full"
          >
            <input
              className="w-full bg-[#1a1d24] border border-neutral-800 rounded-xl outline-none text-white placeholder:text-neutral-500 px-4 h-full"
              placeholder="Search topics..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <Button
              disabled={loading}
              className="px-6 rounded-xl bg-[#ff4d9d] hover:bg-[#ff3385] text-white font-semibold h-[90%]"
            >
              {loading ? "Searching..." : "Search"}
            </Button>
          </form>

          {/* Filter Buttons */}
          <div className="flex items-center gap-2 h-[90%]">
            {(["all", "rising", "falling"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`h-full px-6 rounded-lg text-sm font-medium flex items-center transition-all ${filter === f
                    ? "bg-[#ff4d9d] text-white"
                    : "bg-[#1a1d24] text-neutral-400 hover:text-white hover:bg-[#252830]"
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