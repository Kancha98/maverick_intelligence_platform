'use client';

import React, { useState, useEffect, useMemo, useRef, useLayoutEffect, ReactElement } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  FormControlLabel,
  Button,
  Checkbox,
  Paper,
  TableCell,
  TableRow,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  // Removed ArrowUpwardIcon,
  // Removed ArrowDownwardIcon,
  TextField,
  Snackbar,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Bar, ComposedChart, Brush, Label, Customized } from 'recharts';
import Sidebar from '../../components/Sidebar';
import { navLinks } from '../../components/navLinks';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { green } from '@mui/material/colors';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AddIcon from '@mui/icons-material/Add';

// Style definitions
const CardStyles = {
  borderRadius: 3,
  boxShadow: 2,
  p: 2,
  minHeight: 220,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  bgcolor: '#fff',
  position: 'relative',
  transition: 'box-shadow 0.2s',
};

const InfoIconStyles = {
  fontSize: { xs: 20, sm: 18 },
  color: 'primary.main',
  ml: 0.5,
  cursor: 'pointer',
};

interface StockData {
  symbol: string;
  closing_price: number;
  change_pct: number;
  turnover: number;
  volume: number;
  rsi: number;
  relative_strength: number;
  date: string;
  [key: string]: any;
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `${month} ${ordinal(day)} ${year}`;
}

function LoadingCard() {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        boxShadow: 2,
        p: 2,
        minHeight: 220,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        bgcolor: '#fff',
        position: 'relative',
        transition: 'box-shadow 0.2s',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" fontWeight={900} sx={{ flexGrow: 1 }}>
          <Skeleton width={100} />
        </Typography>
      </Box>
      <Grid container spacing={0.5} sx={{ mb: 1 }}>
        {[...Array(12)].map((_, index) => (
          <>
            <Grid item xs={7} key={`label-${index}`}>
              <Skeleton width="80%" />
            </Grid>
            <Grid item xs={5} key={`value-${index}`}>
              <Skeleton width="60%" />
            </Grid>
          </>
        ))}
      </Grid>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', mt: 1, gap: 2 }}>
        <Skeleton width={100} height={40} />
        <Skeleton width={100} height={40} />
      </Box>
    </Card>
  );
}

// MobileTooltip component with proper typing
function MobileTooltip({ title, children }: { title: string; children: ReactElement }) {
  const [open, setOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width:600px)');

  if (isMobile) {
    return (
      <>
        <Box onClick={() => setOpen(true)} sx={{ cursor: 'pointer' }}>
          {children}
        </Box>
        <Dialog 
          open={open} 
          onClose={() => setOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              p: 1
            }
          }}
        >
          <DialogContent>
            <Typography variant="body1">{title}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  return (
    <Tooltip title={title} placement="top">
      {children}
    </Tooltip>
  );
}

export default function CSEInsightsPage() {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1); // 1st of current month
  });
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [groupedPicks, setGroupedPicks] = useState<any>({});
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [tab, setTab] = useState(0);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showDateInfo, setShowDateInfo] = useState(true);
  const [latestPrices, setLatestPrices] = useState<Record<string, number | null>>({});
  const [expandedDates, setExpandedDates] = useState<string[]>(() => {
    const sortedDates = Object.keys(groupedPicks || {}).sort((a, b) => b.localeCompare(a));
    return sortedDates.length > 0 ? [sortedDates[0]] : [];
  });
  const [tier2View, setTier2View] = useState<'movers' | 'yet' | 'all'>('all');
  const [ohlcvData, setOhlcvData] = useState<any[]>([]);
  const [showCloseLine, setShowCloseLine] = useState(true);
  const [t2FilteredByDate, setT2FilteredByDate] = useState<Record<string, any[]>>({});
  const [sectors, setSectors] = useState<{ sector: string; symbols: string[] }[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [appliedSectors, setAppliedSectors] = useState<string[]>([]);
  const [ohlcvCache, setOhlcvCache] = useState<Record<string, any[]>>({});
  const [pendingOhlcvRequestsByDate, setPendingOhlcvRequestsByDate] = useState<Record<string, Set<string>>>({});
  const [addPositionDialogOpen, setAddPositionDialogOpen] = useState(false);
  const [newQuantity, setNewQuantity] = useState('');
  const [newBesPrice, setNewBesPrice] = useState('');
  const [newPriceAlert, setNewPriceAlert] = useState('');
  const [positionError, setPositionError] = useState('');
  const [positionSuccess, setPositionSuccess] = useState('');

  // Add refresh function
  const refreshData = async () => {
    // Clear all caches
    setOhlcvCache({});
    setLatestPrices({});
    setPendingOhlcvRequestsByDate({});
    
    // Reset expanded dates
    const sortedDates = Object.keys(groupedPicks || {}).sort((a, b) => b.localeCompare(a));
    setExpandedDates(sortedDates.length > 0 ? [sortedDates[0]] : []);
    
    // Refetch main data
    if (selectedDate) {
      setLoading(true);
      setError(null);
      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        // Updated fetch URL to use the new backend endpoint
        const response = await fetch(`https://cse-maverick-be-platform.onrender.com/cse-predictor?date=${dateStr}`);
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        console.log('API Response:', data); // Debug log
        setGroupedPicks(data.groupedPicks || {});
        setChartData(data.chartData || []);
        setLatestPrices(data.latestPrices || {});
      } catch (err) {
        setError('Failed to load stock data');
      } finally {
        setLoading(false);
      }
    }

    // Refetch OHLCV data if symbol is selected
    if (selectedSymbol) {
      try {
        const res = await fetch(`/api/cse-insights/ohlcv?symbol=${selectedSymbol}`);
        const data = await res.json();
        setOhlcvData(data.ohlcv || []);
      } catch (e) {
        setOhlcvData([]);
      }
    }
  };

  // Helper to get all codes for applied sectors (move this above useEffect)
  const sectorCodes = useMemo(() => {
    if (appliedSectors.length === 0) return null;
    const codes = new Set<string>();
    appliedSectors.forEach(sector => {
      const found = sectors.find(s => s.sector === sector);
      if (found?.symbols) {
        found.symbols.forEach(code => codes.add(code));
      }
    });
    return codes;
  }, [appliedSectors, sectors]);

  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const response = await fetch('/api/cse-insights/symbols');
        if (!response.ok) throw new Error('Failed to fetch symbols');
        const data = await response.json();
        setSymbols(data.symbols);
      } catch (err) {
        setError('Failed to load stock symbols');
      }
    };
    fetchSymbols();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedDate) return;
      setLoading(true);
      setError(null);
      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        // Updated fetch URL to use the new backend endpoint
        const response = await fetch(`https://cse-maverick-be-platform.onrender.com/cse-predictor?date=${dateStr}`);
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        console.log('API Response:', data); // Debug log
        setGroupedPicks(data.groupedPicks || {});
        setChartData(data.chartData || []);
        setLatestPrices(data.latestPrices || {});
      } catch (err) {
        console.error('Fetch Error:', err); // Debug log
        setError('Failed to load stock data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedDate, selectedSymbol]);

  useEffect(() => {
    const sortedDates = Object.keys(groupedPicks || {}).sort((a, b) => b.localeCompare(a));
    if (sortedDates.length > 0) {
      const topDate = sortedDates[0];
      const allSymbols = new Set<string>();
      ['tier1Picks', 'tier2Picks'].forEach(tier => {
        const picks = groupedPicks[topDate]?.[tier] || [];
        picks.forEach((pick: any) => {
          if (pick?.symbol) {
            allSymbols.add(pick.symbol);
          }
        });
      });
      fetchLatestPricesForSymbols(allSymbols);
      setExpandedDates([topDate]);
    }
  }, [groupedPicks]);

  const fetchLatestPricesForSymbols = async (symbols: Set<string>) => {
    const symbolsToFetch = Array.from(symbols).filter(
      (symbol) => latestPrices[symbol] === undefined
    );
    if (symbolsToFetch.length === 0) return;

    const CONCURRENCY = 10;
    let i = 0;

    const runNext = async () => {
      if (i >= symbolsToFetch.length) return;
      const symbol = symbolsToFetch[i++];
      try {
        const res = await fetch(`/api/cse-insights/latest-price?symbol=${encodeURIComponent(symbol)}`);
        const data = await res.json();
        setLatestPrices(prev => ({
          ...prev,
          [symbol]: typeof data.latestPrice === 'number' ? data.latestPrice : null,
        }));
      } catch {
        setLatestPrices(prev => ({
          ...prev,
          [symbol]: null,
        }));
      }
      await runNext();
    };

    await Promise.all(Array(CONCURRENCY).fill(0).map(runNext));
  };

  const handleAccordionChange = (date: string) => (_: any, expanded: boolean) => {
    setExpandedDates((prev) => {
      if (expanded) {
        // Get all symbols that need OHLCV data
        const allSymbols = new Set<string>();
        ['tier1Picks', 'tier2Picks'].forEach(tier => {
          (groupedPicks[date]?.[tier] || []).forEach((pick: any) => {
            if (pick?.symbol && !ohlcvCache[pick.symbol]) {
              allSymbols.add(pick.symbol);
            }
          });
        });
        // Only fetch symbols that aren't already in cache and aren't pending for this date
        const pendingSet = pendingOhlcvRequestsByDate[date] || new Set<string>();
        const symbolsToFetch = Array.from(allSymbols).filter(symbol => 
          !ohlcvCache[symbol] && !pendingSet.has(symbol)
        );
        if (symbolsToFetch.length > 0) {
          setPendingOhlcvRequestsByDate(prev => ({
            ...prev,
            [date]: new Set([...(prev[date] || []), ...symbolsToFetch])
          }));
          fetchOhlcvBatch(symbolsToFetch).then(() => {
            setPendingOhlcvRequestsByDate(prev => {
              const newSet = new Set(prev[date] || []);
              symbolsToFetch.forEach(symbol => newSet.delete(symbol));
              return { ...prev, [date]: newSet };
            });
          });
        }

        // Add logic to fetch latest prices for all symbols in the expanded date
        const allSymbolsInExpandedDate = new Set<string>();
        ['tier1Picks', 'tier2Picks'].forEach(tier => {
          (groupedPicks[date]?.[tier] || []).forEach((pick: any) => {
            if (pick?.symbol && latestPrices[pick.symbol] === undefined) {
              allSymbolsInExpandedDate.add(pick.symbol);
            }
          });
        });
        if (allSymbolsInExpandedDate.size > 0) {
          fetchLatestPricesForSymbols(allSymbolsInExpandedDate);
        }

        return [...prev, date];
      } else {
        return prev.filter(d => d !== date);
      }
    });
  };

  // Preprocess symbol stats for the selected timeframe
  const symbolStats = useMemo(() => {
    console.log('Calculating symbolStats with groupedPicks:', groupedPicks); // Debug log
    const stats: Record<string, {
      firstDate: string,
      firstPrice: number,
      count: number
    }> = {};
    Object.entries(groupedPicks || {}).forEach(([date, dayData]: [string, any]) => {
      ['tier1Picks', 'tier2Picks'].forEach(tier => {
        const picks = dayData?.[tier] || [];
        picks.forEach((pick: any) => {
          if (!pick?.symbol) return;
          if (!stats[pick.symbol]) {
            stats[pick.symbol] = {
              firstDate: pick.date,
              firstPrice: pick.closing_price,
              count: 1
            };
          } else {
            if (new Date(pick.date) < new Date(stats[pick.symbol].firstDate)) {
              stats[pick.symbol].firstDate = pick.date;
              stats[pick.symbol].firstPrice = pick.closing_price;
            }
            stats[pick.symbol].count += 1;
          }
        });
      });
    });
    console.log('Calculated symbolStats:', stats); // Debug log
    return stats;
  }, [groupedPicks]);

  // Add an effect to recalculate t2FilteredByDate when tier2View changes
  useEffect(() => {
    const filtered: Record<string, any[]> = {};
    Object.keys(groupedPicks).forEach(date => {
      console.log(`Processing date ${date}`); // Debug log
      
      // Get tier 2 picks and sort by turnover by default
      let t2 = [...(groupedPicks[date]?.tier2Picks || [])].sort((a, b) => (b.turnover || 0) - (a.turnover || 0));
      console.log('Original tier 2 picks:', t2.map(s => ({ symbol: s.symbol, turnover: s.turnover }))); // Debug log

      // Apply sector filtering
      if (sectorCodes && sectorCodes.size > 0) {
        console.log('Applying sector filter with codes:', Array.from(sectorCodes)); // Debug log
        t2 = t2.filter((stock: any) => sectorCodes.has(stock.symbol));
        console.log('After sector filtering:', t2.map(s => s.symbol)); // Debug log
      }

      // Filter based on view type
      let filteredStocks = t2;
      if (tier2View === 'movers') {
        filteredStocks = t2.filter((stock: any) => {
          const stat = symbolStats[stock.symbol] || {};
          const ohlcv = ohlcvCache[stock.symbol] || [];
          const peakGain = getPeakGain(stock, stat, ohlcv);
          console.log(`Stock ${stock.symbol} - Peak gain: ${peakGain}, Stats:`, stat); // Debug log
          return peakGain !== null && peakGain > 10;
        });
      } else if (tier2View === 'yet') {
        filteredStocks = t2.filter((stock: any) => {
          const stat = symbolStats[stock.symbol] || {};
          const ohlcv = ohlcvCache[stock.symbol] || [];
          const peakGain = getPeakGain(stock, stat, ohlcv);
          console.log(`Stock ${stock.symbol} - Peak gain: ${peakGain}, Stats:`, stat); // Debug log
          return peakGain === null || peakGain <= 10;
        });
      }
      
      console.log(`Final filtered stocks for ${date}:`, filteredStocks.map(s => s.symbol)); // Debug log
      filtered[date] = filteredStocks;
    });

    setT2FilteredByDate(filtered);
  }, [groupedPicks, symbolStats, ohlcvCache, tier2View, sectorCodes]);

  useEffect(() => {
    if (!selectedSymbol) return;
    const fetchOhlcv = async () => {
      try {
        const res = await fetch(`/api/cse-insights/ohlcv?symbol=${selectedSymbol}`);
        const data = await res.json();
        setOhlcvData(data.ohlcv || []);
      } catch (e) {
        setOhlcvData([]);
      }
    };
    fetchOhlcv();
  }, [selectedSymbol]);

  useEffect(() => {
    fetch('https://cse-maverick-be-platform.onrender.com/sectors')
      .then(res => res.json())
      .then(data => setSectors(data.sectors || []));
  }, []);

  // Filter groupedPicks by sector
  const filteredGroupedPicks = useMemo(() => {
    if (!sectorCodes || selectedSectors.length === sectors.length) return groupedPicks;
    const filterTier = (arr: any[]) => arr.filter((pick: any) => sectorCodes.has(pick.symbol));
    const filtered: any = {};
    Object.entries(groupedPicks).forEach(([date, picks]: any) => {
      filtered[date] = {
        ...picks,
        tier1Picks: filterTier(picks.tier1Picks || []),
        tier2Picks: filterTier(picks.tier2Picks || []),
      };
    });
    return filtered;
  }, [groupedPicks, sectorCodes, selectedSectors, sectors]);

  const selectedSectorSymbols = sectors.find(s => s.sector === selectedSectors[0])?.symbols || [];

  useEffect(() => {
    const sortedDates = Object.keys(groupedPicks || {}).sort((a, b) => b.localeCompare(a));
    if (sortedDates.length === 0) return;
    const mostRecentDate = sortedDates[0];
    const allSymbols = new Set<string>();
    ['tier1Picks', 'tier2Picks'].forEach(tier => {
      (groupedPicks[mostRecentDate]?.[tier] || []).forEach((pick: any) => {
        if (pick?.symbol) allSymbols.add(pick.symbol);
      });
    });
    const symbolsArr = Array.from(allSymbols) as string[];
    if (symbolsArr.length === 0) return;
    fetchOhlcvBatch(symbolsArr);
  }, [groupedPicks]);

  // Helper to get peak gain for a stock
  function getPeakGain(stock: any, stat: any, ohlcv: any[]) {
    const firstDetectedDate = stat.firstDate;
    const firstDetectedPrice = stat.firstPrice;
    const ohlcvFromFirst = ohlcv.filter(d => new Date(d.date) >= new Date(firstDetectedDate));
    if (ohlcvFromFirst.length > 0) {
      let max = ohlcvFromFirst[0];
      for (const d of ohlcvFromFirst) {
        if (d.close > max.close) max = d;
      }
      return ((max.close - firstDetectedPrice) / firstDetectedPrice) * 100;
    }
    return null;
  }

  // Enhance OHLCV batch fetching with deduplication and caching
  const fetchOhlcvBatch = async (symbols: string[]) => {
    // Only fetch symbols not already in cache
    const symbolsToFetch = symbols.filter((symbol) => !ohlcvCache[symbol]);
    if (symbolsToFetch.length === 0) return;
    const BATCH_SIZE = 10;
    let allResults: Record<string, any[]> = {};
    for (let i = 0; i < symbolsToFetch.length; i += BATCH_SIZE) {
      const batch = symbolsToFetch.slice(i, i + BATCH_SIZE);
      try {
        const res = await fetch(`/api/ohlcv-batch?symbols=${batch.join(',')}`);
        const data = await res.json();
        allResults = { ...allResults, ...data };
      } catch (e) {
        // On error, set all in this batch to empty array
        batch.forEach((symbol) => {
          allResults[symbol] = [];
        });
      }
    }
    setOhlcvCache((prev) => ({ ...prev, ...allResults }));
  };

  const handleAddPosition = () => {
    if (!newQuantity.trim() || isNaN(Number(newQuantity)) || Number(newQuantity) <= 0) {
      setPositionError('Please enter a valid quantity');
      return;
    }

    if (!newBesPrice.trim() || isNaN(Number(newBesPrice)) || Number(newBesPrice) <= 0) {
      setPositionError('Please enter a valid BES price');
      return;
    }

    // Get existing positions from localStorage
    const savedPositions = localStorage.getItem('positions');
    const positions = savedPositions ? JSON.parse(savedPositions) : [];

    // Check if symbol already exists in positions
    if (positions.some((item: any) => item.symbol === selectedSymbol)) {
      setPositionError('Symbol already in positions');
      return;
    }

    const newItem = {
      symbol: selectedSymbol.trim().toUpperCase(),
      quantity: Number(newQuantity),
      besPrice: Number(newBesPrice),
      priceAlert: newPriceAlert ? parseFloat(newPriceAlert) : undefined
    };

    // Save updated positions to localStorage
    localStorage.setItem('positions', JSON.stringify([...positions, newItem]));
    window.dispatchEvent(new Event('positions-updated'));

    // Reset form and close dialog
    setNewQuantity('');
    setNewBesPrice('');
    setNewPriceAlert('');
    setAddPositionDialogOpen(false);
    setPositionSuccess('Position added successfully');
  };

  const handleOpenAddPosition = (symbol: string) => {
    setSelectedSymbol(symbol);
    setAddPositionDialogOpen(true);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} isDesktop={isDesktop} />
      <Box sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 } }}>
        <AppBar position="static" color="transparent" elevation={0} sx={{ bgcolor: 'transparent', boxShadow: 'none', borderBottom: '1px solid #eee' }}>
          <Toolbar>
            {!drawerOpen && (
              <IconButton edge="start" aria-label="menu" onClick={() => setDrawerOpen(true)} sx={{ color: '#000' }}>
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700 }}>
              CSE Insights by Maverick 
            </Typography>
            <Tooltip title="Show disclaimer">
              <IconButton onClick={() => setShowDisclaimer((v) => !v)}>
                <InfoOutlined />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh Data">
              <IconButton onClick={refreshData} sx={{ mr: 1 }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
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
          </Toolbar>
        </AppBar>
        {showDisclaimer && (
          <Alert severity="info" sx={{ my: 2 }}>
            <b>Disclaimer:</b> These results curated by AI Powered Algorithm are for informational purposes only. Always conduct your own research and consult with a qualified financial advisor before making any investment decisions.
          </Alert>
        )}
        {showDateInfo && (
          <Alert 
            severity="info" 
            sx={{ my: 2 }} 
            onClose={() => setShowDateInfo(false)}
          >
            <b>Note:</b> The default period is set to display data from the last two weeks. Click the date selector to change this period.
          </Alert>
        )}
        {/* Filters */}
        <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, borderRadius: 2, bgcolor: '#fafdff' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4} md={3}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
                  label="Start Date"
              value={selectedDate}
              onChange={setSelectedDate}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
            />
          </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={8} md={5}>
              <FormControl fullWidth size="small">
            <InputLabel id="sector-select-label">Sectors</InputLabel>
            <Select
              labelId="sector-select-label"
              multiple
              value={selectedSectors}
              label="Sectors"
              onChange={e => setSelectedSectors(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              renderValue={(selected) => {
                if (selected.length === 0 || selected.length === sectors.length) return 'All Sectors';
                if (selected.length <= 3) return selected.join(', ');
                    return `${selected.length} Sectors`;
              }}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 320,
                        background: '#fff',
                  },
                },
              }}
            >
                  <MenuItem key="all" value="__all__">
                    <Checkbox
                      checked={selectedSectors.length === sectors.length && sectors.length > 0}
                      indeterminate={selectedSectors.length > 0 && selectedSectors.length < sectors.length}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedSectors(sectors.map(s => s.sector));
                        } else {
                          setSelectedSectors([]);
                        }
                      }}
                    />
                    <Typography variant="body2">All Sectors</Typography>
                  </MenuItem>
              {[...sectors].sort((a, b) => a.sector.localeCompare(b.sector)).map(s => (
                <MenuItem key={s.sector} value={s.sector}>
                  <Checkbox checked={selectedSectors.indexOf(s.sector) > -1} />
                  {s.sector}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
            </Grid>
            <Grid item xs={12} sm={12} md={2}>
          <Button
            variant="contained"
            color="primary"
                fullWidth
                size="medium"
                sx={{ minWidth: 120, mt: { xs: 1, sm: 0 } }}
            onClick={() => {
              setAppliedSectors(selectedSectors);
              // Debug: log the codes that will be used for filtering
              const codes: string[] = [];
              selectedSectors.forEach(sector => {
                const found = sectors.find(s => s.sector === sector);
                if (found?.symbols && Array.isArray(found.symbols)) {
                  codes.push(...found.symbols);
                }
              });
              console.log('Filtering for codes:', codes);
            }}
          >
                Apply
          </Button>
            </Grid>
            {tab === 1 && (
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Select Symbol</InputLabel>
                  <Select
                    value={selectedSymbol}
                    label="Select Symbol"
                    onChange={(e) => setSelectedSymbol(e.target.value)}
                  >
                    {symbols.map((symbol) => (
                      <MenuItem key={symbol} value={symbol}>
                        {symbol}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </Paper>
        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable" scrollButtons="auto">
          <Tab label="Picks" />
          <Tab label="Charts" />
          <Tab label="Performance" />
        </Tabs>
        {/* Tab Panels */}
        {tab === 0 && (
          <Box>
            {Object.keys(filteredGroupedPicks).sort((a, b) => b.localeCompare(a)).map(date => {
              const t1 = [...(filteredGroupedPicks[date]?.tier1Picks || [])].sort((a, b) => b.turnover - a.turnover);
              const t2 = [...(filteredGroupedPicks[date]?.tier2Picks || [])].sort((a, b) => b.turnover - a.turnover);
              // Debug logs
              console.log('FULL Tier 1 array:', t1);
              console.log('FULL Tier 2 array:', t2);
              console.log('Rendering Tier 1 symbols:', t1.map(stock => stock.symbol));
              console.log('Rendering Tier 2 symbols:', t2.map(stock => stock.symbol));
              console.log('Filtering for codes:', Array.from(sectorCodes || []));
              // Calculate t2Filtered before the JSX
              const t2Filtered = t2FilteredByDate[date] || [];
              let filteredStocks;
              if (selectedSectors.length === sectors.length) {
                // All sectors selected: show all stocks
                filteredStocks = t2Filtered;
              } else {
                filteredStocks = t2Filtered.filter(stock => selectedSectorSymbols.includes(stock.symbol));
              }
              return (
                <Accordion key={date} defaultExpanded={expandedDates.includes(date)} onChange={handleAccordionChange(date)}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Typography variant="h6">{date}</Typography>
                      <MobileTooltip title="Click to view the picks of the day and the Gain til Date">
                        <InfoOutlined sx={{ ml: 1, fontSize: 18, color: 'primary.main' }} />
                      </MobileTooltip>
                      {(pendingOhlcvRequestsByDate[date] && pendingOhlcvRequestsByDate[date].size > 0) && (
                        <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
                          <CircularProgress size={20} sx={{ mr: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            Loading data...
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {t1.length > 0 ? (
                      <>
                    {/* Tier 1 Picks */}
                    <Typography variant="subtitle1" sx={{ mt: 1, mb: 1, display: 'flex', alignItems: 'center' }}>
                      <span role="img" aria-label="star">🌟</span> Tier 1 Picks
                    </Typography>
                    <Grid container spacing={2}>
                      {t1.map((stock: any) => {
                        const stat = symbolStats[stock.symbol] || {};
                        const displayPrice = latestPrices[stock.symbol];
                        const gainTilDate = stat.firstPrice && typeof displayPrice === 'number'
                          ? (((displayPrice - stat.firstPrice) / stat.firstPrice) * 100).toFixed(2)
                          : '-';
                        const count = stat.count || 1;
                        let badgeColor = '#a7f3d0';
                        if (count === 2) badgeColor = '#34d399';
                        else if (count === 3) badgeColor = '#059669';
                        else if (count >= 4) badgeColor = '#065f46';
                        const ohlcv = ohlcvCache[stock.symbol] || [];
                        const isLoading = pendingOhlcvRequestsByDate[date]?.has(stock.symbol);

                        if (isLoading) {
                          return (
                            <Grid item xs={12} sm={6} md={4} key={stock.symbol + stock.date}>
                              <LoadingCard />
                            </Grid>
                          );
                        }

                        // If latest price is undefined, show spinner
                        if (displayPrice === undefined) {
                          return (
                            <Grid item xs={12} sm={6} md={4} key={stock.symbol + stock.date}>
                              <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 2, p: 2, minHeight: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: '#fff', position: 'relative' }}>
                                <CircularProgress />
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Fetching latest price...</Typography>
                              </Card>
                            </Grid>
                          );
                        }

                        const firstDetectedDate = stat.firstDate;
                        const firstDetectedPrice = stat.firstPrice;
                        const ohlcvFromFirst = ohlcv.filter(d => new Date(d.date) >= new Date(firstDetectedDate));
                        let peakGain = null, peakGainDate = null, daysTilPeak = null;
                        if (ohlcvFromFirst.length > 0) {
                          let max = ohlcvFromFirst[0];
                          for (const d of ohlcvFromFirst) {
                            if (d.close > max.close) max = d;
                          }
                          peakGain = ((max.close - firstDetectedPrice) / firstDetectedPrice) * 100;
                          peakGainDate = max.date;
                          daysTilPeak = Math.round((new Date(peakGainDate).getTime() - new Date(firstDetectedDate).getTime()) / (1000 * 60 * 60 * 24));
                        }
                        console.log('OHLCV for', stock.symbol, ohlcv);
                        return (
                          <Grid item xs={12} sm={6} md={4} key={stock.symbol + stock.date}>
                            <Card
                              variant="outlined"
                                  sx={CardStyles}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Typography variant="h6" fontWeight={900} sx={{ flexGrow: 0 }}>
                                  {stock.symbol}
                                </Typography>
                                <Tooltip title="Add to My Positions" placement="top">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenAddPosition(stock.symbol)}
                                    sx={{ ml: 1 }}
                                    aria-label="Add to Positions"
                                  >
                                    <AddIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                {stock.rsi_divergence && stock.rsi_divergence.toLowerCase().includes('bullish divergence') && (
                                  <MobileTooltip title={stock.rsi_divergence}>
                                    <img src="/bull.png" alt="Bullish Divergence" style={{ width: 24, height: 24, marginLeft: 6, verticalAlign: 'middle' }} />
                                  </MobileTooltip>
                                )}
                              </Box>
                              <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <MobileTooltip title="Number of times this stock was detected in the selected period. If multiple detections happen, that means it's more likely to give better capital gains.">
                                      <InfoOutlined sx={InfoIconStyles} />
                                    </MobileTooltip>
                                <Box
                                  sx={{
                                    bgcolor: badgeColor,
                                    color: '#fff',
                                    px: 1.2,
                                    py: 0.2,
                                    borderRadius: 2,
                                    fontWeight: 700,
                                        fontSize: { xs: 14, sm: 15 },
                                    minWidth: 32,
                                    textAlign: 'center',
                                    boxShadow: 1,
                                    border: '2px solid #fff',
                                    letterSpacing: 0.5,
                                    transition: 'background 0.2s',
                                  }}
                                >
                                  {count}x
                                </Box>
                              </Box>
                              <Grid container spacing={0.5} sx={{ mb: 1 }}>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', fontSize: { xs: '0.875rem', sm: '1rem' } }}>Turnover</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>{Number(stock.turnover).toLocaleString()}</Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  Volume Signature
                                      <MobileTooltip title="If High Bullish, very high volume has been trading. If Emerging Bullish, significant volume has been traded.">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>{(stock.volume_analysis || '').replace(/\s*Momentum$/, '')}</Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  Relative Strength
                                      <MobileTooltip title="More than 1 means in the near short term it has performed better than ASI.">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>{stock.relative_strength}</Grid>
                                <Grid item xs={7}>
                                  <span style={{ color: '#ef4444', fontWeight: 500 }}>
                                    First Detected
                                  </span>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  <span style={{ color: '#ef4444', fontWeight: 700 }}>
                                    {formatDate(stat.firstDate)}
                                  </span>
                                </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', fontSize: { xs: '0.875rem', sm: '1rem' } }}>Gain til date</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', color: Number(gainTilDate) > 0 ? 'success.main' : Number(gainTilDate) < 0 ? 'error.main' : 'text.primary', fontWeight: 700, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {gainTilDate !== '0.00' ? `${gainTilDate}%` : '-'}
                                </Grid>
                                    <Grid item xs={7} sx={{ color: '#22c55e', fontWeight: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Peak Gain Date</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', color: '#22c55e', fontWeight: 700, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {peakGainDate && peakGainDate !== stat.firstDate && daysTilPeak !== null && daysTilPeak > 0 ? formatDate(peakGainDate) : '-'}
                                </Grid>
                                    <Grid item xs={7} sx={{ color: '#22c55e', fontWeight: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Days til Peak</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', color: '#22c55e', fontWeight: 700, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {daysTilPeak !== null && daysTilPeak > 0 ? daysTilPeak : '-'}
                                </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      PER
                                      <MobileTooltip title="Price to Earnings Ratio (Price/EPS)">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {stock.eps_ttm && displayPrice 
                                    ? (displayPrice / stock.eps_ttm).toFixed(2) 
                                    : '-'}
                                </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      PBV
                                      <MobileTooltip title="Price to Book Value (Price/BVPS)">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {stock.bvps && displayPrice 
                                    ? (displayPrice / stock.bvps).toFixed(2) 
                                    : '-'}
                                </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  DY(%)
                                      <MobileTooltip title="Dividend Yield (Dividend/Price × 100)">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {stock.dps && displayPrice && displayPrice > 0
                                    ? ((stock.dps / displayPrice) * 100).toFixed(2) + '%'
                                    : '-'}
                                </Grid>
                              </Grid>
                                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', mt: 1, gap: { xs: 1, sm: 2 } }}>
                                    <MobileTooltip title="Latest Close Price">
                                      <InfoOutlined sx={{ fontSize: { xs: 24, sm: 20 }, color: 'primary.main', mr: 1 }} />
                                    </MobileTooltip>
                                    <Typography variant="h5" fontWeight={900} sx={{ color: 'primary.main', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
  {displayPrice === undefined ? (
    <CircularProgress size={18} sx={{ verticalAlign: 'middle' }} />
  ) : displayPrice === null ? (
    'N/A'
  ) : (
    displayPrice.toFixed(2)
  )}
</Typography>
                                {peakGain !== null && peakGain !== 0 && (
                                  <>
                                        <MobileTooltip title="Peak Gain: The highest percentage increase from the first detected price to the highest price reached since detection.">
                                          <InfoOutlined sx={{ fontSize: { xs: 24, sm: 20 }, color: 'success.main', ml: 2, mr: 1 }} />
                                        </MobileTooltip>
                                        <Typography variant="h5" fontWeight={900} sx={{ color: 'success.main', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                                      {peakGain.toFixed(2)}%
                                    </Typography>
                                  </>
                                )}
                              </Box>
                              {ohlcv.length === 0 && (
                                <Typography color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
                                  No price history available for this symbol.
                                </Typography>
                              )}
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>
                    {/* Tier 2 Picks */}
                    <Typography variant="subtitle1" sx={{ mt: 4, mb: 1, display: 'flex', alignItems: 'center' }}>
                      <span role="img" aria-label="diamond">🔹</span> Tier 2 Picks
                    </Typography>
                    <ToggleButtonGroup
                      value={tier2View}
                      exclusive
                      onChange={(_, v) => v && setTier2View(v)}
                      sx={{ width: '100%', mb: 2, display: 'flex', justifyContent: 'center' }}
                    >
                      <ToggleButton value="movers" sx={{ flex: 1, fontWeight: 700, fontSize: 15, p: 1.2 }}>
                        Strong Movers
                      </ToggleButton>
                      <ToggleButton value="yet" sx={{ flex: 1, fontWeight: 700, fontSize: 15, p: 1.2 }}>
                        Yet to Take Off
                      </ToggleButton>
                      <ToggleButton value="all" sx={{ flex: 1, fontWeight: 700, fontSize: 15, p: 1.2 }}>
                        All
                      </ToggleButton>
                    </ToggleButtonGroup>
                    {t2Filtered.length === 0 && (
                      <Typography color="text.secondary" sx={{ mb: 2 }}>No Tier 2 picks for this date.</Typography>
                    )}
                    <Grid container spacing={2}>
                      {tier2View === 'movers' && t2Filtered.slice().sort((a, b) => {
                        const statA = symbolStats[a.symbol] || {};
                        const statB = symbolStats[b.symbol] || {};
                        const countA = statA.count || 1;
                        const countB = statB.count || 1;
                        if (countB !== countA) return countB - countA;
                        const ohlcvA = ohlcvCache[a.symbol] || [];
                        const ohlcvB = ohlcvCache[b.symbol] || [];
                        const peakA = getPeakGain(a, statA, ohlcvA) ?? -Infinity;
                        const peakB = getPeakGain(b, statB, ohlcvB) ?? -Infinity;
                        return peakB - peakA;
                      }).map((stock: any) => {
                        const stat = symbolStats[stock.symbol] || {};
                        const displayPrice = latestPrices[stock.symbol];
                        const gainTilDate = stat.firstPrice && typeof displayPrice === 'number'
                          ? (((displayPrice - stat.firstPrice) / stat.firstPrice) * 100).toFixed(2)
                          : '-';
                        const count = stat.count || 1;
                        let badgeColor = '#a7f3d0';
                        if (count === 2) badgeColor = '#34d399';
                        else if (count === 3) badgeColor = '#059669';
                        else if (count >= 4) badgeColor = '#065f46';
                        const ohlcv = ohlcvCache[stock.symbol] || [];
                        const isLoading = pendingOhlcvRequestsByDate[date]?.has(stock.symbol);

                        if (isLoading) {
                          return (
                            <Grid item xs={12} sm={6} md={4} key={stock.symbol + stock.date}>
                              <LoadingCard />
                            </Grid>
                          );
                        }

                        // If latest price is undefined, show spinner
                        if (displayPrice === undefined) {
                          return (
                            <Grid item xs={12} sm={6} md={4} key={stock.symbol + stock.date}>
                              <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 2, p: 2, minHeight: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: '#fff', position: 'relative' }}>
                                <CircularProgress />
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Fetching latest price...</Typography>
                              </Card>
                            </Grid>
                          );
                        }

                        const firstDetectedDate = stat.firstDate;
                        const firstDetectedPrice = stat.firstPrice;
                        const ohlcvFromFirst = ohlcv.filter(d => new Date(d.date) >= new Date(firstDetectedDate));
                        let peakGain = null, peakGainDate = null, daysTilPeak = null;
                        if (ohlcvFromFirst.length > 0) {
                          let max = ohlcvFromFirst[0];
                          for (const d of ohlcvFromFirst) {
                            if (d.close > max.close) max = d;
                          }
                          peakGain = ((max.close - firstDetectedPrice) / firstDetectedPrice) * 100;
                          peakGainDate = max.date;
                          daysTilPeak = Math.round((new Date(peakGainDate).getTime() - new Date(firstDetectedDate).getTime()) / (1000 * 60 * 60 * 24));
                        }
                        console.log('OHLCV for', stock.symbol, ohlcv);
                        return (
                          <Grid item xs={12} sm={6} md={4} key={stock.symbol + stock.date}>
                            <Card
                              variant="outlined"
                                  sx={CardStyles}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="h6" fontWeight={900} sx={{ flexGrow: 0 }}>
                                      {stock.symbol}
                                    </Typography>
                                    <Tooltip title="Add to My Positions" placement="top">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleOpenAddPosition(stock.symbol)}
                                        sx={{ ml: 1 }}
                                        aria-label="Add to Positions"
                                      >
                                        <AddIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    {stock.rsi_divergence && stock.rsi_divergence.toLowerCase().includes('bullish divergence') && (
                                      <MobileTooltip title={stock.rsi_divergence}>
                                        <img src="/bull.png" alt="Bullish Divergence" style={{ width: 24, height: 24, marginLeft: 6, verticalAlign: 'middle' }} />
                                      </MobileTooltip>
                                    )}
                                  </Box>
                                  <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <MobileTooltip title="More detections usually mean more upside potential.But 3+ may mean the stock has already moved—be cautious.">
                                      <InfoOutlined sx={InfoIconStyles} />
                                    </MobileTooltip>
                                    <Box
                              sx={{
                                        bgcolor: badgeColor,
                                        color: '#fff',
                                        px: 1.2,
                                        py: 0.2,
                                        borderRadius: 2,
                                        fontWeight: 700,
                                        fontSize: { xs: 14, sm: 15 },
                                        minWidth: 32,
                                        textAlign: 'center',
                                        boxShadow: 1,
                                        border: '2px solid #fff',
                                        letterSpacing: 0.5,
                                        transition: 'background 0.2s',
                                      }}
                                    >
                                      {count}x
                                    </Box>
                                  </Box>
                                  <Grid container spacing={0.5} sx={{ mb: 1 }}>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', fontSize: { xs: '0.875rem', sm: '1rem' } }}>Turnover</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>{Number(stock.turnover).toLocaleString()}</Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      Volume Signature
                                      <MobileTooltip title="If High Bullish, very high volume has been trading. If Emerging Bullish, significant volume has been traded.">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                    </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>{(stock.volume_analysis || '').replace(/\s*Momentum$/, '')}</Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      Relative Strength
                                      <MobileTooltip title="More than 1 means in the near short term it has performed better than ASI.">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                    </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>{stock.relative_strength}</Grid>
                                    <Grid item xs={7}>
                                      <span style={{ color: '#ef4444', fontWeight: 500 }}>
                                        First Detected
                                      </span>
                                    </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      <span style={{ color: '#ef4444', fontWeight: 700 }}>
                                        {formatDate(stat.firstDate)}
                                      </span>
                                    </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', fontSize: { xs: '0.875rem', sm: '1rem' } }}>Gain til date</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', color: Number(gainTilDate) > 0 ? 'success.main' : Number(gainTilDate) < 0 ? 'error.main' : 'text.primary', fontWeight: 700, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      {gainTilDate !== '0.00' ? `${gainTilDate}%` : '-'}
                                    </Grid>
                                    <Grid item xs={7} sx={{ color: '#22c55e', fontWeight: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Peak Gain Date</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', color: '#22c55e', fontWeight: 700, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      {peakGainDate && peakGainDate !== stat.firstDate && daysTilPeak !== null && daysTilPeak > 0 ? formatDate(peakGainDate) : '-'}
                                    </Grid>
                                    <Grid item xs={7} sx={{ color: '#22c55e', fontWeight: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Days til Peak</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', color: '#22c55e', fontWeight: 700, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      {daysTilPeak !== null && daysTilPeak > 0 ? daysTilPeak : '-'}
                                    </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      PER
                                      <MobileTooltip title="Price to Earnings Ratio (Price/EPS)">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                    </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      {stock.eps_ttm && displayPrice 
                                        ? (displayPrice / stock.eps_ttm).toFixed(2) 
                                        : '-'}
                                    </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      PBV
                                      <MobileTooltip title="Price to Book Value (Price/BVPS)">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                    </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      {stock.bvps && displayPrice 
                                        ? (displayPrice / stock.bvps).toFixed(2) 
                                        : '-'}
                                    </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      DY(%)
                                      <MobileTooltip title="Dividend Yield (Dividend/Price × 100)">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                    </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      {stock.dps && displayPrice && displayPrice > 0
                                        ? ((stock.dps / displayPrice) * 100).toFixed(2) + '%'
                                        : '-'}
                                    </Grid>
                                  </Grid>
                                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', mt: 1, gap: { xs: 1, sm: 2 } }}>
                                    <MobileTooltip title="Latest Close Price">
                                      <InfoOutlined sx={{ fontSize: { xs: 24, sm: 20 }, color: 'primary.main', mr: 1 }} />
                                    </MobileTooltip>
                                    <Typography variant="h5" fontWeight={900} sx={{ color: 'primary.main', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
  {displayPrice === undefined ? (
    <CircularProgress size={18} sx={{ verticalAlign: 'middle' }} />
  ) : displayPrice === null ? (
    'N/A'
  ) : (
    displayPrice.toFixed(2)
  )}
</Typography>
                                    {peakGain !== null && peakGain !== 0 && (
                                      <>
                                        <MobileTooltip title="Peak Gain: The highest percentage increase from the first detected price to the highest price reached since detection.">
                                          <InfoOutlined sx={{ fontSize: { xs: 24, sm: 20 }, color: 'success.main', ml: 2, mr: 1 }} />
                                        </MobileTooltip>
                                        <Typography variant="h5" fontWeight={900} sx={{ color: 'success.main', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                                          {peakGain.toFixed(2)}%
                                        </Typography>
                                      </>
                                    )}
                                  </Box>
                                  {ohlcv.length === 0 && (
                                    <Typography color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
                                      No price history available for this symbol.
                                    </Typography>
                                  )}
                                </Card>
                              </Grid>
                            );
                          })}
                          {tier2View === 'yet' && t2Filtered.slice().sort((a, b) => {
                            const statA = symbolStats[a.symbol] || {};
                            const statB = symbolStats[b.symbol] || {};
                            const countA = statA.count || 1;
                            const countB = statB.count || 1;
                            if (countB !== countA) return countB - countA;
                            const ohlcvA = ohlcvCache[a.symbol] || [];
                            const ohlcvB = ohlcvCache[b.symbol] || [];
                            const peakA = getPeakGain(a, statA, ohlcvA) ?? Infinity;
                            const peakB = getPeakGain(b, statB, ohlcvB) ?? Infinity;
                            return peakA - peakB;
                          }).map((stock: any) => {
                            const stat = symbolStats[stock.symbol] || {};
                            const displayPrice = latestPrices[stock.symbol];
                            const gainTilDate = stat.firstPrice && typeof displayPrice === 'number'
                              ? (((displayPrice - stat.firstPrice) / stat.firstPrice) * 100).toFixed(2)
                              : '-';
                            const count = stat.count || 1;
                            let badgeColor = '#a7f3d0';
                            if (count === 2) badgeColor = '#34d399';
                            else if (count === 3) badgeColor = '#059669';
                            else if (count >= 4) badgeColor = '#065f46';
                            const ohlcv = ohlcvCache[stock.symbol] || [];
                            const isLoading = pendingOhlcvRequestsByDate[date]?.has(stock.symbol);

                            if (isLoading) {
                              return (
                                <Grid item xs={12} sm={6} md={4} key={stock.symbol + stock.date}>
                                  <LoadingCard />
                                </Grid>
                              );
                            }

                            // If latest price is undefined, show spinner
                            if (displayPrice === undefined) {
                              return (
                                <Grid item xs={12} sm={6} md={4} key={stock.symbol + stock.date}>
                                  <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 2, p: 2, minHeight: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: '#fff', position: 'relative' }}>
                                    <CircularProgress />
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Fetching latest price...</Typography>
                                  </Card>
                                </Grid>
                              );
                            }

                            const firstDetectedDate = stat.firstDate;
                            const firstDetectedPrice = stat.firstPrice;
                            const ohlcvFromFirst = ohlcv.filter(d => new Date(d.date) >= new Date(firstDetectedDate));
                            let peakGain = null, peakGainDate = null, daysTilPeak = null;
                            if (ohlcvFromFirst.length > 0) {
                              let max = ohlcvFromFirst[0];
                              for (const d of ohlcvFromFirst) {
                                if (d.close > max.close) max = d;
                              }
                              peakGain = ((max.close - firstDetectedPrice) / firstDetectedPrice) * 100;
                              peakGainDate = max.date;
                              daysTilPeak = Math.round((new Date(peakGainDate).getTime() - new Date(firstDetectedDate).getTime()) / (1000 * 60 * 60 * 24));
                            }
                            console.log('OHLCV for', stock.symbol, ohlcv);
                            return (
                              <Grid item xs={12} sm={6} md={4} key={stock.symbol + stock.date}>
                                <Card
                                  variant="outlined"
                                  sx={CardStyles}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Typography variant="h6" fontWeight={900} sx={{ flexGrow: 0 }}>
                                  {stock.symbol}
                                </Typography>
                                <Tooltip title="Add to My Positions" placement="top">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenAddPosition(stock.symbol)}
                                    sx={{ ml: 1 }}
                                    aria-label="Add to Positions"
                                  >
                                    <AddIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                {stock.rsi_divergence && stock.rsi_divergence.toLowerCase().includes('bullish divergence') && (
                                  <MobileTooltip title={stock.rsi_divergence}>
                                    <img src="/bull.png" alt="Bullish Divergence" style={{ width: 24, height: 24, marginLeft: 6, verticalAlign: 'middle' }} />
                                  </MobileTooltip>
                                )}
                              </Box>
                              <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <MobileTooltip title="More detections usually mean more upside potential.But 3+ may mean the stock has already moved—be cautious.">
                                      <InfoOutlined sx={InfoIconStyles} />
                                    </MobileTooltip>
                                <Box
                                  sx={{
                                    bgcolor: badgeColor,
                                    color: '#fff',
                                    px: 1.2,
                                    py: 0.2,
                                    borderRadius: 2,
                                    fontWeight: 700,
                                        fontSize: { xs: 14, sm: 15 },
                                    minWidth: 32,
                                    textAlign: 'center',
                                    boxShadow: 1,
                                    border: '2px solid #fff',
                                    letterSpacing: 0.5,
                                    transition: 'background 0.2s',
                                  }}
                                >
                                  {count}x
                                </Box>
                              </Box>
                              <Grid container spacing={0.5} sx={{ mb: 1 }}>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', fontSize: { xs: '0.875rem', sm: '1rem' } }}>Turnover</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>{Number(stock.turnover).toLocaleString()}</Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  Volume Signature
                                      <MobileTooltip title="If High Bullish, very high volume has been trading. If Emerging Bullish, significant volume has been traded.">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>{(stock.volume_analysis || '').replace(/\s*Momentum$/, '')}</Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  Relative Strength
                                      <MobileTooltip title="More than 1 means in the near short term it has performed better than ASI.">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>{stock.relative_strength}</Grid>
                                <Grid item xs={7}>
                                  <span style={{ color: '#ef4444', fontWeight: 500 }}>
                                    First Detected
                                  </span>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  <span style={{ color: '#ef4444', fontWeight: 700 }}>
                                    {formatDate(stat.firstDate)}
                                  </span>
                                </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', fontSize: { xs: '0.875rem', sm: '1rem' } }}>Gain til date</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', color: Number(gainTilDate) > 0 ? 'success.main' : Number(gainTilDate) < 0 ? 'error.main' : 'text.primary', fontWeight: 700, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {gainTilDate !== '0.00' ? `${gainTilDate}%` : '-'}
                                </Grid>
                                    <Grid item xs={7} sx={{ color: '#22c55e', fontWeight: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Peak Gain Date</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', color: '#22c55e', fontWeight: 700, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {peakGainDate && peakGainDate !== stat.firstDate && daysTilPeak !== null && daysTilPeak > 0 ? formatDate(peakGainDate) : '-'}
                                </Grid>
                                    <Grid item xs={7} sx={{ color: '#22c55e', fontWeight: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Days til Peak</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', color: '#22c55e', fontWeight: 700, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {daysTilPeak !== null && daysTilPeak > 0 ? daysTilPeak : '-'}
                                </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      PER
                                      <MobileTooltip title="Price to Earnings Ratio (Price/EPS)">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {stock.eps_ttm && displayPrice 
                                    ? (displayPrice / stock.eps_ttm).toFixed(2) 
                                    : '-'}
                                </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      PBV
                                      <MobileTooltip title="Price to Book Value (Price/BVPS)">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {stock.bvps && displayPrice 
                                    ? (displayPrice / stock.bvps).toFixed(2) 
                                    : '-'}
                                </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  DY(%)
                                      <MobileTooltip title="Dividend Yield (Dividend/Price × 100)">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {stock.dps && displayPrice && displayPrice > 0
                                    ? ((stock.dps / displayPrice) * 100).toFixed(2) + '%'
                                    : '-'}
                                </Grid>
                              </Grid>
                                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', mt: 1, gap: { xs: 1, sm: 2 } }}>
                                    <MobileTooltip title="Latest Close Price">
                                      <InfoOutlined sx={{ fontSize: { xs: 24, sm: 20 }, color: 'primary.main', mr: 1 }} />
                                    </MobileTooltip>
                                    <Typography variant="h5" fontWeight={900} sx={{ color: 'primary.main', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
  {displayPrice === undefined ? (
    <CircularProgress size={18} sx={{ verticalAlign: 'middle' }} />
  ) : displayPrice === null ? (
    'N/A'
  ) : (
    displayPrice.toFixed(2)
  )}
</Typography>
                                    {peakGain !== null && peakGain !== 0 && (
                                      <>
                                        <MobileTooltip title="Peak Gain: The highest percentage increase from the first detected price to the highest price reached since detection.">
                                          <InfoOutlined sx={{ fontSize: { xs: 24, sm: 20 }, color: 'success.main', ml: 2, mr: 1 }} />
                                        </MobileTooltip>
                                        <Typography variant="h5" fontWeight={900} sx={{ color: 'success.main', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                                          {peakGain.toFixed(2)}%
                                        </Typography>
                                      </>
                                    )}
                                  </Box>
                                  {ohlcv.length === 0 && (
                                    <Typography color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
                                      No price history available for this symbol.
                                    </Typography>
                                  )}
                                </Card>
                              </Grid>
                            );
                          })}
                          {tier2View === 'all' && t2Filtered.slice().sort((a, b) => {
                        const statA = symbolStats[a.symbol] || {};
                        const statB = symbolStats[b.symbol] || {};
                        const countA = statA.count || 1;
                        const countB = statB.count || 1;
                        if (countB !== countA) return countB - countA;
                        const ohlcvA = ohlcvCache[a.symbol] || [];
                        const ohlcvB = ohlcvCache[b.symbol] || [];
                        const peakA = getPeakGain(a, statA, ohlcvA) ?? Infinity;
                        const peakB = getPeakGain(b, statB, ohlcvB) ?? Infinity;
                        return peakA - peakB;
                      }).map((stock: any) => {
                        const stat = symbolStats[stock.symbol] || {};
                        const displayPrice = latestPrices[stock.symbol];
                        const gainTilDate = stat.firstPrice && typeof displayPrice === 'number'
                          ? (((displayPrice - stat.firstPrice) / stat.firstPrice) * 100).toFixed(2)
                          : '-';
                        const count = stat.count || 1;
                        let badgeColor = '#a7f3d0';
                        if (count === 2) badgeColor = '#34d399';
                        else if (count === 3) badgeColor = '#059669';
                        else if (count >= 4) badgeColor = '#065f46';
                        const ohlcv = ohlcvCache[stock.symbol] || [];
                        const isLoading = pendingOhlcvRequestsByDate[date]?.has(stock.symbol);

                        if (isLoading) {
                          return (
                            <Grid item xs={12} sm={6} md={4} key={stock.symbol + stock.date}>
                              <LoadingCard />
                            </Grid>
                          );
                        }

                        // If latest price is undefined, show spinner
                        if (displayPrice === undefined) {
                          return (
                            <Grid item xs={12} sm={6} md={4} key={stock.symbol + stock.date}>
                              <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 2, p: 2, minHeight: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: '#fff', position: 'relative' }}>
                                <CircularProgress />
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Fetching latest price...</Typography>
                              </Card>
                            </Grid>
                          );
                        }

                        const firstDetectedDate = stat.firstDate;
                        const firstDetectedPrice = stat.firstPrice;
                        const ohlcvFromFirst = ohlcv.filter(d => new Date(d.date) >= new Date(firstDetectedDate));
                        let peakGain = null, peakGainDate = null, daysTilPeak = null;
                        if (ohlcvFromFirst.length > 0) {
                          let max = ohlcvFromFirst[0];
                          for (const d of ohlcvFromFirst) {
                            if (d.close > max.close) max = d;
                          }
                          peakGain = ((max.close - firstDetectedPrice) / firstDetectedPrice) * 100;
                          peakGainDate = max.date;
                          daysTilPeak = Math.round((new Date(peakGainDate).getTime() - new Date(firstDetectedDate).getTime()) / (1000 * 60 * 60 * 24));
                        }
                        console.log('OHLCV for', stock.symbol, ohlcv);
                        return (
                          <Grid item xs={12} sm={6} md={4} key={stock.symbol + stock.date}>
                            <Card
                              variant="outlined"
                                  sx={CardStyles}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="h6" fontWeight={900} sx={{ flexGrow: 0 }}>
                                      {stock.symbol}
                                    </Typography>
                                    <Tooltip title="Add to My Positions" placement="top">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleOpenAddPosition(stock.symbol)}
                                        sx={{ ml: 1 }}
                                        aria-label="Add to Positions"
                                      >
                                        <AddIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    {stock.rsi_divergence && stock.rsi_divergence.toLowerCase().includes('bullish divergence') && (
                                      <MobileTooltip title={stock.rsi_divergence}>
                                        <img src="/bull.png" alt="Bullish Divergence" style={{ width: 24, height: 24, marginLeft: 6, verticalAlign: 'middle' }} />
                                      </MobileTooltip>
                                    )}
                                  </Box>
                                  <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <MobileTooltip title="More detections usually mean more upside potential.But 3+ may mean the stock has already moved—be cautious.">
                                      <InfoOutlined sx={InfoIconStyles} />
                                    </MobileTooltip>
                                    <Box
                              sx={{
                                        bgcolor: badgeColor,
                                        color: '#fff',
                                        px: 1.2,
                                        py: 0.2,
                                        borderRadius: 2,
                                        fontWeight: 700,
                                        fontSize: { xs: 14, sm: 15 },
                                        minWidth: 32,
                                        textAlign: 'center',
                                        boxShadow: 1,
                                        border: '2px solid #fff',
                                        letterSpacing: 0.5,
                                        transition: 'background 0.2s',
                                      }}
                                    >
                                      {count}x
                                    </Box>
                                  </Box>
                                  <Grid container spacing={0.5} sx={{ mb: 1 }}>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', fontSize: { xs: '0.875rem', sm: '1rem' } }}>Turnover</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>{Number(stock.turnover).toLocaleString()}</Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      Volume Signature
                                      <MobileTooltip title="If High Bullish, very high volume has been trading. If Emerging Bullish, significant volume has been traded.">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                    </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>{(stock.volume_analysis || '').replace(/\s*Momentum$/, '')}</Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      Relative Strength
                                      <MobileTooltip title="More than 1 means in the near short term it has performed better than ASI.">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                    </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>{stock.relative_strength}</Grid>
                                    <Grid item xs={7}>
                                      <span style={{ color: '#ef4444', fontWeight: 500 }}>
                                        First Detected
                                      </span>
                                    </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      <span style={{ color: '#ef4444', fontWeight: 700 }}>
                                        {formatDate(stat.firstDate)}
                                      </span>
                                    </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', fontSize: { xs: '0.875rem', sm: '1rem' } }}>Gain til date</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', color: Number(gainTilDate) > 0 ? 'success.main' : Number(gainTilDate) < 0 ? 'error.main' : 'text.primary', fontWeight: 700, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      {gainTilDate !== '0.00' ? `${gainTilDate}%` : '-'}
                                    </Grid>
                                    <Grid item xs={7} sx={{ color: '#22c55e', fontWeight: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Peak Gain Date</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', color: '#22c55e', fontWeight: 700, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      {peakGainDate && peakGainDate !== stat.firstDate && daysTilPeak !== null && daysTilPeak > 0 ? formatDate(peakGainDate) : '-'}
                                    </Grid>
                                    <Grid item xs={7} sx={{ color: '#22c55e', fontWeight: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Days til Peak</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', color: '#22c55e', fontWeight: 700, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      {daysTilPeak !== null && daysTilPeak > 0 ? daysTilPeak : '-'}
                                    </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      PER
                                      <MobileTooltip title="Price to Earnings Ratio (Price/EPS)">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                    </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      {stock.eps_ttm && displayPrice 
                                        ? (displayPrice / stock.eps_ttm).toFixed(2) 
                                        : '-'}
                                    </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      PBV
                                      <MobileTooltip title="Price to Book Value (Price/BVPS)">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                    </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      {stock.bvps && displayPrice 
                                        ? (displayPrice / stock.bvps).toFixed(2) 
                                        : '-'}
                                    </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      DY(%)
                                      <MobileTooltip title="Dividend Yield (Dividend/Price × 100)">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                    </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      {stock.dps && displayPrice && displayPrice > 0
                                        ? ((stock.dps / displayPrice) * 100).toFixed(2) + '%'
                                        : '-'}
                                    </Grid>
                                  </Grid>
                                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', mt: 1, gap: { xs: 1, sm: 2 } }}>
                                    <MobileTooltip title="Latest Close Price">
                                      <InfoOutlined sx={{ fontSize: { xs: 24, sm: 20 }, color: 'primary.main', mr: 1 }} />
                                    </MobileTooltip>
                                    <Typography variant="h5" fontWeight={900} sx={{ color: 'primary.main', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
  {displayPrice === undefined ? (
    <CircularProgress size={18} sx={{ verticalAlign: 'middle' }} />
  ) : displayPrice === null ? (
    'N/A'
  ) : (
    displayPrice.toFixed(2)
  )}
</Typography>
                                    {peakGain !== null && peakGain !== 0 && (
                                      <>
                                        <MobileTooltip title="Peak Gain: The highest percentage increase from the first detected price to the highest price reached since detection.">
                                          <InfoOutlined sx={{ fontSize: { xs: 24, sm: 20 }, color: 'success.main', ml: 2, mr: 1 }} />
                                        </MobileTooltip>
                                        <Typography variant="h5" fontWeight={900} sx={{ color: 'success.main', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                                          {peakGain.toFixed(2)}%
                                        </Typography>
                                      </>
                                    )}
                                  </Box>
                                  {ohlcv.length === 0 && (
                                    <Typography color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
                                      No price history available for this symbol.
                                    </Typography>
                                  )}
                                </Card>
                              </Grid>
                            );
                          })}
                        </Grid>
                        {/* If both are empty */}
                        {t1.length === 0 && filteredStocks.length === 0 && (
                          <Typography color="text.secondary" sx={{ mt: 2 }}>No picks for this date.</Typography>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Only Tier 2 Picks, no label */}
                        <ToggleButtonGroup
                          value={tier2View}
                          exclusive
                          onChange={(_, v) => v && setTier2View(v)}
                          sx={{ width: '100%', mb: 2, display: 'flex', justifyContent: 'center' }}
                        >
                          <ToggleButton value="movers" sx={{ flex: 1, fontWeight: 700, fontSize: 15, p: 1.2 }}>
                            Strong Movers
                          </ToggleButton>
                          <ToggleButton value="yet" sx={{ flex: 1, fontWeight: 700, fontSize: 15, p: 1.2 }}>
                            Yet to Take Off
                          </ToggleButton>
                          <ToggleButton value="all" sx={{ flex: 1, fontWeight: 700, fontSize: 15, p: 1.2 }}>
                            All
                          </ToggleButton>
                        </ToggleButtonGroup>
                        {t2Filtered.length === 0 && (
                          <Typography color="text.secondary" sx={{ mb: 2 }}>No picks for this date.</Typography>
                        )}
                        <Grid container spacing={2}>
                          {tier2View === 'movers' && t2Filtered.slice().sort((a, b) => {
                            const statA = symbolStats[a.symbol] || {};
                            const statB = symbolStats[b.symbol] || {};
                            const countA = statA.count || 1;
                            const countB = statB.count || 1;
                            if (countB !== countA) return countB - countA;
                            const ohlcvA = ohlcvCache[a.symbol] || [];
                            const ohlcvB = ohlcvCache[b.symbol] || [];
                            const peakA = getPeakGain(a, statA, ohlcvA) ?? -Infinity;
                            const peakB = getPeakGain(b, statB, ohlcvB) ?? -Infinity;
                            return peakB - peakA;
                          }).map((stock: any) => {
                            const stat = symbolStats[stock.symbol] || {};
                            const displayPrice = latestPrices[stock.symbol];
                            const gainTilDate = stat.firstPrice && typeof displayPrice === 'number'
                              ? (((displayPrice - stat.firstPrice) / stat.firstPrice) * 100).toFixed(2)
                              : '-';
                            const count = stat.count || 1;
                            let badgeColor = '#a7f3d0';
                            if (count === 2) badgeColor = '#34d399';
                            else if (count === 3) badgeColor = '#059669';
                            else if (count >= 4) badgeColor = '#065f46';
                            const ohlcv = ohlcvCache[stock.symbol] || [];
                            const isLoading = pendingOhlcvRequestsByDate[date]?.has(stock.symbol);

                            if (isLoading) {
                              return (
                                <Grid item xs={12} sm={6} md={4} key={stock.symbol + stock.date}>
                                  <LoadingCard />
                                </Grid>
                              );
                            }

                            // If latest price is undefined, show spinner
                            if (displayPrice === undefined) {
                              return (
                                <Grid item xs={12} sm={6} md={4} key={stock.symbol + stock.date}>
                                  <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 2, p: 2, minHeight: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: '#fff', position: 'relative' }}>
                                    <CircularProgress />
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Fetching latest price...</Typography>
                                  </Card>
                                </Grid>
                              );
                            }

                            const firstDetectedDate = stat.firstDate;
                            const firstDetectedPrice = stat.firstPrice;
                            const ohlcvFromFirst = ohlcv.filter(d => new Date(d.date) >= new Date(firstDetectedDate));
                            let peakGain = null, peakGainDate = null, daysTilPeak = null;
                            if (ohlcvFromFirst.length > 0) {
                              let max = ohlcvFromFirst[0];
                              for (const d of ohlcvFromFirst) {
                                if (d.close > max.close) max = d;
                              }
                              peakGain = ((max.close - firstDetectedPrice) / firstDetectedPrice) * 100;
                              peakGainDate = max.date;
                              daysTilPeak = Math.round((new Date(peakGainDate).getTime() - new Date(firstDetectedDate).getTime()) / (1000 * 60 * 60 * 24));
                            }
                            console.log('OHLCV for', stock.symbol, ohlcv);
                            return (
                              <Grid item xs={12} sm={6} md={4} key={stock.symbol + stock.date}>
                                <Card
                                  variant="outlined"
                                  sx={CardStyles}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Typography variant="h6" fontWeight={900} sx={{ flexGrow: 0 }}>
                                  {stock.symbol}
                                </Typography>
                                <Tooltip title="Add to My Positions" placement="top">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenAddPosition(stock.symbol)}
                                    sx={{ ml: 1 }}
                                    aria-label="Add to Positions"
                                  >
                                    <AddIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                {stock.rsi_divergence && stock.rsi_divergence.toLowerCase().includes('bullish divergence') && (
                                  <MobileTooltip title={stock.rsi_divergence}>
                                    <img src="/bull.png" alt="Bullish Divergence" style={{ width: 24, height: 24, marginLeft: 6, verticalAlign: 'middle' }} />
                                  </MobileTooltip>
                                )}
                              </Box>
                              <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <MobileTooltip title="More detections usually mean more upside potential.But 3+ may mean the stock has already moved—be cautious.">
                                      <InfoOutlined sx={InfoIconStyles} />
                                    </MobileTooltip>
                                <Box
                                  sx={{
                                    bgcolor: badgeColor,
                                    color: '#fff',
                                    px: 1.2,
                                    py: 0.2,
                                    borderRadius: 2,
                                    fontWeight: 700,
                                        fontSize: { xs: 14, sm: 15 },
                                    minWidth: 32,
                                    textAlign: 'center',
                                    boxShadow: 1,
                                    border: '2px solid #fff',
                                    letterSpacing: 0.5,
                                    transition: 'background 0.2s',
                                  }}
                                >
                                  {count}x
                                </Box>
                              </Box>
                              <Grid container spacing={0.5} sx={{ mb: 1 }}>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', fontSize: { xs: '0.875rem', sm: '1rem' } }}>Turnover</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>{Number(stock.turnover).toLocaleString()}</Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  Volume Signature
                                      <MobileTooltip title="If High Bullish, very high volume has been trading. If Emerging Bullish, significant volume has been traded.">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>{(stock.volume_analysis || '').replace(/\s*Momentum$/, '')}</Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  Relative Strength
                                      <MobileTooltip title="More than 1 means in the near short term it has performed better than ASI.">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>{stock.relative_strength}</Grid>
                                <Grid item xs={7}>
                                  <span style={{ color: '#ef4444', fontWeight: 500 }}>
                                    First Detected
                                  </span>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  <span style={{ color: '#ef4444', fontWeight: 700 }}>
                                    {formatDate(stat.firstDate)}
                                  </span>
                                </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', fontSize: { xs: '0.875rem', sm: '1rem' } }}>Gain til date</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', color: Number(gainTilDate) > 0 ? 'success.main' : Number(gainTilDate) < 0 ? 'error.main' : 'text.primary', fontWeight: 700, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {gainTilDate !== '0.00' ? `${gainTilDate}%` : '-'}
                                </Grid>
                                    <Grid item xs={7} sx={{ color: '#22c55e', fontWeight: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Peak Gain Date</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', color: '#22c55e', fontWeight: 700, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {peakGainDate && peakGainDate !== stat.firstDate && daysTilPeak !== null && daysTilPeak > 0 ? formatDate(peakGainDate) : '-'}
                                </Grid>
                                    <Grid item xs={7} sx={{ color: '#22c55e', fontWeight: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Days til Peak</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', color: '#22c55e', fontWeight: 700, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {daysTilPeak !== null && daysTilPeak > 0 ? daysTilPeak : '-'}
                                </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      PER
                                      <MobileTooltip title="Price to Earnings Ratio (Price/EPS)">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {stock.eps_ttm && displayPrice 
                                    ? (displayPrice / stock.eps_ttm).toFixed(2) 
                                    : '-'}
                                </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      PBV
                                      <MobileTooltip title="Price to Book Value (Price/BVPS)">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {stock.bvps && displayPrice 
                                    ? (displayPrice / stock.bvps).toFixed(2) 
                                    : '-'}
                                </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  DY(%)
                                      <MobileTooltip title="Dividend Yield (Dividend/Price × 100)">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {stock.dps && displayPrice && displayPrice > 0
                                    ? ((stock.dps / displayPrice) * 100).toFixed(2) + '%'
                                    : '-'}
                                </Grid>
                              </Grid>
                                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', mt: 1, gap: { xs: 1, sm: 2 } }}>
                                    <MobileTooltip title="Latest Close Price">
                                      <InfoOutlined sx={{ fontSize: { xs: 24, sm: 20 }, color: 'primary.main', mr: 1 }} />
                                    </MobileTooltip>
                                    <Typography variant="h5" fontWeight={900} sx={{ color: 'primary.main', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
  {displayPrice === undefined ? (
    <CircularProgress size={18} sx={{ verticalAlign: 'middle' }} />
  ) : displayPrice === null ? (
    'N/A'
  ) : (
    displayPrice.toFixed(2)
  )}
</Typography>
                                    {peakGain !== null && peakGain !== 0 && (
                                      <>
                                        <MobileTooltip title="Peak Gain: The highest percentage increase from the first detected price to the highest price reached since detection.">
                                          <InfoOutlined sx={{ fontSize: { xs: 24, sm: 20 }, color: 'success.main', ml: 2, mr: 1 }} />
                                        </MobileTooltip>
                                        <Typography variant="h5" fontWeight={900} sx={{ color: 'success.main', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                                          {peakGain.toFixed(2)}%
                                        </Typography>
                                      </>
                                    )}
                                  </Box>
                                  {ohlcv.length === 0 && (
                                    <Typography color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
                                      No price history available for this symbol.
                                    </Typography>
                                  )}
                                </Card>
                              </Grid>
                            );
                          })}
                          {tier2View === 'yet' && t2Filtered.slice().sort((a, b) => {
                        const statA = symbolStats[a.symbol] || {};
                        const statB = symbolStats[b.symbol] || {};
                        const countA = statA.count || 1;
                        const countB = statB.count || 1;
                        if (countB !== countA) return countB - countA;
                        const ohlcvA = ohlcvCache[a.symbol] || [];
                        const ohlcvB = ohlcvCache[b.symbol] || [];
                        const peakA = getPeakGain(a, statA, ohlcvA) ?? Infinity;
                        const peakB = getPeakGain(b, statB, ohlcvB) ?? Infinity;
                        return peakA - peakB;
                      }).map((stock: any) => {
                        const stat = symbolStats[stock.symbol] || {};
                        const displayPrice = latestPrices[stock.symbol];
                        const gainTilDate = stat.firstPrice && typeof displayPrice === 'number'
                          ? (((displayPrice - stat.firstPrice) / stat.firstPrice) * 100).toFixed(2)
                          : '-';
                        const count = stat.count || 1;
                        let badgeColor = '#a7f3d0';
                        if (count === 2) badgeColor = '#34d399';
                        else if (count === 3) badgeColor = '#059669';
                        else if (count >= 4) badgeColor = '#065f46';
                        const ohlcv = ohlcvCache[stock.symbol] || [];
                        const isLoading = pendingOhlcvRequestsByDate[date]?.has(stock.symbol);

                        if (isLoading) {
                          return (
                            <Grid item xs={12} sm={6} md={4} key={stock.symbol + stock.date}>
                              <LoadingCard />
                            </Grid>
                          );
                        }

                        // If latest price is undefined, show spinner
                        if (displayPrice === undefined) {
                          return (
                            <Grid item xs={12} sm={6} md={4} key={stock.symbol + stock.date}>
                              <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 2, p: 2, minHeight: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: '#fff', position: 'relative' }}>
                                <CircularProgress />
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Fetching latest price...</Typography>
                              </Card>
                            </Grid>
                          );
                        }

                        const firstDetectedDate = stat.firstDate;
                        const firstDetectedPrice = stat.firstPrice;
                        const ohlcvFromFirst = ohlcv.filter(d => new Date(d.date) >= new Date(firstDetectedDate));
                        let peakGain = null, peakGainDate = null, daysTilPeak = null;
                        if (ohlcvFromFirst.length > 0) {
                          let max = ohlcvFromFirst[0];
                          for (const d of ohlcvFromFirst) {
                            if (d.close > max.close) max = d;
                          }
                          peakGain = ((max.close - firstDetectedPrice) / firstDetectedPrice) * 100;
                          peakGainDate = max.date;
                          daysTilPeak = Math.round((new Date(peakGainDate).getTime() - new Date(firstDetectedDate).getTime()) / (1000 * 60 * 60 * 24));
                        }
                        console.log('OHLCV for', stock.symbol, ohlcv);
                        return (
                          <Grid item xs={12} sm={6} md={4} key={stock.symbol + stock.date}>
                            <Card
                              variant="outlined"
                                  sx={CardStyles}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="h6" fontWeight={900} sx={{ flexGrow: 0 }}>
                                      {stock.symbol}
                                    </Typography>
                                    <Tooltip title="Add to My Positions" placement="top">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleOpenAddPosition(stock.symbol)}
                                        sx={{ ml: 1 }}
                                        aria-label="Add to Positions"
                                      >
                                        <AddIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    {stock.rsi_divergence && stock.rsi_divergence.toLowerCase().includes('bullish divergence') && (
                                      <MobileTooltip title={stock.rsi_divergence}>
                                        <img src="/bull.png" alt="Bullish Divergence" style={{ width: 24, height: 24, marginLeft: 6, verticalAlign: 'middle' }} />
                                      </MobileTooltip>
                                    )}
                                  </Box>
                                  <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <MobileTooltip title="More detections usually mean more upside potential.But 3+ may mean the stock has already moved—be cautious.">
                                      <InfoOutlined sx={InfoIconStyles} />
                                    </MobileTooltip>
                                    <Box
                              sx={{
                                        bgcolor: badgeColor,
                                        color: '#fff',
                                        px: 1.2,
                                        py: 0.2,
                                        borderRadius: 2,
                                        fontWeight: 700,
                                        fontSize: { xs: 14, sm: 15 },
                                        minWidth: 32,
                                        textAlign: 'center',
                                        boxShadow: 1,
                                        border: '2px solid #fff',
                                        letterSpacing: 0.5,
                                        transition: 'background 0.2s',
                                      }}
                                    >
                                      {count}x
                                    </Box>
                                  </Box>
                                  <Grid container spacing={0.5} sx={{ mb: 1 }}>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', fontSize: { xs: '0.875rem', sm: '1rem' } }}>Turnover</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>{Number(stock.turnover).toLocaleString()}</Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      Volume Signature
                                      <MobileTooltip title="If High Bullish, very high volume has been trading. If Emerging Bullish, significant volume has been traded.">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                    </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>{(stock.volume_analysis || '').replace(/\s*Momentum$/, '')}</Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      Relative Strength
                                      <MobileTooltip title="More than 1 means in the near short term it has performed better than ASI.">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                    </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>{stock.relative_strength}</Grid>
                                    <Grid item xs={7}>
                                      <span style={{ color: '#ef4444', fontWeight: 500 }}>
                                        First Detected
                                      </span>
                                    </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      <span style={{ color: '#ef4444', fontWeight: 700 }}>
                                        {formatDate(stat.firstDate)}
                                      </span>
                                    </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', fontSize: { xs: '0.875rem', sm: '1rem' } }}>Gain til date</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', color: Number(gainTilDate) > 0 ? 'success.main' : Number(gainTilDate) < 0 ? 'error.main' : 'text.primary', fontWeight: 700, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      {gainTilDate !== '0.00' ? `${gainTilDate}%` : '-'}
                                    </Grid>
                                    <Grid item xs={7} sx={{ color: '#22c55e', fontWeight: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Peak Gain Date</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', color: '#22c55e', fontWeight: 700, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      {peakGainDate && peakGainDate !== stat.firstDate && daysTilPeak !== null && daysTilPeak > 0 ? formatDate(peakGainDate) : '-'}
                                    </Grid>
                                    <Grid item xs={7} sx={{ color: '#22c55e', fontWeight: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Days til Peak</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', color: '#22c55e', fontWeight: 700, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      {daysTilPeak !== null && daysTilPeak > 0 ? daysTilPeak : '-'}
                                    </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      PER
                                      <MobileTooltip title="Price to Earnings Ratio (Price/EPS)">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                    </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      {stock.eps_ttm && displayPrice 
                                        ? (displayPrice / stock.eps_ttm).toFixed(2) 
                                        : '-'}
                                    </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      PBV
                                      <MobileTooltip title="Price to Book Value (Price/BVPS)">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                    </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      {stock.bvps && displayPrice 
                                        ? (displayPrice / stock.bvps).toFixed(2) 
                                        : '-'}
                                    </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      DY(%)
                                      <MobileTooltip title="Dividend Yield (Dividend/Price × 100)">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                    </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      {stock.dps && displayPrice && displayPrice > 0
                                        ? ((stock.dps / displayPrice) * 100).toFixed(2) + '%'
                                        : '-'}
                                    </Grid>
                                  </Grid>
                                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', mt: 1, gap: { xs: 1, sm: 2 } }}>
                                    <MobileTooltip title="Latest Close Price">
                                      <InfoOutlined sx={{ fontSize: { xs: 24, sm: 20 }, color: 'primary.main', mr: 1 }} />
                                    </MobileTooltip>
                                    <Typography variant="h5" fontWeight={900} sx={{ color: 'primary.main', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
  {displayPrice === undefined ? (
    <CircularProgress size={18} sx={{ verticalAlign: 'middle' }} />
  ) : displayPrice === null ? (
    'N/A'
  ) : (
    displayPrice.toFixed(2)
  )}
</Typography>
                                    {peakGain !== null && peakGain !== 0 && (
                                      <>
                                        <MobileTooltip title="Peak Gain: The highest percentage increase from the first detected price to the highest price reached since detection.">
                                          <InfoOutlined sx={{ fontSize: { xs: 24, sm: 20 }, color: 'success.main', ml: 2, mr: 1 }} />
                                        </MobileTooltip>
                                        <Typography variant="h5" fontWeight={900} sx={{ color: 'success.main', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                                          {peakGain.toFixed(2)}%
                                        </Typography>
                                      </>
                                    )}
                                  </Box>
                                  {ohlcv.length === 0 && (
                                    <Typography color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
                                      No price history available for this symbol.
                                    </Typography>
                                  )}
                                </Card>
                              </Grid>
                            );
                          })}
                          {tier2View === 'all' && t2Filtered.slice().sort((a, b) => {
                            const statA = symbolStats[a.symbol] || {};
                            const statB = symbolStats[b.symbol] || {};
                            const countA = statA.count || 1;
                            const countB = statB.count || 1;
                            if (countB !== countA) return countB - countA;
                            const ohlcvA = ohlcvCache[a.symbol] || [];
                            const ohlcvB = ohlcvCache[b.symbol] || [];
                            const peakA = getPeakGain(a, statA, ohlcvA) ?? Infinity;
                            const peakB = getPeakGain(b, statB, ohlcvB) ?? Infinity;
                            return peakA - peakB;
                          }).map((stock: any) => {
                            const stat = symbolStats[stock.symbol] || {};
                            const displayPrice = latestPrices[stock.symbol];
                            const gainTilDate = stat.firstPrice && typeof displayPrice === 'number'
                              ? (((displayPrice - stat.firstPrice) / stat.firstPrice) * 100).toFixed(2)
                              : '-';
                            const count = stat.count || 1;
                            let badgeColor = '#a7f3d0';
                            if (count === 2) badgeColor = '#34d399';
                            else if (count === 3) badgeColor = '#059669';
                            else if (count >= 4) badgeColor = '#065f46';
                            const ohlcv = ohlcvCache[stock.symbol] || [];
                            const isLoading = pendingOhlcvRequestsByDate[date]?.has(stock.symbol);

                            if (isLoading) {
                              return (
                                <Grid item xs={12} sm={6} md={4} key={stock.symbol + stock.date}>
                                  <LoadingCard />
                                </Grid>
                              );
                            }

                            // If latest price is undefined, show spinner
                            if (displayPrice === undefined) {
                              return (
                                <Grid item xs={12} sm={6} md={4} key={stock.symbol + stock.date}>
                                  <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 2, p: 2, minHeight: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: '#fff', position: 'relative' }}>
                                    <CircularProgress />
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Fetching latest price...</Typography>
                                  </Card>
                                </Grid>
                              );
                            }

                            const firstDetectedDate = stat.firstDate;
                            const firstDetectedPrice = stat.firstPrice;
                            const ohlcvFromFirst = ohlcv.filter(d => new Date(d.date) >= new Date(firstDetectedDate));
                            let peakGain = null, peakGainDate = null, daysTilPeak = null;
                            if (ohlcvFromFirst.length > 0) {
                              let max = ohlcvFromFirst[0];
                              for (const d of ohlcvFromFirst) {
                                if (d.close > max.close) max = d;
                              }
                              peakGain = ((max.close - firstDetectedPrice) / firstDetectedPrice) * 100;
                              peakGainDate = max.date;
                              daysTilPeak = Math.round((new Date(peakGainDate).getTime() - new Date(firstDetectedDate).getTime()) / (1000 * 60 * 60 * 24));
                            }
                            console.log('OHLCV for', stock.symbol, ohlcv);
                            return (
                              <Grid item xs={12} sm={6} md={4} key={stock.symbol + stock.date}>
                                <Card
                                  variant="outlined"
                                  sx={CardStyles}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Typography variant="h6" fontWeight={900} sx={{ flexGrow: 0 }}>
                                  {stock.symbol}
                                </Typography>
                                <Tooltip title="Add to My Positions" placement="top">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenAddPosition(stock.symbol)}
                                    sx={{ ml: 1 }}
                                    aria-label="Add to Positions"
                                  >
                                    <AddIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                {stock.rsi_divergence && stock.rsi_divergence.toLowerCase().includes('bullish divergence') && (
                                  <MobileTooltip title={stock.rsi_divergence}>
                                    <img src="/bull.png" alt="Bullish Divergence" style={{ width: 24, height: 24, marginLeft: 6, verticalAlign: 'middle' }} />
                                  </MobileTooltip>
                                )}
                              </Box>
                              <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <MobileTooltip title="More detections usually mean more upside potential.But 3+ may mean the stock has already moved—be cautious.">
                                      <InfoOutlined sx={InfoIconStyles} />
                                    </MobileTooltip>
                                <Box
                                  sx={{
                                    bgcolor: badgeColor,
                                    color: '#fff',
                                    px: 1.2,
                                    py: 0.2,
                                    borderRadius: 2,
                                    fontWeight: 700,
                                        fontSize: { xs: 14, sm: 15 },
                                    minWidth: 32,
                                    textAlign: 'center',
                                    boxShadow: 1,
                                    border: '2px solid #fff',
                                    letterSpacing: 0.5,
                                    transition: 'background 0.2s',
                                  }}
                                >
                                  {count}x
                                </Box>
                              </Box>
                              <Grid container spacing={0.5} sx={{ mb: 1 }}>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', fontSize: { xs: '0.875rem', sm: '1rem' } }}>Turnover</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>{Number(stock.turnover).toLocaleString()}</Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  Volume Signature
                                      <MobileTooltip title="If High Bullish, very high volume has been trading. If Emerging Bullish, significant volume has been traded.">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>{(stock.volume_analysis || '').replace(/\s*Momentum$/, '')}</Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  Relative Strength
                                      <MobileTooltip title="More than 1 means in the near short term it has performed better than ASI.">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>{stock.relative_strength}</Grid>
                                <Grid item xs={7}>
                                  <span style={{ color: '#ef4444', fontWeight: 500 }}>
                                    First Detected
                                  </span>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  <span style={{ color: '#ef4444', fontWeight: 700 }}>
                                    {formatDate(stat.firstDate)}
                                  </span>
                                </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', fontSize: { xs: '0.875rem', sm: '1rem' } }}>Gain til date</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', color: Number(gainTilDate) > 0 ? 'success.main' : Number(gainTilDate) < 0 ? 'error.main' : 'text.primary', fontWeight: 700, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {gainTilDate !== '0.00' ? `${gainTilDate}%` : '-'}
                                </Grid>
                                    <Grid item xs={7} sx={{ color: '#22c55e', fontWeight: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Peak Gain Date</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', color: '#22c55e', fontWeight: 700, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {peakGainDate && peakGainDate !== stat.firstDate && daysTilPeak !== null && daysTilPeak > 0 ? formatDate(peakGainDate) : '-'}
                                </Grid>
                                    <Grid item xs={7} sx={{ color: '#22c55e', fontWeight: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Days til Peak</Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', color: '#22c55e', fontWeight: 700, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {daysTilPeak !== null && daysTilPeak > 0 ? daysTilPeak : '-'}
                                </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      PER
                                      <MobileTooltip title="Price to Earnings Ratio (Price/EPS)">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {stock.eps_ttm && displayPrice 
                                    ? (displayPrice / stock.eps_ttm).toFixed(2) 
                                    : '-'}
                                </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                      PBV
                                      <MobileTooltip title="Price to Book Value (Price/BVPS)">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {stock.bvps && displayPrice 
                                    ? (displayPrice / stock.bvps).toFixed(2) 
                                    : '-'}
                                </Grid>
                                    <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  DY(%)
                                      <MobileTooltip title="Dividend Yield (Dividend/Price × 100)">
                                        <InfoOutlined sx={InfoIconStyles} />
                                      </MobileTooltip>
                                </Grid>
                                    <Grid item xs={5} sx={{ textAlign: 'right', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                  {stock.dps && displayPrice && displayPrice > 0
                                    ? ((stock.dps / displayPrice) * 100).toFixed(2) + '%'
                                    : '-'}
                                </Grid>
                              </Grid>
                                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', mt: 1, gap: { xs: 1, sm: 2 } }}>
                                    <MobileTooltip title="Latest Close Price">
                                      <InfoOutlined sx={{ fontSize: { xs: 24, sm: 20 }, color: 'primary.main', mr: 1 }} />
                                    </MobileTooltip>
                                    <Typography variant="h5" fontWeight={900} sx={{ color: 'primary.main', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
  {displayPrice === undefined ? (
    <CircularProgress size={18} sx={{ verticalAlign: 'middle' }} />
  ) : displayPrice === null ? (
    'N/A'
  ) : (
    displayPrice.toFixed(2)
  )}
</Typography>
                                    {peakGain !== null && peakGain !== 0 && (
                                      <>
                                        <MobileTooltip title="Peak Gain: The highest percentage increase from the first detected price to the highest price reached since detection.">
                                          <InfoOutlined sx={{ fontSize: { xs: 24, sm: 20 }, color: 'success.main', ml: 2, mr: 1 }} />
                                        </MobileTooltip>
                                        <Typography variant="h5" fontWeight={900} sx={{ color: 'success.main', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                                          {peakGain.toFixed(2)}%
                                        </Typography>
                                      </>
                                    )}
                                  </Box>
                                  {ohlcv.length === 0 && (
                                    <Typography color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
                                      No price history available for this symbol.
                                    </Typography>
                                  )}
                                </Card>
                              </Grid>
                            );
                          })}
                        </Grid>
                      </>
                    )}
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        )}
        {tab === 1 && (
          <Box sx={{ mt: 2 }}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
                  <Typography variant="h6">Price & Volume Trend</Typography>
                  <FormControlLabel
                    control={<Switch checked={showCloseLine} onChange={(_, v) => setShowCloseLine(v)} color="primary" />}
                    label="Show Price Trend"
                    sx={{ ml: 2 }}
                  />
                </Box>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart
                    data={ohlcvData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" minTickGap={20} />
                    <YAxis
                      yAxisId="left"
                      orientation="left"
                      domain={['auto', 'auto']}
                      tickFormatter={v => v.toLocaleString()}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 'auto']}
                      tickFormatter={v => v.toLocaleString()}
                    />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar
                      yAxisId="right"
                      dataKey="volume"
                      fill="#26a69a"
                      name="Volume"
                      barSize={8}
                      opacity={0.7}
                    />
                    {showCloseLine && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="close"
                        stroke="#2962FF"
                        dot={false}
                        strokeWidth={2}
                        name="Close Price"
                      />
                    )}
                    <Customized component={(props: any) => <CandlestickLayer {...props} data={ohlcvData} yAxisId="left" />} />
                    <Brush dataKey="date" height={24} stroke="#2962FF" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Box>
        )}
        {tab === 2 && (
          <Box sx={{ mt: 2 }}>
            <PerformanceTab selectedDate={selectedDate} />
          </Box>
        )}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        )}
      </Box>
      {/* Add Position Dialog */}
      <Dialog open={addPositionDialogOpen} onClose={() => setAddPositionDialogOpen(false)}>
        <DialogTitle>Add to Positions</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Symbol: {selectedSymbol}
          </Typography>
          <TextField
            fullWidth
            label="Quantity"
            type="number"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="BES Price"
            type="number"
            value={newBesPrice}
            onChange={(e) => setNewBesPrice(e.target.value)}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Price Alert (optional)"
            type="number"
            value={newPriceAlert}
            onChange={(e) => setNewPriceAlert(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddPositionDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddPosition}
            variant="contained"
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Position Notifications */}
      <Snackbar
        open={!!positionError}
        autoHideDuration={6000}
        onClose={() => setPositionError('')}
      >
        <Alert severity="error" onClose={() => setPositionError('')}>
          {positionError}
        </Alert>
      </Snackbar>
      <Snackbar
        open={!!positionSuccess}
        autoHideDuration={6000}
        onClose={() => setPositionSuccess('')}
      >
        <Alert severity="success" onClose={() => setPositionSuccess('')}>
          {positionSuccess}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function CandlestickLayer(props: any) {
  const { data, yAxisId, xAxisMap, yAxisMap, dataStartIndex, dataEndIndex } = props;
  const yScale = yAxisMap && yAxisMap[yAxisId]?.scale;
  const xScale = xAxisMap && xAxisMap[0]?.scale;
  if (!yScale || !xScale) return null;
  return (
    <g>
      {data.slice(dataStartIndex, dataEndIndex + 1).map((d: any, i: number) => {
        const x = xScale(d.date) - 3;
        const width = 6;
        const yOpen = yScale(d.open);
        const yClose = yScale(d.close);
        const yHigh = yScale(d.high);
        const yLow = yScale(d.low);
        const color = d.close > d.open ? '#26a69a' : '#ef5350';
        return (
          <g key={d.date}>
            <rect x={x + width / 2 - 1} y={Math.min(yHigh, yLow)} width={2} height={Math.abs(yHigh - yLow)} fill={color} />
            <rect x={x} y={Math.min(yOpen, yClose)} width={width} height={Math.max(2, Math.abs(yOpen - yClose))} fill={color} />
          </g>
        );
      })}
    </g>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'white', border: '1px solid #eee', padding: 10, fontSize: 14 }}>
      <div><b>{label}</b></div>
      <div>Open: <b>{d.open?.toLocaleString()}</b></div>
      <div>High: <b>{d.high?.toLocaleString()}</b></div>
      <div>Low: <b>{d.low?.toLocaleString()}</b></div>
      <div>Close: <b>{d.close?.toLocaleString()}</b></div>
      <div>Volume: <b>{d.volume?.toLocaleString()}</b></div>
    </div>
  );
} 

// Add this new component at the end of the file
function PerformanceTab({ selectedDate }: { selectedDate: Date | null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    setError(null);
    const dateStr = selectedDate.toISOString().split('T')[0];
    fetch(`https://cse-maverick-be-platform.onrender.com/pick-performance-analysis?date=${dateStr}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch performance data');
        return res.json();
      })
      .then(setData)
      .catch(() => setError('Failed to load performance data'))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>;
  if (!data) return null;

  const { summary, tier1_picks, tier2_picks } = data.data || {};

  // Determine which stats and picks to show
  const showTier1 = summary?.tier1 && summary.tier1.total_picks > 0 && tier1_picks && tier1_picks.length > 0;
  const showTier2 = summary?.tier2 && summary.tier2.total_picks > 0 && tier2_picks && tier2_picks.length > 0;

  // Prepare sorted picks
  const sortedTier1 = showTier1 ? [...tier1_picks].sort((a, b) => parseFloat(b.peak_gain_pct) - parseFloat(a.peak_gain_pct)) : [];
  const sortedTier2 = showTier2 ? [...tier2_picks].sort((a, b) => parseFloat(b.peak_gain_pct) - parseFloat(a.peak_gain_pct)) : [];

  // Prepare rounded summary values
  const t1 = summary?.tier1 || {};
  const t2 = summary?.tier2 || {};
  const t1AvgDaysToPeak = t1.avg_days_to_peak ? Math.ceil(Number(t1.avg_days_to_peak)) : 0;
  const t1AvgPeakGain = t1.avg_peak_gain ? Math.ceil(Number(t1.avg_peak_gain)) : 0;
  const t1MaxPeakGain = t1.max_peak_gain ? Math.ceil(Number(t1.max_peak_gain)) : 0;
  const t2AvgDaysToPeak = t2.avg_days_to_peak ? Math.ceil(Number(t2.avg_days_to_peak)) : 0;
  const t2AvgPeakGain = t2.avg_peak_gain ? Math.ceil(Number(t2.avg_peak_gain)) : 0;
  const t2MaxPeakGain = t2.max_peak_gain ? Math.ceil(Number(t2.max_peak_gain)) : 0;

  // Calculate total picks, picks above 5%, and hit rate
  let totalPicks = 0;
  let picksAbove5 = 0;
  if (showTier1) {
    totalPicks += sortedTier1.length;
    picksAbove5 += sortedTier1.filter(p => parseFloat(p.peak_gain_pct) > 5).length;
  }
  if (showTier2) {
    totalPicks += sortedTier2.length;
    picksAbove5 += sortedTier2.filter(p => parseFloat(p.peak_gain_pct) > 5).length;
  }
  const hitRate = totalPicks > 0 ? Math.round((picksAbove5 / totalPicks) * 100) : 0;

  // Gather all picks for mode/average calculations
  const allPicks = [
    ...(sortedTier1 || []),
    ...(sortedTier2 || [])
  ];

  // 1. Find the most common days_to_peak for picks with peak_gain_pct > 4.5
  const daysToPeakCounts: Record<number, number> = {};
  allPicks.forEach(pick => {
    const gain = parseFloat(pick.peak_gain_pct);
    const days = Number(pick.days_to_peak);
    if (gain > 4.9) {
      daysToPeakCounts[days] = (daysToPeakCounts[days] || 0) + 1;
    }
  });
  let modeDaysToPeak = null;
  let maxCount = 0;
  for (const [days, count] of Object.entries(daysToPeakCounts)) {
    if (count > maxCount) {
      maxCount = count;
      modeDaysToPeak = Number(days);
    }
  }

  // 2. Calculate average peak gain for picks with days_to_peak == modeDaysToPeak
  let avgPeakGainForMode = 0;
  if (modeDaysToPeak !== null) {
    const relevantPicks = allPicks.filter(pick => Number(pick.days_to_peak) === modeDaysToPeak);
    if (relevantPicks.length > 0) {
      avgPeakGainForMode =
        relevantPicks.reduce((sum, pick) => sum + parseFloat(pick.peak_gain_pct), 0) / relevantPicks.length;
    }
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Performance Summary</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{
            borderRadius: 3,
            boxShadow: 3,
            p: { xs: 2, sm: 3 },
            bgcolor: 'background.paper',
            maxWidth: 420,
            mx: 'auto',
            mb: 2,
            transition: 'box-shadow 0.2s',
            '&:hover': { boxShadow: 6 },
          }}>
            <CardContent>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: '1.1rem', lineHeight: 1.7 }}>
                <li>
                  <MobileTooltip title="The most common number of days it took for a stock to reach more than 5% gain after being picked.">
                    <span style={{ textDecoration: 'underline', textDecorationStyle: 'dotted', cursor: 'pointer' }}>Avg Number of Days to Peak</span>
                  </MobileTooltip>: <b>{modeDaysToPeak !== null ? modeDaysToPeak : '-'}</b>
                </li>
                <li>
                  <MobileTooltip title="The average peak gain for all stocks that reached their peak in the above number of days.">
                    <span style={{ textDecoration: 'underline', textDecorationStyle: 'dotted', cursor: 'pointer' }}>Avg Peak Gain</span>
                  </MobileTooltip>: <b style={{ color: '#22c55e' }}>{modeDaysToPeak !== null ? Math.ceil(avgPeakGainForMode) + '%' : '-'}</b>
                </li>
                <li>Max Peak Gain: <b style={{ color: '#22c55e' }}>
  {allPicks.length > 0 ? Math.ceil(Math.max(...allPicks.map(p => parseFloat(p.peak_gain_pct)))) + '%' : '-'}
</b></li>
              </ul>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{
            borderRadius: 3,
            boxShadow: 3,
            p: { xs: 2, sm: 3 },
            bgcolor: 'background.paper',
            maxWidth: 420,
            mx: 'auto',
            mb: 2,
            transition: 'box-shadow 0.2s',
            '&:hover': { boxShadow: 6 },
          }}>
            <CardContent>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: '1.1rem', lineHeight: 1.7 }}>
                <li>Total Picks: <b>{totalPicks}</b></li>
                <li>Total Picks Above 5%: <b>{picksAbove5}</b></li>
                <li>Hit Rate: <b style={{ color: '#22c55e' }}>{hitRate}%</b></li>
              </ul>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/* Table listings */}
      {showTier1 && (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>Picks</Typography>
          <PerformanceTable picks={sortedTier1} />
        </>
      )}
      {showTier2 && (
        <>
          {!showTier1 && <Typography variant="h6" sx={{ mb: 2 }}>Picks</Typography>}
          <PerformanceTable picks={sortedTier2} />
        </>
      )}
      {!showTier1 && !showTier2 && (
        <Typography color="text.secondary">No picks available for this period.</Typography>
      )}
    </Box>
  );
}

function PerformanceTable({ picks }: { picks: any[] }) {
  const [sortBy, setSortBy] = useState<'symbol' | 'pick_date' | 'pick_price' | 'peak_gain_pct' | 'days_to_peak'>('peak_gain_pct');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  const sorted = [...picks].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    if (sortBy === 'peak_gain_pct' || sortBy === 'pick_price' || sortBy === 'days_to_peak') {
      aVal = parseFloat(aVal);
      bVal = parseFloat(bVal);
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const headerStyle: React.CSSProperties = {
    cursor: 'pointer',
    userSelect: 'none',
    fontWeight: 700,
    fontSize: '1.05rem',
    padding: '1.2rem 0.75rem',
    background: '#f3f4f6',
    borderBottom: '2px solid #e5e7eb',
    position: 'relative',
    textAlign: 'left',
    transition: 'background 0.2s',
    zIndex: 2,
    whiteSpace: 'nowrap',
  };

  const stickyStyle = (left: number): React.CSSProperties => ({
    position: 'sticky',
    left,
    zIndex: 3,
    background: '#f3f4f6',
    boxShadow: '2px 0 4px -2px #e5e7eb',
  });

  const stickyCellStyle = (left: number): React.CSSProperties => ({
    position: 'sticky',
    left,
    zIndex: 1,
    background: '#fff',
    borderRight: '1px solid #e5e7eb',
    fontWeight: 600,
    padding: '1.2rem 0.75rem',
    whiteSpace: 'nowrap',
  });

  return (
    <Paper style={{ width: '100%', overflowX: 'auto', marginBottom: 24, borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef', padding: 0, background: '#fafdff' }}>
      <table
        style={{
          minWidth: 600,
          borderCollapse: 'separate',
          borderSpacing: 0,
          width: '100%',
          fontSize: '1rem',
        }}
      >
        <thead>
          <tr>
            <th onClick={() => handleSort('symbol')} style={{ ...headerStyle, ...stickyStyle(0), minWidth: 120, color: sortBy === 'symbol' ? '#2563eb' : undefined }}>
              Symbol {sortBy === 'symbol' && (sortDir === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
            </th>
            <th onClick={() => handleSort('pick_date')} style={{ ...headerStyle, ...stickyStyle(120), minWidth: 120, color: sortBy === 'pick_date' ? '#2563eb' : undefined }}>
              Pick Date {sortBy === 'pick_date' && (sortDir === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
            </th>
            <th onClick={() => handleSort('pick_price')} style={{ ...headerStyle, color: sortBy === 'pick_price' ? '#2563eb' : undefined }}>
              Pick Price {sortBy === 'pick_price' && (sortDir === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
            </th>
            <th onClick={() => handleSort('peak_gain_pct')} style={{ ...headerStyle, color: sortBy === 'peak_gain_pct' ? '#2563eb' : undefined }}>
              Peak Gain (%) {sortBy === 'peak_gain_pct' && (sortDir === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
            </th>
            <th onClick={() => handleSort('days_to_peak')} style={{ ...headerStyle, color: sortBy === 'days_to_peak' ? '#2563eb' : undefined }}>
              Days to Peak {sortBy === 'days_to_peak' && (sortDir === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, idx) => (
            <tr
              key={row.symbol + row.pick_date + idx}
              style={{
                background: idx % 2 === 0 ? '#fff' : '#f3f4f6',
                borderBottom: '1px solid #e5e7eb',
                transition: 'background 0.2s',
                cursor: 'pointer',
                minHeight: 48,
              }}
            >
              <td style={{ ...stickyCellStyle(0) }}>{row.symbol}</td>
              <td style={{ ...stickyCellStyle(120) }}>{row.pick_date}</td>
              <td style={{ padding: '1.2rem 0.75rem' }}>{row.pick_price}</td>
              <td style={{ padding: '1.2rem 0.75rem', color: '#22c55e', fontWeight: 700 }}>{row.peak_gain_pct}</td>
              <td style={{ padding: '1.2rem 0.75rem' }}>{row.days_to_peak}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Paper>
  );
}