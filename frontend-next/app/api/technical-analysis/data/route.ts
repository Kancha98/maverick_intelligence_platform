import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';  // <--- Add this line

export async function GET(request: Request) {
  try {
    // Get URL parameters if any
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const exactDate = searchParams.get('exact_date') || 'true'; // default to true
    
    // Use BACKEND_URL from environment, default to Flask local
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    
    // Build URL with query parameters if present
    let url = `${backendUrl}/technical-analysis`;
    if (dateParam) {
      url += `?date=${encodeURIComponent(dateParam)}&exact_date=${exactDate}`;
    }
    
    console.log(`[DEBUG] Fetching technical analysis data from: ${url}`);

    // First try with default URL
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000'
        },
        cache: 'no-store', // Ensure we don't cache the response
        next: { revalidate: 0 } // Ensure fresh data on each request
      });
      
      console.log(`[DEBUG] Technical analysis response status: ${response.status}`);
      
      if (response.ok) {
        return await processResponse(response);
      } else {
        // If default URL failed, try with localhost/127.0.0.1 alternative
        const errorText = await response.text();
        console.error(`[ERROR] Backend error with default URL: ${errorText}`);
        throw new Error(`Failed with status ${response.status}: ${errorText}`);
      }
    } catch (initialError) {
      console.error(`[ERROR] Initial fetch failed: ${initialError}`);
      
      // Try with alternative URL (127.0.0.1 instead of localhost or vice versa)
      const altUrl = url.replace('localhost', '127.0.0.1').replace('127.0.0.1', 'localhost');
      console.log(`[DEBUG] Retrying with alternative URL: ${altUrl}`);
      
      try {
        const altResponse = await fetch(altUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000'
          },
          cache: 'no-store',
          next: { revalidate: 0 }
        });
        
        console.log(`[DEBUG] Alternative URL response status: ${altResponse.status}`);
        
        if (altResponse.ok) {
          return await processResponse(altResponse);
        } else {
          const altErrorText = await altResponse.text();
          console.error(`[ERROR] Backend error with alternative URL: ${altErrorText}`);
          
          // Return details of both failures
          return NextResponse.json({
            error: `Failed to fetch technical analysis data. 
              Default URL (${url}): ${initialError}.
              Alternative URL (${altUrl}): Status ${altResponse.status}`,
            data: []
          }, { status: altResponse.status });
        }
      } catch (altError) {
        console.error(`[ERROR] Alternative fetch failed: ${altError}`);
        
        // Try debug endpoint to check database
        try {
          const debugUrl = `${backendUrl}/debug-db`;
          console.log(`[DEBUG] Trying debug endpoint: ${debugUrl}`);
          const debugResponse = await fetch(debugUrl);
          
          if (debugResponse.ok) {
            const debugData = await debugResponse.json();
            console.log(`[DEBUG] Debug endpoint response:`, debugData);
            
            return NextResponse.json({
              error: `Failed to fetch technical analysis data. 
                Default URL: ${initialError}.
                Alternative URL: ${altError}.
                Debug endpoint data: ${JSON.stringify(debugData).substring(0, 500)}...`,
              debugData: debugData,
              data: []
            }, { status: 500 });
          } else {
            return NextResponse.json({
              error: `Failed to fetch technical analysis data. All attempts failed.
                Default URL: ${initialError}.
                Alternative URL: ${altError}.
                Debug endpoint: Failed with status ${debugResponse.status}`,
              data: []
            }, { status: 500 });
          }
        } catch (debugError) {
          return NextResponse.json({
            error: `Failed to fetch technical analysis data. All attempts failed.
              Default URL: ${initialError}.
              Alternative URL: ${altError}.
              Debug endpoint: ${debugError}`,
            data: []
          }, { status: 500 });
        }
      }
    }
  } catch (error) {
    console.error('[ERROR] Error in technical analysis API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch technical analysis data', data: [] },
      { status: 500 }
    );
  }
}

// Helper function to process the response
async function processResponse(response: Response) {
  try {
    // Get response as text first to handle potential JSON parsing issues
    const responseText = await response.text();
    
    if (!responseText) {
      console.error('[ERROR] Empty response received from backend');
      return NextResponse.json({ 
        error: 'Empty response from backend server',
        data: []
      }, { status: 500 });
    }
    
    console.log(`[DEBUG] Response text length: ${responseText.length} chars`);
    
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
      console.error('[ERROR] JSON parse error:', parseError);
      console.error('[ERROR] First 500 chars of response:', sanitizedText.substring(0, 500));
      return NextResponse.json(
        { 
          error: `Error parsing JSON response: ${parseError.message}`, 
          responseText: responseText.substring(0, 200) + '...' 
        },
        { status: 500 }
      );
    }
    
    // Log the structure of the received data for debugging
    console.log(`[DEBUG] Received technical analysis data with ${data.data ? data.data.length : 0} records`);
    
    // Check for specific data issues
    if (data.data && data.data.length > 0) {
      const sampleRecord = data.data[0];
      console.log('[DEBUG] Sample record:', JSON.stringify(sampleRecord).substring(0, 500));
      
      if (sampleRecord.closing_price === null || sampleRecord.closing_price === 0) {
        console.warn('[WARN] Closing price is null or zero in sample record');
      }
      
      if (sampleRecord.turnover === null || sampleRecord.turnover === 0) {
        console.warn('[WARN] Turnover is null or zero in sample record');
      }
    }
    
    if (data.error) {
      console.error('[ERROR] Backend reported an error:', data.error);
    }
    
    // Ensure all data items have valid values (replace NaN with null)
    if (data.data && Array.isArray(data.data)) {
      data.data = data.data.map((item: Record<string, any>) => {
        const cleanItem: Record<string, any> = {};
        
        // Copy all properties, replacing any NaN values with null
        Object.entries(item).forEach(([key, value]) => {
          if (typeof value === 'number' && isNaN(value)) {
            cleanItem[key] = null;
          } else {
            cleanItem[key] = value;
          }
        });
        
        return cleanItem;
      });
    } else {
      // If data is not available or not an array, initialize it
      data.data = [];
    }
    
    return NextResponse.json(data);
  } catch (processError) {
    console.error('[ERROR] Error processing response:', processError);
    return NextResponse.json(
      { error: `Error processing response: ${processError instanceof Error ? processError.message : 'Unknown error'}`, data: [] },
      { status: 500 }
    );
  }
}