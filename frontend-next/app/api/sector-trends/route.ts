import { NextRequest, NextResponse } from 'next/server';

// --- Utility Functions ---
function movingAverage(arr: number[], window: number): number[] {
  return arr.map((_, i) =>
    i + 1 >= window
      ? arr.slice(i + 1 - window, i + 1).reduce((a, b) => a + b, 0) / window
      : NaN
  );
}

function zScores(arr: number[]): number[] {
  const valid = arr.filter((v) => isFinite(v));
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  const std = Math.sqrt(valid.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / valid.length) || 1;
  return arr.map((v) => (isFinite(v) ? (v - mean) / std : NaN));
}

function refinedTrendLabel(z: number, ma3: number, ma10: number): string {
  if (z > 1 && ma3 > ma10) return 'Strong Uptrend';
  if (z > 0 && z <= 1 && ma3 > ma10) return 'Weak Uptrend';
  if (z >= -0.5 && z <= 0.5) return 'Neutral';
  if (z < -0.5 && z >= -1 && ma3 <= ma10) return 'Weak Downtrend';
  if (z < -1 && ma3 <= ma10) return 'Strong Downtrend';
  return 'Neutral';
}

function dailyPercentChange(arr: number[]): number[] {
  return arr.map((v, i) => {
    if (i === 0 || !arr[i - 1]) return NaN; // no previous day
    return (v - arr[i - 1]) / arr[i - 1]; // corrected formula: (today - yesterday)/yesterday
  });
}

function movingAverageIgnoreNaN(arr: number[], window: number): number[] {
  return arr.map((_, i) => {
    if (i + 1 < window) return NaN;
    const windowSlice = arr.slice(i + 1 - window, i + 1).filter(v => isFinite(v));
    if (windowSlice.length === 0) return NaN;
    return windowSlice.reduce((a, b) => a + b, 0) / windowSlice.length;
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const dateParam = url.searchParams.get('date');

  // Fetch sector daily history
  const resp = await fetch('https://cse-maverick-be-platform.onrender.com/sector-daily-history');
  if (!resp.ok) {
    return NextResponse.json({ error: 'Backend error', details: `Status: ${resp.status}` }, { status: 500 });
  }
  let json;
  try {
    json = await resp.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON from backend' }, { status: 500 });
  }
  const raw = json.data;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: 'No data array in backend response' }, { status: 500 });
  }

  // Log the first few records to verify data structure
  console.log('Sample data from API:', raw.slice(0, 3));

  // Filter for last 11 days or user-selected date range
  let filtered;
  if (dateParam) {
    filtered = raw.filter(r => r.date === dateParam);
    console.log(`Filtered data for date ${dateParam}:`, filtered.slice(0, 3));
  } else {
    // Get last 11 unique dates for 10-day gain
    const allDates = Array.from(new Set(raw.map(r => r.date))).sort().reverse();
    const last11 = allDates.slice(0, 11);
    filtered = raw.filter(r => last11.includes(r.date));
    console.log('Last 11 dates:', last11);
    console.log('Sample filtered data:', filtered.slice(0, 3));
  }

  // For each sector, collect unique symbols with momentum and count total signals
  const sectorToSymbols: Record<string, Set<string>> = {};
  const sectorToSignalCount: Record<string, number> = {};
  for (const row of filtered) {
    if (!row.sector || !row.symbols || !Array.isArray(row.symbols)) continue;
    if (row.volume_analysis === 'High Bullish Momentum' || row.volume_analysis === 'Emerging Bullish Momentum') {
      if (!sectorToSymbols[row.sector]) sectorToSymbols[row.sector] = new Set();
      if (!sectorToSignalCount[row.sector]) sectorToSignalCount[row.sector] = 0;
      row.symbols.forEach((sym: string) => sectorToSymbols[row.sector].add(sym));
      sectorToSignalCount[row.sector]++;
    }
  }

  const allSectors = Array.from(new Set(raw.map(r => r.sector)));
  console.log('All sectors found:', allSectors);

  // Sort filtered data by date for time-based calculations
  const sortedData = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Instead of gain calculations, just return the required fields for each sector and date
  const minimal = sortedData.map(entry => ({
    date: entry.date,
    sector: entry.sector,
    volume: entry.volume,
    turnover: entry.turnover,
    bullish_symbols: entry.bullish_symbols,
    total_symbols: entry.total_symbols
  }));

  return NextResponse.json({ sectors: minimal });
}
