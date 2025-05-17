import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const exactDate = searchParams.get('exact_date') === 'true';

    // Construct the API URL with date parameter if provided
    let apiUrl = 'https://cse-maverick-be-platform.onrender.com/technical-analysis';
    if (date) {
      apiUrl += `?date=${date}`;
      if (exactDate) {
        apiUrl += '&exact_date=true';
      }
    }

    console.log('Fetching technical analysis data from:', apiUrl);
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from backend API: ${response.status}`, errorText);
      throw new Error(`Backend API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Received data from backend:', data);

    return NextResponse.json({ data: data.data || [] });
  } catch (error) {
    console.error('Error in technical analysis API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch technical analysis data' },
      { status: 500 }
    );
  }
} 