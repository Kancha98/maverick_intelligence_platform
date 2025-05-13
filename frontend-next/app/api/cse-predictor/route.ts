import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Get the search params from the URL
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const symbol = searchParams.get('symbol');

    // Use BACKEND_URL from environment, default to Flask local
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const url = `${backendUrl}/cse-predictor?date=${date || ''}&symbol=${symbol || ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error('Backend error:', await response.text());
      throw new Error('Failed to fetch data from backend');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching CSE Predictor data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CSE Predictor data' },
      { status: 500 }
    );
  }
} 