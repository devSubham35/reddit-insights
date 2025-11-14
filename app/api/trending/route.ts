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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim() || "";
    const redditUrl = query
      ? `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=50`
      : `https://www.reddit.com/r/all/hot.json?limit=50`;

    // add cache bust param
    const response = await fetch(`${redditUrl}&_t=${Date.now()}`, {
      headers: { "User-Agent": "nextjs-reddit-trend-app/1.0" },
      cache: "no-store"
    });

    if (!response.ok) throw new Error("Failed to fetch Reddit data");

    const json = await response.json();

    const posts = (json.data.children || []).map((ch: { data: any; }) => {
      const d = ch.data;
      return {
        id: d.id,
        title: d.title,
        subreddit: d.subreddit,
        author: d.author,
        upvotes: d.ups || 0,
        comments: d.num_comments || 0,
        createdUtc: d.created_utc || Math.floor(Date.now() / 1000),
        url: safeUrl(`https://reddit.com${d.permalink || ""}`),
        thumbnail: d.thumbnail?.startsWith("http") ? d.thumbnail : null,
        mediaUrl:
          d.is_video && d.media?.reddit_video?.fallback_url
            ? d.media.reddit_video.fallback_url
            : d.url_overridden_by_dest || d.url,
        isVideo: !!d.is_video,
        nsfw: !!d.over_18,
        domain: d.domain,
        subreddit_subscribers: d.subreddit_subscribers || 0,
        engagementScore: (d.ups || 0) + (d.num_comments || 0) * 2
      };
    });

    if (!posts.length) {
      return NextResponse.json({ success: false, message: "No reddit posts found." }, { status: 404 });
    }

    // Build a simple text list for AI or fallback
    const listText = posts.map((p: any, i: number) => `${i + 1}. ${p.title} (r/${p.subreddit})`).join("\n");

    // If we have OpenAI, ask it to group posts into marketing categories and a short summary
    if (openai) {
      try {
        const prompt = `You are an expert marketing analyst. Categorize these live Reddit posts into marketing-relevant groups.
Return strictly JSON with keys "groups" and "summary".
- "groups": array of { "category": string, "postIds": [1,2] }
- "summary": short marketing insight (1-2 sentences)

Posts:
${listText}`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are an expert marketing trend analyst." },
            { role: "user", content: prompt }
          ],
          temperature: 0.4,
          max_tokens: 500
        });

        const content = completion.choices?.[0]?.message?.content || "{}";
        let aiJson = {};
        try {
          aiJson = JSON.parse(content);
        } catch {
          // If not strict JSON, try to find JSON within the text
          const match = content.match(/(\{[\s\S]*\})/);
          aiJson = match ? JSON.parse(match[1]) : {};
        }

        const groupedTopics = (aiJson as any).groups?.map((g: any) => ({
          category: g.category,
          posts: (g.postIds || []).map((id: number) => posts[id - 1]).filter(Boolean)
        })) || [];

        return NextResponse.json({
          success: true,
          query: query || "top trending",
          totalPosts: posts.length,
          groupedTopics,
          marketingSummary: (aiJson as any).summary || null
        });
      } catch (err) {
        console.error("OpenAI error:", err);
        // continue to fallback grouping
      }
    }

    // ===== Fallback grouping (no OpenAI / AI failed) =====
    // Very simple keyword-based grouping: pick top frequent words from titles excluding stopwords
    const stopwords = new Set([
      "the","and","a","to","of","in","for","on","is","it","this","that","you","with","i","my","we","me"
    ]);

    const freq: Record<string, number> = {};
    posts.forEach((p: any) => {
      p.title
        .replace(/[^\w\s]/g, " ")
        .toLowerCase()
        .split(/\s+/)
        .forEach((w: string) => {
          if (!w || w.length < 3 || stopwords.has(w)) return;
          freq[w] = (freq[w] || 0) + 1;
        });
    });

    // get top 6 words
    const topWords = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,6).map(x=>x[0]);

    // Create groups by finding posts that include these words
    const groups: { category: string; posts: any[] }[] = topWords.map((w) => ({
      category: w,
      posts: posts.filter((p: any) => p.title.toLowerCase().includes(w)).slice(0,8)
    })).filter(g => g.posts.length > 0);

    // add uncategorized bucket if any remaining
    const categorizedIds = new Set(groups.flatMap(g => g.posts.map((p:any)=>p.id)));
    const leftover = posts.filter((p:any)=>!categorizedIds.has(p.id));
    if (leftover.length) {
      groups.push({ category: "misc", posts: leftover.slice(0,8) });
    }

    const summary = `Top keywords: ${topWords.join(", ")}. ${groups.length} categories generated (fallback).`;

    return NextResponse.json({
      success: true,
      query: query || "top trending",
      totalPosts: posts.length,
      groupedTopics: groups,
      marketingSummary: summary
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, message: error.message || String(error) }, { status: 500 });
  }
}
