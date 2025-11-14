import Link from "next/link";
import StatCard from "../../../components/StatCard";
import SparklineChart from "../../../components/SparklineChart";
import { GroupResponse, Post, TrendingApiResponse, TrendPoint } from "@/typescript/type";

interface PageProps {
  params: { slug: string };
  searchParams?: Record<string, string>;
}

export default async function TopicPage({ params }: PageProps) {
  const slug = decodeURIComponent(params.slug || "");

  /// Fetch the trending API with slug as query
const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "http://localhost:3000";

  const res = await fetch(
    `${baseUrl}/api/trending?query=${encodeURIComponent(slug)}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch trending data");
  }

  const data: TrendingApiResponse = await res.json();
  const groups: GroupResponse[] = data?.groupedTopics || [];

  /// Find the group that matches slug (or fallback)
  const group: GroupResponse =
    groups.find(
      (g) => (g.category || "").toLowerCase() === slug.toLowerCase()
    ) || groups[0] || { category: slug, posts: [] };


  /// Build 7-day trend graph
  // eslint-disable-next-line react-hooks/purity
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

  /// Stats
  const mentions = group.posts.length;
  const subredditCount = new Set(group.posts.map((p) => p.subreddit)).size;
  const score = group.posts.reduce(
    (sum, p) => sum + (p.engagementScore || 0),
    0
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <Link href="/" className="text-sm text-primary mb-4 inline-block">
        &larr; Back to Dashboard
      </Link>

      <h1 className="text-3xl font-extrabold text-white mb-1">
        {group.category || slug}
      </h1>
      <p className="text-sm text-neutral-400 mb-6">
        Keywords: {group.category}
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

            {!group.posts.length && (
              <div className="text-neutral-500">No examples</div>
            )}
          </ul>
        </div>

        {/* Top Subreddits */}
        <div className="bg-card p-4 rounded-2xl border border-neutral-800">
          <h3 className="text-white font-semibold mb-3">Top Subreddits Today</h3>
          <ul className="space-y-2">
            {Array.from(
              new Set(group.posts.map((p) => p.subreddit))
            )
              .slice(0, 6)
              .map((sub, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between p-2 rounded-md bg-neutral-900/10"
                >
                  <div className="text-sm text-primary font-medium">
                    r/{sub}
                  </div>
                  <div className="text-xs text-neutral-400">1 mentions</div>
                </li>
              ))}

            {!group.posts.length && (
              <div className="text-neutral-500">No subreddits</div>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
