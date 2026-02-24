import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const runtime = 'nodejs'; // Switching to nodejs runtime for better compatibility with cheerio/scraping

export async function POST(req: NextRequest) {
    try {
        const { query } = await req.json();

        if (!query) {
            return NextResponse.json(
                { error: 'Query is required' },
                { status: 400 }
            );
        }

        // Use DuckDuckGo HTML version for easier scraping
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch search results: ${response.statusText}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const results: { title: string; url: string; content: string }[] = [];

        $('.result').each((i: number, element: any) => {
            if (i >= 5) return false; // Limit to top 5 results

            const title = $(element).find('.result__title').text().trim();
            const url = $(element).find('.result__url').attr('href')?.trim();
            const snippet = $(element).find('.result__snippet').text().trim();

            if (title && url && snippet) {
                results.push({
                    title,
                    url,
                    content: snippet
                });
            }
        });

        return NextResponse.json({ results });

    } catch (error: any) {
        console.error('Error in search API:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
