import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://cse-maverick-be-platform.onrender.com';
    const response = await fetch(`${backendUrl}/api/ohlcv/${symbol}`);
    if (!response.ok) {
      throw new Error('Failed to fetch OHLCV data');
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error fetching OHLCV data for ${symbol}:`, error);
    return NextResponse.json({ error: 'Failed to fetch OHLCV data' }, { status: 500 });
  }
} 