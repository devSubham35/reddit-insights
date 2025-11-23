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

// Generate mock 7-day trend data
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

    // Parse raw posts
    const rawPosts = (json.data.children || []).map((ch: { data: any }) => {
      const d = ch.data;
      const upvotes = d.ups || 0;
      const comments = d.num_comments || 0;
      const engagementScore = upvotes + comments * 2;
      const subscribers = d.subreddit_subscribers || 0;

      return {
        id: d.id || `post-${Math.random().toString(36).substr(2, 9)}`,
        title: d.title || "Untitled Post",
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
        engagementScore
      };
    });

    if (!rawPosts.length) {
      return NextResponse.json({ success: false, message: "No reddit posts found." }, { status: 404 });
    }

    // If we have OpenAI, group posts into topics with AI-generated titles
    if (openai) {
      try {
        const listText = rawPosts.slice(0, 40).map((p: any, i: number) =>
          `${i + 1}. "${p.title}" (r/${p.subreddit}, ${p.upvotes} upvotes, ${p.comments} comments)`
        ).join("\n");

        const prompt = `Analyze these Reddit posts and group them into 8-12 trending topics/themes. For each topic:
1. Create a short, catchy title (3-6 words) that summarizes the theme
2. Write a brief description (8-15 words) explaining what the trend is about
3. List which post numbers belong to this topic

Return JSON format:
{
  "topics": [
    {
      "title": "AI & Technology Concerns",
      "description": "Discussions about AI ethics, job displacement, and tech industry changes",
      "postIds": [1, 5, 12, 23]
    }
  ]
}

Posts:
${listText}`;

        const completion = await openai.responses.create({
          model: "gpt-4o-mini",
          input: [
            { role: "system", content: "You are a trend analyst expert at identifying patterns and themes in social media discussions. Create insightful, engaging topic titles and descriptions." },
            { role: "user", content: prompt }
          ],
          max_output_tokens: 1500,
          temperature: 0.5
        });

        const content = completion.output_text || "{}";
        let aiJson: any = {};
        try {
          aiJson = JSON.parse(content);
        } catch {
          const match = content.match(/(\{[\s\S]*\})/);
          aiJson = match ? JSON.parse(match[1]) : {};
        }

        if (aiJson.topics && Array.isArray(aiJson.topics) && aiJson.topics.length > 0) {
          // Build grouped topics with AI-generated titles
          const groupedTopics = aiJson.topics.map((topicData: any, idx: number) => {
            const postIndices = (topicData.postIds || []).map((id: number) => id - 1);
            const posts = postIndices
              .filter((i: number) => i >= 0 && i < rawPosts.length)
              .map((i: number) => rawPosts[i]);

            if (posts.length === 0) return null;

            // Calculate aggregated metrics
            const totalEngagement = posts.reduce((sum: number, p: any) => sum + p.engagementScore, 0);
            const totalComments = posts.reduce((sum: number, p: any) => sum + p.comments, 0);
            const totalUpvotes = posts.reduce((sum: number, p: any) => sum + p.upvotes, 0);
            const uniqueSubreddits = new Set(posts.map((p: any) => p.subreddit)).size;
            const maxSubscribers = Math.max(...posts.map((p: any) => p.subreddit_subscribers || 0));

            const mentions = posts.length * 3 + Math.floor(totalComments / 10);
            const breadth = Math.min(100, uniqueSubreddits * 10 + Math.floor(maxSubscribers / 100000));
            const dodChange = Math.floor(Math.random() * 20) - 5;
            const baseValue = Math.max(5, Math.floor(mentions / 2));

            return {
              id: `topic-${idx}-${Date.now()}`,
              title: topicData.title || `Topic ${idx + 1}`,
              subtitle: topicData.description || `${posts.length} related discussions`,
              originalTitle: posts[0]?.title || "",
              subreddit: posts[0]?.subreddit || "various",
              author: posts[0]?.author || "various",
              upvotes: totalUpvotes,
              comments: totalComments,
              createdUtc: posts[0]?.createdUtc || Math.floor(Date.now() / 1000),
              url: posts[0]?.url || "",
              thumbnail: posts[0]?.thumbnail || null,
              mediaUrl: posts[0]?.mediaUrl || "",
              isVideo: posts[0]?.isVideo || false,
              nsfw: posts.some((p: any) => p.nsfw),
              domain: posts[0]?.domain || "",
              subreddit_subscribers: maxSubscribers,
              engagementScore: totalEngagement,
              mentions,
              breadth,
              dodChange,
              trendData: generateTrendData(baseValue),
              relatedPosts: posts.slice(0, 5) // Store related posts for detail page
            };
          }).filter(Boolean);

          // Sort by engagement
          groupedTopics.sort((a: any, b: any) => b.engagementScore - a.engagementScore);

          return NextResponse.json({
            success: true,
            query: query || "top trending",
            totalPosts: rawPosts.length,
            topics: groupedTopics,
            lastUpdated: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error("OpenAI error:", err);
      }
    }

    // Fallback: Simple keyword-based grouping without AI
    const keywords: Record<string, any[]> = {};
    const stopwords = new Set(["the", "and", "for", "that", "this", "with", "you", "are", "was", "have", "has", "just", "but", "not", "what", "all", "were", "when", "your", "can", "had", "her", "she", "him", "his", "they", "been", "would", "there", "their", "will", "from", "more", "about"]);

    rawPosts.forEach((post: any) => {
      const words = post.title.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/);
      const significantWords = words.filter((w: string) => w.length > 4 && !stopwords.has(w));
      
      if (significantWords.length > 0) {
        const keyword = significantWords[0];
        if (!keywords[keyword]) keywords[keyword] = [];
        keywords[keyword].push(post);
      }
    });

    // Create topic groups from keywords
    const fallbackTopics = Object.entries(keywords)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, posts]) => posts.length >= 1)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 12)
      .map(([keyword, posts], idx) => {
        const totalEngagement = posts.reduce((sum, p) => sum + p.engagementScore, 0);
        const totalComments = posts.reduce((sum, p) => sum + p.comments, 0);
        const mentions = posts.length * 3 + Math.floor(totalComments / 10);
        const breadth = Math.min(100, new Set(posts.map(p => p.subreddit)).size * 10);
        const baseValue = Math.max(5, Math.floor(mentions / 2));

        return {
          id: `topic-${idx}-${Date.now()}`,
          title: keyword.charAt(0).toUpperCase() + keyword.slice(1) + " discussions",
          subtitle: `${posts.length} posts about ${keyword}`,
          originalTitle: posts[0]?.title || "",
          subreddit: posts[0]?.subreddit || "various",
          author: posts[0]?.author || "various",
          upvotes: posts.reduce((sum, p) => sum + p.upvotes, 0),
          comments: totalComments,
          createdUtc: posts[0]?.createdUtc || Math.floor(Date.now() / 1000),
          url: posts[0]?.url || "",
          thumbnail: posts[0]?.thumbnail || null,
          mediaUrl: posts[0]?.mediaUrl || "",
          isVideo: false,
          nsfw: posts.some(p => p.nsfw),
          domain: posts[0]?.domain || "",
          subreddit_subscribers: Math.max(...posts.map(p => p.subreddit_subscribers || 0)),
          engagementScore: totalEngagement,
          mentions,
          breadth,
          dodChange: Math.floor(Math.random() * 20) - 5,
          trendData: generateTrendData(baseValue),
          relatedPosts: posts.slice(0, 5)
        };
      });

    return NextResponse.json({
      success: true,
      query: query || "top trending",
      totalPosts: rawPosts.length,
      topics: fallbackTopics,
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, message: error.message || String(error) }, { status: 500 });
  }
}