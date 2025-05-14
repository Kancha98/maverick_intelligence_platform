import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Use BACKEND_URL from environment, default to Flask local
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const url = `${backendUrl}/fundamental-metrics`;
    
    console.log(`Fetching data from: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'http://localhost:3001' // Explicitly setting origin
      },
      cache: 'no-store', // Ensure we don't cache the response
      next: { revalidate: 0 } // Ensure fresh data on each request
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', errorText);
      return NextResponse.json({
        error: `Failed to fetch data: ${response.status} - ${errorText.substring(0, 100)}...`,
        url: url
      }, { status: response.status });
    }

    // Get response as text first to handle potential JSON parsing issues
    const responseText = await response.text();
    if (!responseText) {
      console.error('Empty response received from backend');
      return NextResponse.json({ 
        error: 'Empty response from backend server',
        metrics: []
      }, { status: 500 });
    }
    
    // Replace NaN values with null before parsing JSON
    const sanitizedText = responseText
      .replace(/: NaN/g, ': null')
      .replace(/: Infinity/g, ': null')
      .replace(/: -Infinity/g, ': null');
    
    // Try to parse the response as JSON
    let data;
    try {
      data = JSON.parse(sanitizedText);
    } catch (parseError: any) {
      console.error('JSON parse error:', parseError, 'Response text:', sanitizedText.substring(0, 500) + '...');
      return NextResponse.json(
        { 
          error: `Error parsing JSON response: ${parseError.message}`, 
          responseText: responseText.substring(0, 200) + '...' 
        },
        { status: 500 }
      );
    }
    
    // Log the structure of the received data for debugging
    console.log(`Received data with ${data.metrics ? data.metrics.length : 0} metrics`);
    if (data.error) {
      console.error('Backend reported an error:', data.error);
    }
    
    // Ensure all metrics have valid data (replace NaN with null)
    if (data.metrics && Array.isArray(data.metrics)) {
      data.metrics = data.metrics.map((metric: Record<string, any>) => {
        const cleanMetric: Record<string, any> = {};
        
        // Copy all properties, replacing any NaN values with null
        Object.entries(metric).forEach(([key, value]) => {
          if (typeof value === 'number' && isNaN(value)) {
            cleanMetric[key] = null;
          } else {
            cleanMetric[key] = value;
          }
        });
        
        return cleanMetric;
      });
    } else {
      // If metrics is not available or not an array, initialize it
      data.metrics = [];
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching fundamental metrics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch fundamental metrics data' },
      { status: 500 }
    );
  }
} 