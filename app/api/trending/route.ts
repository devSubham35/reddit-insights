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

// Generate mock 7-day trend data with upward curve at the end (like in the image)
function generateTrendData(baseValue: number) {
  const trend = [];
  const startValue = Math.max(2, Math.floor(baseValue * 0.2));
  
  for (let i = 6; i >= 0; i--) {
    const dayLabel = i === 0 ? "today" : `${i}d`;
    let value;
    
    if (i >= 4) {
      // Keep flat or slightly varying for older days
      value = startValue + Math.floor(Math.random() * 2);
    } else if (i === 3 || i === 2) {
      // Start gradual increase
      value = Math.floor(startValue * 1.2) + Math.floor(Math.random() * 2);
    } else if (i === 1) {
      // Steeper increase
      value = Math.floor(baseValue * 0.6);
    } else {
      // Today - peak value
      value = baseValue;
    }
    
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

        const prompt = `You are a social media trend analyst. Analyze these Reddit posts and identify 8-12 distinct trending topics or themes. 

For each topic, create:
1. A clear, specific title (3-7 words) - be concrete and newsworthy
2. A brief description using comma-separated key phrases (4-8 words total, 2-4 phrases separated by commas)
3. List which post numbers belong to this topic

Description Style Rules:
- Use SHORT comma-separated phrases (example: "Work realities, India vs Australia, work-life balance")
- Each phrase should be 1-3 words maximum
- Include specific details: locations, numbers, concrete terms
- NO full sentences, NO "and", NO articles (the/a/an)
- Format: "phrase1, phrase2, phrase3" or "phrase1, phrase2, phrase3, phrase4"

Examples of GOOD descriptions:
✓ "Work realities, India vs Australia, work-life balance"
✓ "U.S. hitting $38 trillion, tariffs new laws"
✓ "New policies, Government needs, West Europe immigrants"
✓ "Scotiabank debt-calls, Changes in AI ethics, HR"

Examples of BAD descriptions:
✗ "Discussions about economic concerns and policy changes"
✗ "People are talking about work culture"

Return ONLY valid JSON:
{
  "topics": [
    {
      "title": "Global work-culture",
      "description": "Work realities, India vs Australia, work-life balance",
      "postIds": [1, 5, 12]
    }
  ]
}

Reddit Posts:
${listText}`;

        const completion = await openai.responses.create({
          model: "gpt-4o-mini",
          input: [
            { 
              role: "system", 
              content: "You are a trend analyst. Create specific topic titles and SHORT comma-separated descriptions (no full sentences). Use phrases like 'Work realities, India vs Australia' not 'Discussions about work'. Always return valid JSON only." 
            },
            { role: "user", content: prompt }
          ],
          max_output_tokens: 2000,
          temperature: 0.2
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
              relatedPosts: posts.slice(0, 10).map((p: any) => ({
                id: p.id,
                title: p.title,
                subreddit: p.subreddit,
                author: p.author,
                upvotes: p.upvotes,
                comments: p.comments,
                url: p.url,
                engagementScore: p.engagementScore
              }))
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

    // Fallback: Improved keyword-based grouping without AI
    const topicGroups: Record<string, any[]> = {};
    
    // Extract meaningful phrases and keywords
    rawPosts.forEach((post: any) => {
      const title = post.title.toLowerCase();
      
      // Try to extract meaningful 2-3 word phrases
      const words = title.replace(/[^\w\s]/g, "").split(/\s+/);
      let matched = false;
      
      // Look for existing groups that match
      for (const [key, posts] of Object.entries(topicGroups)) {
        const keyWords = key.split(" ");
        const matchCount = keyWords.filter(kw => title.includes(kw)).length;
        if (matchCount >= 2 || (keyWords.length === 1 && title.includes(keyWords[0]))) {
          posts.push(post);
          matched = true;
          break;
        }
      }
      
      // Create new group if no match
      if (!matched && words.length > 0) {
        const stopwords = new Set(["the", "and", "for", "that", "this", "with", "you", "are", "was", "have", "has", "just", "but", "not", "what", "all", "were", "when", "your", "can", "had", "her", "she", "him", "his", "they", "been", "would", "there", "their", "will", "from", "more", "about", "why", "how"]);
        const significantWords = words.filter((w: string) => w.length > 3 && !stopwords.has(w)).slice(0, 3);
        
        if (significantWords.length > 0) {
          const key = significantWords.slice(0, 2).join(" ");
          topicGroups[key] = [post];
        }
      }
    });

    // Create topic groups from grouped posts
    const fallbackTopics = Object.entries(topicGroups)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, posts]) => posts.length >= 1)
      .sort((a, b) => {
        // Sort by total engagement
        const aEngagement = a[1].reduce((sum, p) => sum + p.engagementScore, 0);
        const bEngagement = b[1].reduce((sum, p) => sum + p.engagementScore, 0);
        return bEngagement - aEngagement;
      })
      .slice(0, 12)
      .map(([keyword, posts], idx) => {
        const totalEngagement = posts.reduce((sum, p) => sum + p.engagementScore, 0);
        const totalComments = posts.reduce((sum, p) => sum + p.comments, 0);
        const mentions = posts.length * 3 + Math.floor(totalComments / 10);
        const uniqueSubs = new Set(posts.map(p => p.subreddit));
        const breadth = Math.min(100, uniqueSubs.size * 15);
        const baseValue = Math.max(5, Math.floor(mentions / 2));
        
        // Create a better title and description from the keyword and context
        const titleWords = keyword.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1));
        const topSubreddit = posts[0]?.subreddit || "reddit";
        const commentCount = totalComments;
        
        // Create comma-separated description
        const descParts = [
          `Trending in r/${topSubreddit}`,
          `${posts.length} posts`,
          `${commentCount} comments`
        ];

        return {
          id: `topic-${idx}-${Date.now()}`,
          title: `${titleWords.join(" ")} discussions`,
          subtitle: descParts.slice(0, 3).join(", "),
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
          relatedPosts: posts.slice(0, 5).map(p => ({
            id: p.id,
            title: p.title,
            subreddit: p.subreddit,
            author: p.author,
            upvotes: p.upvotes,
            comments: p.comments,
            url: p.url,
            engagementScore: p.engagementScore
          }))
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