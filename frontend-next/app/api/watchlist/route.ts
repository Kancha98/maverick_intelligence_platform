import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../src/auth/options';

interface WatchlistItem {
  symbol: string;
  category: string;
  priceAlert?: number;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession({ req, ...authOptions });
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = new Client({ connectionString: process.env.NEON_DB_URL });
    await client.connect();

    const { rows } = await client.query(
      'SELECT watchlist FROM user_accounts WHERE email = $1',
      [session.user.email]
    );

    await client.end();

    if (rows.length === 0) {
      return NextResponse.json({ watchlist: [] });
    }

    return NextResponse.json({ watchlist: rows[0].watchlist || [] });
  } catch (err) {
    console.error('Error fetching watchlist:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession({ req, ...authOptions });
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbol, category = 'general', priceAlert } = await req.json();
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const client = new Client({ connectionString: process.env.NEON_DB_URL });
    await client.connect();

    // Get current watchlist
    const { rows } = await client.query(
      'SELECT watchlist FROM user_accounts WHERE email = $1',
      [session.user.email]
    );

    let watchlist: WatchlistItem[] = rows.length > 0 ? (rows[0].watchlist || []) : [];
    
    // Check if symbol already exists
    const existingIndex = watchlist.findIndex(item => item.symbol === symbol);
    if (existingIndex >= 0) {
      // Update existing item
      watchlist[existingIndex] = {
        ...watchlist[existingIndex],
        category,
        priceAlert
      };
    } else {
      // Add new item
      watchlist.push({
        symbol,
        category,
        priceAlert
      });
    }
    
    // Update watchlist
    await client.query(
      'UPDATE user_accounts SET watchlist = $1 WHERE email = $2',
      [watchlist, session.user.email]
    );

    await client.end();
    return NextResponse.json({ success: true, watchlist });
  } catch (err) {
    console.error('Error updating watchlist:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession({ req, ...authOptions });
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbol } = await req.json();
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const client = new Client({ connectionString: process.env.NEON_DB_URL });
    await client.connect();

    // Get current watchlist
    const { rows } = await client.query(
      'SELECT watchlist FROM user_accounts WHERE email = $1',
      [session.user.email]
    );

    if (rows.length > 0) {
      let watchlist: WatchlistItem[] = rows[0].watchlist || [];
      watchlist = watchlist.filter(item => item.symbol !== symbol);
      
      // Update watchlist
      await client.query(
        'UPDATE user_accounts SET watchlist = $1 WHERE email = $2',
        [watchlist, session.user.email]
      );
    }

    await client.end();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error removing from watchlist:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 