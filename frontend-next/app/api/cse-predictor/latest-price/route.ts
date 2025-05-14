import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const response = await fetch(`http://localhost:5000/api/latest-price/${symbol}`);
    if (!response.ok) {
      throw new Error('Failed to fetch latest price');
    }
    const data = await response.json();
    
    // Pass through the response from the backend
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return NextResponse.json({ 
      latestPrice: null, 
      fallback: 'error', 
      message: 'Failed to fetch price' 
    }, { status: 500 });
  }
} 