import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../src/auth/options';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession({ req, ...authOptions });
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const client = new Client({ connectionString: process.env.NEON_DB_URL });
    await client.connect();

    // Get current user's watchlist
    const { rows: currentUserRows } = await client.query(
      'SELECT watchlist FROM user_accounts WHERE email = $1',
      [session.user.email]
    );

    if (currentUserRows.length === 0) {
      await client.end();
      return NextResponse.json({ error: 'Watchlist not found' }, { status: 404 });
    }

    const watchlist = currentUserRows[0].watchlist || [];

    // Check if target user exists
    const { rows: targetUserRows } = await client.query(
      'SELECT email FROM user_accounts WHERE email = $1',
      [email]
    );

    if (targetUserRows.length === 0) {
      // Create new user account if it doesn't exist
      await client.query(
        'INSERT INTO user_accounts (email, watchlist) VALUES ($1, $2)',
        [email, watchlist]
      );
    } else {
      // Update existing user's watchlist
      await client.query(
        'UPDATE user_accounts SET watchlist = $1 WHERE email = $2',
        [watchlist, email]
      );
    }

    await client.end();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error sharing watchlist:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 