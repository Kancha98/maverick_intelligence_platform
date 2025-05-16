import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

function isValidEmail(email: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, country_of_residence, trading_experience_cse } = await req.json();
    if (!name || !email || !country_of_residence) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }
    const client = new Client({ connectionString: process.env.NEON_DB_URL });
    await client.connect();
    // Check for existing user with same name and email
    const { rows } = await client.query(
      'SELECT id FROM user_accounts WHERE name = $1 AND email = $2',
      [name, email]
    );
    if (rows.length > 0) {
      await client.end();
      return NextResponse.json({ error: 'A profile with this name and email already exists.' }, { status: 409 });
    }
    await client.query(
      `INSERT INTO user_accounts (name, email, country_of_residence, trading_experience_cse)
       VALUES ($1, $2, $3, $4)`,
      [name, email, country_of_residence, trading_experience_cse]
    );
    await client.end();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
} 