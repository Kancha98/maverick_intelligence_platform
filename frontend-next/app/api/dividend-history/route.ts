import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function GET(request: Request) {
  let client;
  try {
    const { searchParams } = new URL(request.url);
    const companyCode = searchParams.get('company_code');
    const getUniqueCompanies = searchParams.get('unique_companies') === 'true';

    // Get database connection string from environment variable
    const connectionString = process.env.NEON_DB_URL;
    if (!connectionString) {
      throw new Error('Database connection string is not configured');
    }

    // Create database client
    client = new Client({ 
      connectionString,
      ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined
    });

    // Connect to database
    await client.connect();
    console.log('Connected to database');

    let result;
    if (getUniqueCompanies) {
      // Query to get unique company codes
      const query = 'SELECT DISTINCT company_code FROM dividend_history ORDER BY company_code';
      result = await client.query(query);
      console.log(`Retrieved ${result.rows.length} unique company codes`);
    } else {
      // Query for dividend history data using correct columns
      let query = 'SELECT company_code, announcement_date AS date, rate_of_dividend FROM dividend_history';
      const params: string[] = [];
      
      if (companyCode) {
        query += ' WHERE company_code = $1';
        params.push(companyCode);
      }
      
      query += ' ORDER BY announcement_date DESC';
      result = await client.query(query, params);
      console.log(`Retrieved ${result.rows.length} dividend history records`);
    }

    return NextResponse.json({ data: result.rows });
  } catch (error) {
    console.error('Error in dividend history API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch dividend history data' },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.end().catch(err => console.error('Error closing database connection:', err));
    }
  }
} 