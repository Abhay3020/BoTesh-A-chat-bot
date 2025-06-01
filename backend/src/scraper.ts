import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export interface CricketScore {
  match: string;
  status: string;
  score: string;
  topPerformers: string[];
}

export async function getLiveCricketScore(): Promise<CricketScore | null> {
  try {
    const res = await fetch('https://www.cricbuzz.com/cricket-match/live-scores');
    const html = await res.text();
    const $ = cheerio.load(html);
    // This selector may need adjustment based on Cricbuzz's structure
    const match = $('.cb-lv-scrs-well .cb-ovr-flo.cb-mtch-lst').first().text().trim();
    const status = $('.cb-lv-scrs-well .cb-text-live').first().text().trim();
    const score = $('.cb-lv-scrs-well .cb-lv-scrs-col').first().text().trim();
    const topPerformers: string[] = [];
    $('.cb-lv-scrs-well .cb-ovr-flo.cb-hmscg-bat').each((i: number, el: any) => {
      topPerformers.push($(el).text().trim());
    });
    return { match, status, score, topPerformers };
  } catch (e) {
    console.error('Cricket score scrape error:', e);
    return null;
  }
}

export interface NewsHeadline {
  title: string;
  summary: string;
  link: string;
}

export async function getLatestNews(query: string): Promise<NewsHeadline[]> {
  try {
    const url = `https://news.google.com/search?q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    const headlines: NewsHeadline[] = [];
    $('article').slice(0, 5).each((i: number, el: any) => {
      const title = $(el).find('h3, h4').first().text().trim();
      const link = 'https://news.google.com' + $(el).find('a').first().attr('href');
      const summary = $(el).find('.HO8did').text().trim();
      if (title && link) {
        headlines.push({ title, summary, link });
      }
    });
    return headlines;
  } catch (e) {
    console.error('News scrape error:', e);
    return [];
  }
}

// Only run this block if the file is executed directly (ESM compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const headlines = await getLatestNews('India');
    console.log('Top 5 News Headlines:');
    headlines.forEach((h, i) => {
      console.log(`${i + 1}. ${h.title}`);
      console.log(`   ${h.summary}`);
      console.log(`   ${h.link}`);
    });
  })();
} 