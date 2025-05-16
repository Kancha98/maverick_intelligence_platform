import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const url = `${backendUrl}/symbols`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error('Backend error:', await response.text());
      throw new Error('Failed to fetch symbols from backend');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching symbols:', error);
    return NextResponse.json(
      { error: 'Failed to fetch symbols from backend' },
      { status: 500 }
    );
  }
} 