"use client";

import { RiRefreshLine } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { GroupedTopic } from "@/typescript/type";
import React, { useEffect, useState } from "react";
import TrendingCard from "../components/TrendingCard";
import LoadingBlock from "../components/LoadingBlock";


export default function HomePage() {

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [topics, setTopics] = useState<GroupedTopic[]>([]);

  useEffect(() => {
    fetchTrending();
  }, []);

  async function fetchTrending(q?: string) {
    setLoading(true);
    try {
      const path = "/api/trending" + (q ? `?query=${encodeURIComponent(q)}` : "");
      const res = await fetch(path);
      const data = await res.json();

      if (data.success) {
        setTopics(data.groupedTopics || []);
        setSummary(data.marketingSummary || "");
      } else {
        setTopics([]);
        setSummary("");
      }
    } catch (err) {
      console.error(err);
      setTopics([]);
      setSummary("");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchTrending(query);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <form onSubmit={onSubmit} className="flex items-center gap-2 mb-8 bg-neutral-900/50 border border-neutral-800 rounded-3xl p-3">
        <input
          className="flex-1 bg-transparent outline-none text-white placeholder:text-neutral-500 px-3 py-2"
          placeholder="Search trending topic (AI, crypto, christmas...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button
          disabled={loading}
          style={{ borderRadius: "8px" }}
          className="px-4 py-2 rounded-xl bg-primary text-white font-semibold"
        >
          {loading ? "Searching..." : "Search"}
        </Button>
        <Button
          type="button"
          onClick={() => fetchTrending()}
          style={{ borderRadius: "8px" }}
          className="px-4 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-primary hover:text-white"
        >
          <RiRefreshLine className={`${loading ? "animate-spin" : ""}`} />
        </Button>
      </form>

      {summary && (
        <div className="mb-6 text-sm text-neutral-400 italic text-center">
          {summary}
        </div>
      )}

      {loading ? (
        <LoadingBlock text="Analyzing trending topics on Reddit..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {topics.length ? topics.map((topic: GroupedTopic, i: number) => (
            <a key={i} href={`/topic/${encodeURIComponent((topic.category || `topic-${i}`))}`} className="group">
              <TrendingCard topic={topic} rank={i + 1} />
            </a>
          )) : (
            <div className="col-span-full text-center text-neutral-500 mt-8">No trending data found. Try another keyword.</div>
          )}
        </div>
      )}
    </div>
  );
}
