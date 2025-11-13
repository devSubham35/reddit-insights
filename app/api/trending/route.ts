/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");

    // 🕒 Always fetch the latest Reddit data — not cached top posts
    const redditUrl = query
      ? `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=15`
      : `https://www.reddit.com/r/all/hot.json?limit=15`;

    // Add cache-busting param to guarantee fresh fetch each time
    const noCacheUrl = `${redditUrl}&_t=${Date.now()}`;

    const response = await fetch(noCacheUrl, {
      headers: { "User-Agent": "nextjs-reddit-trending-app/1.0" },
      cache: "no-store", // 🔥 force Next.js to skip any internal caching
    });

    if (!response.ok) throw new Error("Failed to fetch Reddit data");
    const json = await response.json();

    const posts = json.data.children.map((child: any) => {
      const d = child.data;
      return {
        id: d.id,
        title: d.title,
        subreddit: d.subreddit,
        author: d.author,
        upvotes: d.ups,
        comments: d.num_comments,
        upvoteRatio: d.upvote_ratio,
        createdUtc: d.created_utc,
        url: `https://reddit.com${d.permalink}`,
        thumbnail: d.thumbnail?.startsWith("http") ? d.thumbnail : null,
        mediaUrl:
          d.is_video && d.media?.reddit_video?.fallback_url
            ? d.media.reddit_video.fallback_url
            : d.url_overridden_by_dest || d.url,
        isVideo: d.is_video,
        nsfw: d.over_18,
        domain: d.domain,
        engagementScore: d.ups + d.num_comments * 2,
        viralityIndex:
          d.subreddit_subscribers > 0
            ? Number((d.ups / d.subreddit_subscribers).toFixed(5))
            : null,
        contentType: d.is_video
          ? "Video"
          : d.post_hint === "image"
          ? "Image"
          : "Text",
      };
    });

    if (!posts.length) {
      throw new Error("No live data found from Reddit.");
    }

    const aiList = posts
      .map((p: { title: any; subreddit: any; }, i: number) => `${i + 1}. ${p.title} (r/${p.subreddit})`)
      .join("\n");

    const prompt = `
You are a marketing trend analyst.
Categorize these **live Reddit posts** into marketing-relevant groups based on their titles and subreddits.

Rules:
- Output **strictly valid JSON**.
- Use the **post ID numbers only** to assign posts to categories.
- Do NOT recreate or modify post data.

JSON Example output:
{
  "groups": [
    { "category": "AI & Tech", "postIds": [1, 5, 8] },
    { "category": "Finance / Economy", "postIds": [2, 4] }
  ],
  "summary": "Brief marketing insight..."
}

Posts:
${aiList}
`;

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert in analyzing Reddit trends for marketing insights.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const aiJson = JSON.parse(aiResponse.choices[0].message.content || "{}");

    const groupedTopics =
      aiJson.groups?.map((group: any) => ({
        category: group.category,
        posts: group.postIds
          .map((id: number) => posts[id - 1])
          .filter(Boolean),
      })) || [];

    return NextResponse.json({
      success: true,
      freshness: "real-time", // just to make it clear in the response
      query: query || "top trending (live)",
      totalPosts: posts.length,
      groupedTopics,
      marketingSummary: aiJson.summary || null,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
