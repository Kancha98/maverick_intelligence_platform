import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

// In-memory rate limiting (should use Redis or similar in production)
const RATE_LIMIT = {
  windowMs: 60 * 60 * 1000, // 1 hour window
  maxRequests: 5,           // 5 requests per IP per window
  clients: new Map<string, { count: number, resetTime: number }>()
};

// Fallback to a direct connection string if environment variable is not available
// IMPORTANT: Replace this with your actual connection string, but NEVER commit this to source control
// This is ONLY for testing until you can properly set up environment variables
const connectionString = process.env.NEON_DB_URL || "postgresql://username:password@hostname:5432/database";

// Helper to sanitize inputs
function sanitizeInput(input: string): string {
  if (!input) return '';
  // Remove potentially harmful characters
  return input.replace(/[^\w\s@.-]/g, '').trim().slice(0, 100);
}

// Basic rate limiting middleware
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  
  // Clean up expired entries
  if (RATE_LIMIT.clients.size > 1000) { // Prevent memory leaks
    for (const [clientIp, data] of RATE_LIMIT.clients.entries()) {
      if (now > data.resetTime) {
        RATE_LIMIT.clients.delete(clientIp);
      }
    }
  }
  
  // Check current client
  const clientData = RATE_LIMIT.clients.get(ip);
  
  if (!clientData || now > clientData.resetTime) {
    // Reset or create new entry
    RATE_LIMIT.clients.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs
    });
    return true;
  }
  
  if (clientData.count >= RATE_LIMIT.maxRequests) {
    return false; // Rate limit exceeded
  }
  
  // Increment count
  clientData.count++;
  return true;
}

export async function POST(req: NextRequest) {
  // Get client IP for rate limiting
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  
  // Check rate limit
  if (!checkRateLimit(ip)) {
    console.warn(`Rate limit exceeded for IP: ${ip}`);
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }
  
  // Log for debugging
  console.log("Using connection string (anonymized):", connectionString.replace(/\/\/(.+?):(.+?)@/, '//username:password@'));
  
  // Check if the connection string looks valid
  if (!connectionString || connectionString === "postgresql://username:password@hostname:5432/database") {
    console.error("Please replace the dummy connection string with your actual database credentials");
    return NextResponse.json({ error: 'Database configuration is using dummy values. Please update with real connection details.' }, { status: 500 });
  }
  
  let client;
  try {
    client = new Client({ 
      connectionString, 
      ssl: connectionString?.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
      statement_timeout: 5000, // 5 second query timeout
      query_timeout: 5000      // 5 second overall timeout
    });
    
    const { phoneNumber, username, countryCode } = await req.json();
    
    // Validate required fields
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Missing phone number' }, { status: 400 });
    }
    
    // Sanitize and validate inputs
    const sanitizedPhone = sanitizeInput(phoneNumber);
    const sanitizedUsername = username ? sanitizeInput(username) : null;
    const sanitizedCountryCode = countryCode ? sanitizeInput(countryCode) : '94';
    
    // Validate phone format (digits only, proper length)
    if (!/^\d{9}$/.test(sanitizedPhone)) {
      return NextResponse.json({ error: 'Phone number must be exactly 9 digits' }, { status: 400 });
    }
    
    // Validate country code
    if (sanitizedCountryCode !== '94') {
      return NextResponse.json({ error: 'Only country code 94 is supported' }, { status: 400 });
    }
    
    // Connect to database
    await client.connect();
    console.log("Successfully connected to the database");
    
    // Create table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_ids (
        id SERIAL PRIMARY KEY,
        phone_number VARCHAR(20) UNIQUE NOT NULL,
        username VARCHAR(100),
        index_value VARCHAR(5) DEFAULT '94',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Ensured notification_ids table exists");
    
    // Check for duplicate
    const check = await client.query('SELECT 1 FROM notification_ids WHERE phone_number = $1', [sanitizedPhone]);
    if (check.rowCount && check.rowCount > 0) {
      return NextResponse.json({ error: 'Phone number already subscribed.' }, { status: 409 });
    }
    
    // Insert with countryCode as index_value
    await client.query('INSERT INTO notification_ids (phone_number, username, index_value) VALUES ($1, $2, $3)', 
      [sanitizedPhone, sanitizedUsername, sanitizedCountryCode]);
    console.log(`Successfully inserted phone number: ${sanitizedPhone} with country code: ${sanitizedCountryCode}`);
    
    return NextResponse.json({ success: true, message: `Subscribed: ${sanitizedPhone}` });
  } catch (error: any) {
    console.error("Database error:", error.message);
    
    // Provide more specific error messages based on the error type
    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json({ error: 'Could not connect to database server' }, { status: 500 });
    } else if (error.code === '42P01') {
      return NextResponse.json({ error: 'Table notification_ids does not exist' }, { status: 500 });
    } else if (error.code === '23505') {
      return NextResponse.json({ error: 'Phone number already exists' }, { status: 409 });
    } else if (error.code === '57014') {
      return NextResponse.json({ error: 'Database query timed out' }, { status: 500 });
    }
    
    // Generic error, don't expose details to client
    return NextResponse.json({ error: 'Server error occurred' }, { status: 500 });
  } finally {
    if (client) {
      await client.end().catch((err: any) => console.error("Error closing client:", err));
    }
  }
} 