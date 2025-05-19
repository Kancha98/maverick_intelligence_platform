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
  Tooltip,
  TableSortLabel,
  IconButton,
} from "@mui/material";
import Sidebar from "../../components/Sidebar";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers";
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import { useSwipeable } from 'react-swipeable';
import { useInView } from 'react-intersection-observer';
import { alpha } from '@mui/material/styles';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import SwipeIcon from '@mui/icons-material/Swipe';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

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

interface SectorHistory {
  date: string;
  sector: string;
  volume: number;
  total_symbols: number;
}

interface SectorGain {
  sector: string;
  gain3: number | null;
  gain5: number | null;
  gain10: number | null;
  total_symbols: number;
}

function formatNumber(num: number | null | undefined): string {
  if (num == null) return '-';
  return num.toLocaleString("en-US");
}

const fetchSectorHistory = async (): Promise<SectorHistory[]> => {
  const res = await fetch('https://cse-maverick-be-platform.onrender.com/sector-daily-history');
  if (!res.ok) throw new Error('Failed to fetch sector history');
  const data = await res.json();
  return data.data.map((item: any) => ({
    date: item.date,
    sector: item.sector,
    volume: item.volume,
    total_symbols: item.total_symbols,
  }));
};

const calculateGains = (history: SectorHistory[]): SectorGain[] => {
  // Group by sector
  const sectorMap: Record<string, SectorHistory[]> = {};
  history.forEach((item) => {
    if (!sectorMap[item.sector]) sectorMap[item.sector] = [];
    sectorMap[item.sector].push(item);
  });
  // Calculate gains
  const gains: SectorGain[] = Object.entries(sectorMap).map(([sector, records]) => {
    // Sort by date ascending
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];
    const getNthAgo = (n: number) => sorted[sorted.length - 1 - n];
    const gain = (n: number): number | null => {
      const nth = getNthAgo(n);
      if (!latest || !nth || nth.volume === 0) return null;
      return (latest.volume - nth.volume) / nth.volume;
    };
    return {
      sector,
      gain3: sorted.length > 3 ? gain(3) : null,
      gain5: sorted.length > 5 ? gain(5) : null,
      gain10: sorted.length > 10 ? gain(10) : null,
      total_symbols: latest.total_symbols,
    };
  });
  // Filter out sectors with total_symbols < 5
  const filtered = gains.filter(g => g.total_symbols >= 5);
  // Sort alphabetically
  return filtered.sort((a, b) => a.sector.localeCompare(b.sector));
};

// Helper: median
function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default function SectorAnalysisPage() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [tab, setTab] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

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

  // Add state for momentum
  const [momentum, setMomentum] = useState<any[]>([]);

  // Add sort state
  const [orderBy, setOrderBy] = useState<'sector' | 'gain3' | 'gain5' | 'gain10'>('sector');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  // Add state for tab and selected sectors for chart
  const [selectedTrendSectors, setSelectedTrendSectors] = useState<string[]>([]);

  // Add state for end date in Momentum Trend
  const [trendEndDate, setTrendEndDate] = useState<string | null>(null);

  // Add pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPullToRefresh, setShowPullToRefresh] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const { ref: tableRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });

  // Fetch sectors on mount
  useEffect(() => {
    fetch("/api/sectors")
      .then(res => res.json())
      .then(data => setSectors(data.sectors || []))
      .catch(() => setSectors([]));
  }, []);

  // Fetch stock data for the selected date on mount and when date changes
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

  // Fetch sector momentum data for Momentum tab (tab 0)
  useEffect(() => {
    if (tab !== 0) return;
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
        setMomentum(data.momentum || []);
        setSectorData(data.sectors || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load sector momentum data');
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

  // Prepare sector list for dropdown
  const sectorList = useMemo(() => {
    const unique = new Set<string>();
    momentum.forEach(g => unique.add(g.sector));
    return Array.from(unique).sort();
  }, [momentum]);

  // Prepare time series data for selected sectors (up to 5)
  const [sectorHistory, setSectorHistory] = useState<SectorHistory[]>([]);
  useEffect(() => {
    fetchSectorHistory()
      .then((history) => {
        setSectorHistory(history);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Get all available dates (sorted)
  const allDates = useMemo(() => {
    const dates = Array.from(new Set(sectorHistory.map(h => h.date)));
    return dates.sort();
  }, [sectorHistory]);

  // Set default end date to latest available
  useEffect(() => {
    if (allDates.length && !trendEndDate) {
      setTrendEndDate(allDates[allDates.length - 1]);
    }
  }, [allDates, trendEndDate]);

  // Build chart data: x-axis is date, each sector is a line (normalized as %)
  const chartData = useMemo(() => {
    if (!selectedTrendSectors.length || !trendEndDate) return [];
    const sectorSeries: Record<string, { date: string; value: number }[]> = {};
    selectedTrendSectors.forEach(sector => {
      const all = sectorHistory
        .filter(h => h.sector === sector && h.date <= trendEndDate)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (all.length < 5) return;
      // Anomaly filter: drop points < 0.5 * median of the window
      const volumes = all.map(d => d.volume);
      const med = median(volumes);
      const filtered = all.filter(d => d.volume >= 0.5 * med);
      if (filtered.length < 5) return; // Not enough consistent data
      // Find normalization base: first point >= 0.5 * median
      let baseIdx = 0;
      while (baseIdx < filtered.length && filtered[baseIdx].volume < 0.5 * med) baseIdx++;
      if (baseIdx >= filtered.length) return;
      const newBase = filtered[baseIdx].volume;
      if (!newBase || newBase === 0) return;
      // Only use points from baseIdx onward
      const normSeries = filtered.slice(baseIdx).map(d => ({ date: d.date, value: (d.volume / newBase) * 100 }));
      if (normSeries.length < 5) return;
      sectorSeries[sector] = normSeries;
    });
    // Build chart data: array of { date, [sector1]: %, [sector2]: %, ... }
    const dates = sectorSeries[selectedTrendSectors[0]]?.map(d => d.date) || [];
    return dates.map((date, idx) => {
      const entry: any = { date };
      selectedTrendSectors.forEach(sector => {
        entry[sector] = sectorSeries[sector]?.[idx]?.value ?? null;
      });
      return entry;
    });
  }, [selectedTrendSectors, sectorHistory, trendEndDate]);

  // Sorting handler (now for momentum)
  const handleSort = (column: 'sector' | 'gain3' | 'gain5' | 'gain10') => {
    if (orderBy === column) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(column);
      setOrder('asc');
    }
  };

  // Sort gains before rendering
  const sortedMomentum = React.useMemo(() => {
    const sorted = [...momentum];
    sorted.sort((a, b) => {
      let aValue: string | number | null = a[orderBy];
      let bValue: string | number | null = b[orderBy];
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return 0;
    });
    return sorted;
  }, [momentum, orderBy, order]);

  // Add pull-to-refresh handlers
  const handlePullStart = () => {
    if (window.scrollY === 0) {
      setShowPullToRefresh(true);
    }
  };

  const handlePullMove = (e: TouchEvent) => {
    if (showPullToRefresh) {
      const distance = Math.min(e.touches[0].clientY / 3, 100);
      setPullDistance(distance);
    }
  };

  const handlePullEnd = async () => {
    if (showPullToRefresh && pullDistance > 50) {
      setIsRefreshing(true);
      try {
        await fetchSectorHistory();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to refresh data');
      } finally {
        setIsRefreshing(false);
      }
    }
    setShowPullToRefresh(false);
    setPullDistance(0);
  };

  // Add touch event listeners
  useEffect(() => {
    document.addEventListener('touchstart', handlePullStart);
    document.addEventListener('touchmove', handlePullMove);
    document.addEventListener('touchend', handlePullEnd);

    return () => {
      document.removeEventListener('touchstart', handlePullStart);
      document.removeEventListener('touchmove', handlePullMove);
      document.removeEventListener('touchend', handlePullEnd);
    };
  }, [showPullToRefresh, pullDistance]);

  // Add swipe handlers for tabs
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (tab === 0) setTab(1);
    },
    onSwipedRight: () => {
      if (tab === 1) setTab(0);
    },
    trackMouse: true,
    delta: 10,
    swipeDuration: 500,
    touchEventOptions: { passive: false }
  });

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f7fafc' }}>
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} isDesktop={isDesktop} />
      <Box 
        sx={{ 
          flexGrow: 1, 
          width: '100%', 
          minHeight: '100vh', 
          bgcolor: '#f7fafc', 
          p: { xs: 0.5, sm: 2, md: 3 },
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Pull to refresh indicator */}
        {showPullToRefresh && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: pullDistance,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              transition: 'height 0.2s ease-out',
              zIndex: 1000
            }}
          >
            <CircularProgress size={24} />
          </Box>
        )}

        <AppBar 
          position="static" 
          color="transparent" 
          elevation={0} 
          sx={{ 
            bgcolor: 'white', 
            boxShadow: 'none', 
            borderBottom: '1px solid #eee', 
            px: { xs: 1, sm: 2 }, 
            mb: { xs: 1, sm: 2 },
            position: 'sticky',
            top: 0,
            zIndex: 100
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', gap: 2, minHeight: { xs: 56, sm: 64 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {!drawerOpen && (
                <IconButton 
                  edge="start" 
                  aria-label="menu" 
                  onClick={() => setDrawerOpen(true)} 
                  sx={{ 
                    color: '#000', 
                    mr: 1,
                    p: { xs: 1, sm: 1.5 }
                  }}
                >
                  <MenuIcon />
                </IconButton>
              )}
              <Typography 
                variant="h4" 
                fontWeight={800} 
                sx={{ 
                  color: '#222',
                  fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                }}
              >
                CSE Insights
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button 
                variant="contained" 
                sx={{ 
                  textTransform: 'none', 
                  fontWeight: 700, 
                  bgcolor: '#2563eb', 
                  color: '#fff', 
                  borderRadius: 2, 
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 0.5, sm: 1 },
                  minWidth: { xs: 0, sm: 120 },
                  height: { xs: 40, sm: 44 },
                  fontSize: { xs: '0.95rem', sm: '1rem' },
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  '&:hover': { bgcolor: '#1d4ed8' }
                }}
                href="/#premium"
              >
                Premium
              </Button>
            </Box>
          </Toolbar>
        </AppBar>

        <Paper 
          elevation={0} 
          sx={{ 
            borderRadius: 2, 
            bgcolor: '#fff', 
            p: 0, 
            mb: { xs: 1, sm: 2 },
            position: 'relative'
          }}
          {...swipeHandlers}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ 
              borderBottom: 1, 
              borderColor: '#e5e7eb', 
              minHeight: { xs: 48, sm: 56 },
              '& .MuiTab-root': {
                minHeight: { xs: 48, sm: 56 },
                fontSize: { xs: '0.875rem', sm: '1rem' },
                px: { xs: 1, sm: 2 }
              }
            }}
          >
            <Tab 
              label="Momentum" 
              sx={{ 
                fontWeight: 700, 
                color: '#00b96b', 
                borderBottom: tab === 0 ? '2.5px solid #00b96b' : undefined, 
                minWidth: { xs: 120, sm: 180 }, 
                textTransform: 'none' 
              }} 
            />
            <Tab 
              label="Momentum Trend" 
              sx={{ 
                fontWeight: 700, 
                color: '#2563eb', 
                borderBottom: tab === 1 ? '2.5px solid #2563eb' : undefined, 
                minWidth: { xs: 120, sm: 180 }, 
                textTransform: 'none' 
              }} 
            />
          </Tabs>
        </Paper>

        {tab === 0 && (
          <Grid container spacing={{ xs: 1, sm: 2, md: 3 }} sx={{ mt: { xs: 0.5, sm: 1 } }}>
            <Grid item xs={12}>
              <Paper 
                sx={{ 
                  p: { xs: 1, sm: 2 },
                  position: 'relative',
                  '&:hover': {
                    boxShadow: isMobile ? 1 : 2
                  }
                }}
              >
                {loading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: { xs: 3, sm: 6 } }}>
                    <CircularProgress />
                  </Box>
                )}
                {error && (
                  <Alert 
                    severity="error" 
                    sx={{ 
                      mb: { xs: 1.5, sm: 3 },
                      '& .MuiAlert-message': {
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }
                    }}
                  >
                    {error}
                  </Alert>
                )}
                {!loading && !error && (
                  <Paper 
                    elevation={1} 
                    sx={{ 
                      borderRadius: 2, 
                      p: { xs: 0.5, sm: 2 }, 
                      overflowX: 'auto',
                      '&::-webkit-scrollbar': {
                        height: { xs: 4, sm: 6 },
                        width: { xs: 4, sm: 6 }
                      },
                      '&::-webkit-scrollbar-thumb': {
                        bgcolor: 'rgba(0,0,0,0.2)',
                        borderRadius: 2
                      }
                    }}
                  >
                    <TableContainer 
                      ref={tableRef}
                      sx={{ 
                        maxHeight: { xs: 400, sm: 520 },
                        '& .MuiTableRow-root:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.04)
                        }
                      }}
                    >
                      <Table size={isMobile ? "small" : "medium"} stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', minWidth: { xs: 100, sm: 120 }, py: { xs: 1, sm: 1.5 } }}>
                              <TableSortLabel
                                active={orderBy === 'sector'}
                                direction={orderBy === 'sector' ? order : 'asc'}
                                onClick={() => handleSort('sector')}
                                sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                              >
                                Sector
                              </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', minWidth: { xs: 90, sm: 110 }, py: { xs: 1, sm: 1.5 } }} align="right">
                              <Tooltip title="Based on trading activity in the past 3 trading days." arrow>
                                <span>
                                  <TableSortLabel
                                    active={orderBy === 'gain3'}
                                    direction={orderBy === 'gain3' ? order : 'asc'}
                                    onClick={() => handleSort('gain3')}
                                    sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                                  >
                                    3 Trading Day Momentum
                                  </TableSortLabel>
                                </span>
                              </Tooltip>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', minWidth: { xs: 90, sm: 110 }, py: { xs: 1, sm: 1.5 } }} align="right">
                              <Tooltip title="Based on trading activity in the past 5 trading days." arrow>
                                <span>
                                  <TableSortLabel
                                    active={orderBy === 'gain5'}
                                    direction={orderBy === 'gain5' ? order : 'asc'}
                                    onClick={() => handleSort('gain5')}
                                    sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                                  >
                                    5 Trading Day Momentum
                                  </TableSortLabel>
                                </span>
                              </Tooltip>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', minWidth: { xs: 90, sm: 110 }, py: { xs: 1, sm: 1.5 } }} align="right">
                              <Tooltip title="Based on trading activity in the past 10 trading days." arrow>
                                <span>
                                  <TableSortLabel
                                    active={orderBy === 'gain10'}
                                    direction={orderBy === 'gain10' ? order : 'asc'}
                                    onClick={() => handleSort('gain10')}
                                    sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                                  >
                                    10 Trading Day Momentum
                                  </TableSortLabel>
                                </span>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sortedMomentum.map((row) => (
                            <TableRow key={row.sector} hover>
                              <TableCell sx={{ fontWeight: 500, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.875rem', sm: '1rem' } }}>{row.sector}</TableCell>
                              <TableCell align="right" sx={{ 
                                color: row.gain3 != null ? (row.gain3 > 0 ? 'success.main' : row.gain3 < 0 ? 'error.main' : 'text.primary') : 'text.secondary', 
                                fontWeight: 600,
                                py: { xs: 1, sm: 1.5 },
                                fontSize: { xs: '0.875rem', sm: '1rem' }
                              }}>
                                {row.gain3 !== null ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    {(row.gain3 * 100).toFixed(2) + '%'}
                                    {row.gain3 > 0 && <span style={{ color: '#16a34a', marginLeft: 4 }}>▲</span>}
                                    {row.gain3 < 0 && <span style={{ color: '#ef4444', marginLeft: 4 }}>▼</span>}
                                  </span>
                                ) : '—'}
                              </TableCell>
                              <TableCell align="right" sx={{ 
                                color: row.gain5 != null ? (row.gain5 > 0 ? 'success.main' : row.gain5 < 0 ? 'error.main' : 'text.primary') : 'text.secondary', 
                                fontWeight: 600,
                                py: { xs: 1, sm: 1.5 },
                                fontSize: { xs: '0.875rem', sm: '1rem' }
                              }}>
                                {row.gain5 !== null ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    {(row.gain5 * 100).toFixed(2) + '%'}
                                    {row.gain5 > 0 && <span style={{ color: '#16a34a', marginLeft: 4 }}>▲</span>}
                                    {row.gain5 < 0 && <span style={{ color: '#ef4444', marginLeft: 4 }}>▼</span>}
                                  </span>
                                ) : '—'}
                              </TableCell>
                              <TableCell align="right" sx={{ 
                                color: row.gain10 != null ? (row.gain10 > 0 ? 'success.main' : row.gain10 < 0 ? 'error.main' : 'text.primary') : 'text.secondary', 
                                fontWeight: 600,
                                py: { xs: 1, sm: 1.5 },
                                fontSize: { xs: '0.875rem', sm: '1rem' }
                              }}>
                                {row.gain10 !== null ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    {(row.gain10 * 100).toFixed(2) + '%'}
                                    {row.gain10 > 0 && <span style={{ color: '#16a34a', marginLeft: 4 }}>▲</span>}
                                    {row.gain10 < 0 && <span style={{ color: '#ef4444', marginLeft: 4 }}>▼</span>}
                                  </span>
                                ) : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 1 }}>
                      <Button
                        variant="outlined"
                        color="primary"
                        endIcon={<ArrowForwardIosIcon sx={{ fontSize: 18 }} />}
                        href="/cse-insights"
                        sx={{
                          borderRadius: 999,
                          px: 2,
                          py: 0.7,
                          fontWeight: 500,
                          fontSize: { xs: '0.97rem', sm: '1.03rem' },
                          boxShadow: '0 1px 4px rgba(25, 118, 210, 0.07)',
                          textTransform: 'none',
                          bgcolor: '#f3f8fd',
                          color: '#2563eb',
                          borderColor: '#b6d4fa',
                          minWidth: 0,
                          maxWidth: 340,
                          width: '100%',
                          justifyContent: 'center',
                          '&:hover': { bgcolor: '#e3f2fd', borderColor: '#2563eb', color: '#1976d2' },
                        }}
                      >
                        Click here to Navigate to pick the best counters of a sector!
                      </Button>
                    </Box>
                  </Paper>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}

        {tab === 1 && (
          <Grid container spacing={{ xs: 1, sm: 2, md: 3 }} sx={{ mt: { xs: 0.5, sm: 1 } }}>
            <Grid item xs={12}>
              <Paper 
                sx={{ 
                  p: { xs: 1, sm: 2 },
                  position: 'relative',
                  '&:hover': {
                    boxShadow: isMobile ? 1 : 2
                  }
                }}
              >
                <Box sx={{ 
                  mb: { xs: 2, sm: 3 }, 
                  display: 'flex', 
                  flexDirection: { xs: 'column', sm: 'row' }, 
                  alignItems: { xs: 'stretch', sm: 'center' }, 
                  gap: { xs: 1, sm: 2 } 
                }}>
                  <FormControl 
                    size="small" 
                    sx={{ 
                      minWidth: { xs: '100%', sm: 220 },
                      '& .MuiOutlinedInput-root': {
                        '&:hover': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main'
                          }
                        }
                      }
                    }}
                  >
                    <InputLabel>Sectors</InputLabel>
                    <Select
                      multiple
                      value={selectedTrendSectors}
                      label="Sectors"
                      onChange={e => {
                        const value = e.target.value;
                        setSelectedTrendSectors(Array.isArray(value) ? value : []);
                      }}
                      renderValue={selected => selected.join(', ')}
                      sx={{ 
                        fontSize: { xs: '0.875rem', sm: '1rem' },
                        '& .MuiSelect-select': {
                          py: { xs: 1, sm: 1.5 }
                        }
                      }}
                    >
                      {sectorList.map(sector => (
                        <MenuItem key={sector} value={sector} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                          {sector}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="End Date"
                      value={trendEndDate ? new Date(trendEndDate) : null}
                      onChange={date => setTrendEndDate(date ? date.toISOString().split('T')[0] : null)}
                      minDate={allDates.length ? new Date(allDates[9]) : undefined}
                      maxDate={allDates.length ? new Date(allDates[allDates.length - 1]) : undefined}
                      slotProps={{ 
                        textField: { 
                          size: 'small', 
                          sx: { 
                            minWidth: { xs: '100%', sm: 140 },
                            fontSize: { xs: '0.875rem', sm: '1rem' },
                            '& .MuiOutlinedInput-root': {
                              '&:hover': {
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'primary.main'
                                }
                              }
                            }
                          } 
                        } 
                      }}
                    />
                  </LocalizationProvider>
                </Box>
                {selectedTrendSectors.length > 0 && chartData.length > 0 ? (
                  <Box sx={{ position: 'relative' }}>
                    <ResponsiveContainer width="100%" height={isMobile ? 280 : 340}>
                      <LineChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 16 }}>
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: isMobile ? 11 : 13 }} 
                          label={{ 
                            value: 'Date', 
                            position: 'insideBottom', 
                            offset: -5, 
                            fontSize: isMobile ? 12 : 14 
                          }} 
                        />
                        <YAxis 
                          tickFormatter={v => `${v.toFixed(0)}%`} 
                          tick={{ fontSize: isMobile ? 11 : 13 }}
                          label={{ 
                            value: 'Momentum', 
                            angle: -90, 
                            position: 'insideLeft', 
                            fontSize: isMobile ? 12 : 14 
                          }} 
                        />
                        <RechartsTooltip
                          formatter={(value: number) => `${value.toFixed(2)}%`}
                          labelFormatter={label => `Date: ${label}`}
                          isAnimationActive={false}
                          contentStyle={{ 
                            fontSize: isMobile ? 12 : 14,
                            padding: isMobile ? 8 : 12
                          }}
                        />
                        <Legend 
                          verticalAlign="top" 
                          height={isMobile ? 28 : 36}
                          wrapperStyle={{ fontSize: isMobile ? 12 : 14 }}
                        />
                        {selectedTrendSectors.map((sector, idx) => (
                          <Line
                            key={sector}
                            type="monotone"
                            dataKey={sector}
                            name={sector}
                            stroke={['#2563eb', '#00b96b', '#ef4444', '#f59e0b', '#a21caf'][idx % 5]}
                            strokeWidth={isMobile ? 2 : 2.5}
                            dot={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                    {isMobile && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          bgcolor: alpha(theme.palette.background.paper, 0.8),
                          p: 1,
                          borderRadius: 1,
                          pointerEvents: 'none',
                          opacity: 0.7
                        }}
                      >
                        <SwipeIcon fontSize="small" />
                        <Typography variant="caption">Swipe to zoom</Typography>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      mt: 2,
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      textAlign: 'center'
                    }}
                  >
                    {selectedTrendSectors.length ? 'No consistent momentum data available for the selected sector(s).' : 'Please select sectors to view their momentum trends.'}
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Mobile navigation hint */}
        {isMobile && !drawerOpen && (
          <Box
            sx={{
              position: 'fixed',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: alpha(theme.palette.background.paper, 0.9),
              p: 1,
              borderRadius: 2,
              boxShadow: 2,
              zIndex: 1000
            }}
          >
            <TouchAppIcon fontSize="small" />
            <Typography variant="caption">Tap menu to navigate</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}