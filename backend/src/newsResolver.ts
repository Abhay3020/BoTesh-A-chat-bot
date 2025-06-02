export interface NewsArticle {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
}

export async function getLiveNews(query: string): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWS_API_KEY;
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${apiKey}&pageSize=5&sortBy=publishedAt&language=en`;
  const res = await fetch(url);
  const data = await res.json() as { articles?: NewsArticle[], message?: string };
  if (!data.articles) {
    console.error('NewsAPI error:', data.message || data);
    return [];
  }
  return data.articles.map((a: any) => ({
    title: a.title,
    source: a.source.name,
    url: a.url,
    publishedAt: a.publishedAt
  }));
}

export function formatNews(articles: NewsArticle[]): string {
  let msg = '📰 **Top News Headlines:**\n\n';
  articles.forEach((a, i) => {
    msg += `**${i + 1}. [${a.title}](${a.url})**\n`;
    if (a.source && a.url) {
      msg += `[Source: ${a.source}](${a.url})`;
    }
    msg += a.publishedAt ? `  •  _${new Date(a.publishedAt).toLocaleString()}_` : '';
    msg += '\n---\n\n';
  });
  return msg;
} 