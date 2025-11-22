/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAI from "openai";
import { NextResponse } from "next/server";

const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const openai = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

function safeUrl(u: string) {
  if (!u) return "";
  try {
    return new URL(u).toString();
  } catch {
    return u;
  }
}

// Generate mock 7-day trend data based on post metrics
function generateTrendData(baseValue: number) {
  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const dayLabel = i === 0 ? "today" : `${i}d`;
    const variance = Math.random() * 0.5 + 0.5;
    const value = i === 0 ? baseValue : Math.floor(baseValue * variance * (1 - i * 0.08));
    trend.push({ time: dayLabel, value: Math.max(1, value) });
  }
  return trend;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim() || "";
    const redditUrl = query
      ? `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=hot&limit=50`
      : `https://www.reddit.com/r/all/hot.json?limit=50`;

    const response = await fetch(`${redditUrl}&_t=${Date.now()}`, {
      headers: {
        "User-Agent": "windows:com.reddit-insights.app:v1.0.0 (by /u/placeholder_user)"
      },
      cache: "no-store"
    });

    if (!response.ok) throw new Error("Failed to fetch Reddit data");

    const json = await response.json();
    console.log(json, "++66")

    const posts = (json.data.children || []).map((ch: { data: any }) => {
      const d = ch.data;
      const upvotes = d.ups || 0;
      const comments = d.num_comments || 0;
      const engagementScore = upvotes + comments * 2;
      const subscribers = d.subreddit_subscribers || 0;
      
      // Calculate metrics
      const mentions = Math.floor(engagementScore / 100) + comments + 1;
      const breadth = Math.min(100, Math.floor(subscribers / 50000) + 1);
      const dodChange = Math.floor(Math.random() * 30) - 10; // -10 to +20
      const baseValue = Math.max(5, Math.floor(mentions / 2));

      return {
        id: d.id || `post-${Math.random().toString(36).substr(2, 9)}`,
        title: d.title || "Untitled Post",
        subtitle: "", // Will be set later
        subreddit: d.subreddit || "unknown",
        author: d.author || "anonymous",
        upvotes,
        comments,
        createdUtc: d.created_utc || Math.floor(Date.now() / 1000),
        url: safeUrl(`https://reddit.com${d.permalink || ""}`),
        thumbnail: d.thumbnail?.startsWith("http") ? d.thumbnail : null,
        mediaUrl: d.is_video && d.media?.reddit_video?.fallback_url
          ? d.media.reddit_video.fallback_url
          : d.url_overridden_by_dest || d.url || "",
        isVideo: !!d.is_video,
        nsfw: !!d.over_18,
        domain: d.domain || "",
        subreddit_subscribers: subscribers,
        engagementScore,
        mentions,
        breadth,
        dodChange,
        trendData: generateTrendData(baseValue)
      };
    });

    if (!posts.length) {
      return NextResponse.json({ success: false, message: "No reddit posts found." }, { status: 404 });
    }

    // Sort by engagement score (highest first) to create ranking
    posts.sort((a: any, b: any) => b.engagementScore - a.engagementScore);

    // If we have OpenAI, generate topic summaries for each post
    if (openai) {
      try {
        const listText = posts.slice(0, 20).map((p: any, i: number) => 
          `${i + 1}. "${p.title}" (r/${p.subreddit})`
        ).join("\n");

        const prompt = `Analyze these Reddit posts and for each one, provide a short subtitle/description (max 10 words) that captures the key theme or context.
Return JSON: { "subtitles": ["subtitle1", "subtitle2", ...] }

Posts:
${listText}`;

        const completion = await openai.responses.create({
          model: "gpt-4o-mini",
          input: [
            { role: "system", content: "You are a trend analyst. Provide concise, insightful subtitles." },
            { role: "user", content: prompt }
          ],
          max_output_tokens: 500,
          temperature: 0.4
        });

        const content = completion.output_text || "{}";
        let aiJson: any = {};
        try {
          aiJson = JSON.parse(content);
        } catch {
          const match = content.match(/(\{[\s\S]*\})/);
          aiJson = match ? JSON.parse(match[1]) : {};
        }

        if (aiJson.subtitles && Array.isArray(aiJson.subtitles)) {
          posts.slice(0, 20).forEach((p: any, i: number) => {
            if (aiJson.subtitles[i]) {
              p.subtitle = aiJson.subtitles[i];
            }
          });
        }
      } catch (err) {
        console.error("OpenAI error:", err);
      }
    }

    // Generate fallback subtitles for posts without AI subtitles
    posts.forEach((p: any) => {
      if (!p.subtitle) {
        p.subtitle = `Discussion in r/${p.subreddit}, ${p.comments} comments`;
      }
    });

    return NextResponse.json({
      success: true,
      query: query || "top trending",
      totalPosts: posts.length,
      topics: posts,
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, message: error.message || String(error) }, { status: 500 });
  }
}