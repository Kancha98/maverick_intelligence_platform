"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Container,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
} from "@mui/material";
import Sidebar from "../../components/Sidebar";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers";
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import SectorMomentumGains from '../components/SectorMomentumGains';

// --- Types ---
interface Sector {
  sector: string;
  codes: string[];
}

interface StockRow {
  symbol: string;
  name?: string;
  closing_price?: number;
  change_pct?: number;
  PER?: number;
  PBV?: number;
  turnover?: number;
  date?: string;
  [key: string]: any;
}

interface AggregateSector {
  sector: string;
  avgTurnover: number | null;
  avgPER: number | null;
  avgPBV: number | null;
}

interface DailySectorData {
  date: string;
  turnover: number | null;
  avgPER: number | null;
  avgPBV: number | null;
}

function formatNumber(num: number | null | undefined): string {
  if (num == null) return '-';
  return num.toLocaleString("en-US");
}

export default function SectorAnalysisPage() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [tab, setTab] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Backend data states
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [stockData, setStockData] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add state for financial metrics
  const [metrics, setMetrics] = useState<Record<string, any>>({});

  // Add state for trend analysis
  const [momentumData, setMomentumData] = useState<any[]>([]);

  // Add state for sector data
  const [sectorData, setSectorData] = useState<any[]>([]);

  // Add state for sector picker
  const [selectedSector, setSelectedSector] = useState<string>('');

  // Add state for line chart
  const [showLineChart, setShowLineChart] = useState(false);

  // Fetch sectors
  useEffect(() => {
    fetch("/api/sectors")
      .then(res => res.json())
      .then(data => setSectors(data.sectors || []))
      .catch(() => setSectors([]));
  }, []);

  // Fetch stock data for the selected date
  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    setError(null);
    const date = selectedDate.toISOString().split('T')[0];
    fetch(`/api/technical-analysis?start=${date}&end=${date}`)
      .then(res => res.json())
      .then(data => {
        setStockData(data.data || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load sector data");
        setLoading(false);
      });
  }, [selectedDate]);

  // Fetch financial metrics on mount
  useEffect(() => {
    fetch('/api/fundamental-analysis/metrics')
      .then(res => res.json())
      .then(data => {
        // Map by code for fast lookup
        const map: Record<string, any> = {};
        (data.metrics || []).forEach((m: any) => { map[m.code] = m; });
        setMetrics(map);
      })
      .catch(() => setMetrics({}));
  }, []);

  // Fetch sector momentum data for Trend Analysis tab
  useEffect(() => {
    if (tab !== 1) return;
    setLoading(true);
    setError(null);
    let url = '/api/sector-trends';
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      url += `?date=${dateStr}`;
    }
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setMomentumData(data.momentum || []);
        setSectorData(data.sectors || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load trend analysis data');
        setLoading(false);
      });
  }, [tab, selectedDate]);

  // Build sector -> stocks map
  const sectorMap = useMemo<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    sectors.forEach((s: Sector) => {
      map[s.sector] = s.codes;
    });
    return map;
  }, [sectors]);

  // Always show all sectors
  const filteredSectors = useMemo<string[]>(() => sectors.map((s: Sector) => s.sector), [sectors]);

  // Stocks by sector (for Sectors & Stocks tab)
  const stocksBySector = useMemo<Record<string, StockRow[]>>(() => {
    const result: Record<string, StockRow[]> = {};
    filteredSectors.forEach((sector: string) => {
      const codes = sectorMap[sector] || [];
      result[sector] = stockData.filter((row: StockRow) => codes.includes(row.symbol));
    });
    return result;
  }, [filteredSectors, sectorMap, stockData]);

  // Aggregate data by sector (for Aggregate Turnover tab)
  const aggregateBySector = useMemo<AggregateSector[]>(() => {
    const result: AggregateSector[] = [];
    filteredSectors.forEach((sector: string) => {
      const codes = sectorMap[sector] || [];
      const rows = stockData.filter((row: StockRow) => codes.includes(row.symbol));
      if (!rows.length) return;
      // Group by symbol, then average
      const bySymbol: Record<string, StockRow[]> = {};
      rows.forEach((row: StockRow) => {
        if (!bySymbol[row.symbol]) bySymbol[row.symbol] = [];
        bySymbol[row.symbol].push(row);
      });
      let turnoverSum = 0, turnoverCount = 0, perSum = 0, perCount = 0, pbvSum = 0, pbvCount = 0;
      Object.values(bySymbol).forEach((list: StockRow[]) => {
        // Use the latest row for price, PER, PBV
        const last = list[list.length - 1];
        if (last.turnover != null) { turnoverSum += last.turnover; turnoverCount++; }
        if (last.PER != null) { perSum += last.PER; perCount++; }
        if (last.PBV != null) { pbvSum += last.PBV; pbvCount++; }
      });
      result.push({
        sector,
        avgTurnover: turnoverCount ? turnoverSum / turnoverCount : null,
        avgPER: perCount ? perSum / perCount : null,
        avgPBV: pbvCount ? pbvSum / pbvCount : null,
      });
    });
    return result;
  }, [filteredSectors, sectorMap, stockData]);

  // Daily sector data (for Daily Sector Data tab)
  const dailyBySector = useMemo<Record<string, DailySectorData[]>>(() => {
    const result: Record<string, DailySectorData[]> = {};
    filteredSectors.forEach((sector: string) => {
      const codes = sectorMap[sector] || [];
      const rows = stockData.filter((row: StockRow) => codes.includes(row.symbol));
      const byDate: Record<string, StockRow[]> = {};
      rows.forEach((row: StockRow) => {
        if (!row.date) return;
        if (!byDate[row.date]) byDate[row.date] = [];
        byDate[row.date].push(row);
      });
      // For each date, aggregate
      const daily: DailySectorData[] = Object.entries(byDate).map(([date, list]) => {
        let turnoverSum = 0, turnoverCount = 0, perSum = 0, perCount = 0, pbvSum = 0, pbvCount = 0;
        (list as StockRow[]).forEach((row: StockRow) => {
          if (row.turnover != null) { turnoverSum += row.turnover; turnoverCount++; }
          if (row.PER != null) { perSum += row.PER; perCount++; }
          if (row.PBV != null) { pbvSum += row.PBV; pbvCount++; }
        });
        return {
          date,
          turnover: turnoverCount ? turnoverSum / turnoverCount : null,
          avgPER: perCount ? perSum / perCount : null,
          avgPBV: pbvCount ? pbvSum / pbvCount : null,
        };
      });
      // Sort by date desc
      daily.sort((a, b) => b.date.localeCompare(a.date));
      result[sector] = daily;
    });
    return result;
  }, [filteredSectors, sectorMap, stockData]);

  // Prepare sector options for picker
  const sectorOptions = sectorData.map((s: any) => s.sector);
  const selectedSectorData = sectorData.find((s: any) => s.sector === selectedSector);

  // Prepare daily progression data for selected sector (raw volume, only Bullish Momentum)
  let progressionData: { date: string; volume: number }[] = [];
  if (selectedSector) {
    progressionData = sectorData
      .filter((entry: any) => entry.sector === selectedSector && entry.volume_analysis === 'Bullish Momentum')
      .map((entry: any) => ({ date: entry.date, volume: entry.volume }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f7fafc' }}>
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} isDesktop={isDesktop} />
      <Box sx={{ flexGrow: 1, width: '100%', minHeight: '100vh', bgcolor: '#f7fafc', p: { xs: 1, sm: 2, md: 3 } }}>
        <Typography variant="h4" fontWeight={800} sx={{ mb: 2, color: '#222' }}>
          CSE Insights by Maverick
        </Typography>
        <Paper elevation={0} sx={{ borderRadius: 2, bgcolor: '#fff', p: 0, mb: 2 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: '#e5e7eb', minHeight: 48 }}
          >
            <Tab label="SECTORS & STOCKS" sx={{ fontWeight: 700, color: '#00b96b', borderBottom: '2.5px solid #00b96b', minWidth: 180, fontSize: { xs: '0.95rem', sm: '1.05rem' }, textTransform: 'none' }} />
          </Tabs>
        </Paper>
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <SectorMomentumGains data={sectorData} />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}