"use client";

import { Topic } from "@/typescript/type";
import MiniSparkline from "./MiniSparkline";

interface TopicRowProps {
  topic: Topic;
  rank: number;
}

export default function TopicRow({ topic, rank }: TopicRowProps) {
  // Safely handle potentially undefined values
  const mentions = topic.mentions ?? 0;
  const breadth = topic.breadth ?? 0;
  const dodChange = topic.dodChange ?? 0;
  const title = topic.title || "Untitled";
  const subtitle = topic.subtitle || `Trending in r/${topic.subreddit || "reddit"}`;
  const trendData = topic.trendData || [];

  const isPositive = dodChange >= 0;
  const dodColor = isPositive ? "text-emerald-400" : "text-red-400";
  const dodIcon = isPositive ? "▲" : "▼";

  return (
    <div className="bg-[#1a1d24] border border-neutral-800 rounded-xl px-5 py-4 hover:border-neutral-600 transition-all cursor-pointer">
      <div className="flex items-center gap-4">
        {/* Rank */}
        <div className="text-neutral-500 font-medium text-sm w-8 shrink-0">
          #{rank}
        </div>

        {/* Title & Subtitle */}
        <div className="flex-1 min-w-0 pr-4">
          <h3 className="text-white font-semibold text-base truncate">
            {title}
          </h3>
          <p className="text-neutral-500 text-sm truncate">
            {subtitle}
          </p>
        </div>

        {/* Mentions */}
        <div className="text-center w-20 shrink-0">
          <div className="text-neutral-500 text-xs mb-1">Mentions</div>
          <div className="text-white font-semibold">{mentions}</div>
        </div>

        {/* DoD (Day over Day) */}
        <div className="text-center w-16 shrink-0">
          <div className="text-neutral-500 text-xs mb-1">DoD</div>
          <div className={`font-semibold ${dodColor}`}>
            {dodIcon} {Math.abs(dodChange)}%
          </div>
        </div>

        {/* Breadth */}
        <div className="text-center w-16 shrink-0">
          <div className="text-neutral-500 text-xs mb-1">Breadth</div>
          <div className="text-white font-semibold">{breadth}</div>
        </div>

        {/* 7-Day Sparkline */}
        <div className="w-24 shrink-0">
          <div className="text-neutral-500 text-xs mb-1 text-center">7-Day</div>
          <MiniSparkline data={trendData} />
        </div>
      </div>
    </div>
  );
}