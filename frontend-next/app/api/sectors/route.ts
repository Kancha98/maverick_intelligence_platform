import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://cse-maverick-be-platform.onrender.com';
    const response = await fetch(`${backendUrl}/sectors`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch sectors from backend');
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching sectors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sectors from backend' },
      { status: 500 }
    );
  }
} 