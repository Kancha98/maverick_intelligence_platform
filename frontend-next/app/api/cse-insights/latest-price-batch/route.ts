import { NextResponse } from 'next/server';

// Constants
const REQUEST_TIMEOUT = 10000; // 10 seconds
const MAX_SYMBOLS = 50; // Maximum number of symbols to process in one request
const BATCH_SIZE = 5; // Number of concurrent requests to make at once
const MAX_RETRIES = 2; // Maximum number of retries for failed requests

// In-memory cache with TTL
const cache = new Map<string, { data: number | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to fetch with timeout and retries
async function fetchWithRetry(url: string, timeout: number, retries: number = 0): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (retries < MAX_RETRIES && error instanceof Error && error.name === 'AbortError') {
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
      return fetchWithRetry(url, timeout, retries + 1);
    }
    throw error;
  }
}

// Helper function to process a batch of symbols
async function processBatch(
  symbols: string[],
  backendUrl: string,
  timeout: number
): Promise<Record<string, number | null>> {
  const results = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        // Check cache first
        const cached = cache.get(symbol);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          return { [symbol]: cached.data };
        }
        const response = await fetchWithRetry(
          `${backendUrl}/api/latest-price/${encodeURIComponent(symbol)}`,
          timeout
        );
        if (!response.ok) {
          console.error(`Failed to fetch latest price for ${symbol}:`, {
            status: response.status,
            statusText: response.statusText,
          });
          return { [symbol]: null };
        }
        const data = await response.json();
        // Accept either { latestPrice: number } or { latestPrice: null }
        const latestPrice = typeof data.latestPrice === 'number' ? data.latestPrice : null;
        // Update cache
        cache.set(symbol, { data: latestPrice, timestamp: Date.now() });
        return { [symbol]: latestPrice };
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.error(`Request timeout for ${symbol}`);
          } else {
            console.error(`Error fetching latest price for ${symbol}:`, error.message);
          }
        }
        return { [symbol]: null };
      }
    })
  );
  return results.reduce<Record<string, number | null>>((acc, curr) => ({ ...acc, ...curr }), {});
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get('symbols');
  if (!symbols) {
    return NextResponse.json(
      { error: 'Symbols parameter is required' },
      { status: 400 }
    );
  }
  const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean);
  // Validate number of symbols
  if (symbolList.length === 0) {
    return NextResponse.json(
      { error: 'No valid symbols provided' },
      { status: 400 }
    );
  }
  if (symbolList.length > MAX_SYMBOLS) {
    return NextResponse.json(
      { error: `Too many symbols. Maximum allowed is ${MAX_SYMBOLS}` },
      { status: 400 }
    );
  }
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://cse-maverick-be-platform.onrender.com';
    // Process symbols in batches
    const batches = [];
    for (let i = 0; i < symbolList.length; i += BATCH_SIZE) {
      const batch = symbolList.slice(i, i + BATCH_SIZE);
      batches.push(batch);
    }
    // Process each batch sequentially
    const results: Record<string, number | null>[] = [];
    for (const batch of batches) {
      const batchResult = await processBatch(batch, backendUrl, REQUEST_TIMEOUT);
      results.push(batchResult);
    }
    // Combine all batch results
    const combinedData = results.reduce<Record<string, number | null>>((acc, curr) => ({ ...acc, ...curr }), {});
    // Add cache control headers
    const response = NextResponse.json(combinedData);
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return response;
  } catch (error) {
    console.error('Error in latest price batch API route:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch latest price batch data',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
} 