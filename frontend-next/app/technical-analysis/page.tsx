'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Slider, 
  FormControlLabel, CircularProgress, Alert, AppBar, Toolbar,
  IconButton, Paper, Grid, FormGroup, Checkbox, Chip, 
  Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, TextField, Tab, Tabs, useTheme, useMediaQuery,
  FormControl, InputLabel, Select, MenuItem, Divider, ListItemText
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers';
import Sidebar from '../../components/Sidebar';
import RefreshIcon from '@mui/icons-material/Refresh';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PriceChangeIcon from '@mui/icons-material/PriceChange';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { Line } from 'react-chartjs-2';
import format from 'date-fns/format';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Define types for the technical analysis data
interface StockData {
  symbol: string;
  date: string;
  closing_price: number;
  change_pct: number;
  volume: number;
  turnover: number;
  volume_analysis: string;
  rsi: number;
  rsi_divergence: string;
  relative_strength: number;
  ema_20?: number;
  ema_50?: number;
  ema_100?: number;
  ema_200?: number;
  vol_avg_5d?: number;
  vol_avg_20d?: number;
}

// Interface for recurring stock count
interface RecurringStock {
  key: string;
  value: number;
}

// Update sectors state type
type SectorType = { sector: string; codes: string[]; symbols?: string[] };

export default function TechnicalAnalysisPage() {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isMobile = !isDesktop;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [filteredData, setFilteredData] = useState<StockData[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  
  // Filtered data for different tiers
  const [tier1Data, setTier1Data] = useState<StockData[]>([]);
  const [tier2Data, setTier2Data] = useState<StockData[]>([]);
  const [tier3Data, setTier3Data] = useState<StockData[]>([]);
  
  // Date filter state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  // Filter settings
  const [rsiRange, setRsiRange] = useState<[number, number]>([30, 70]);
  const [symbolFilter, setSymbolFilter] = useState<string>('');
  const [divergenceFilter, setDivergenceFilter] = useState<string>('');
  const [volumeAnalysisFilter, setVolumeAnalysisFilter] = useState<string>('');
  const [turnoverFilter, setTurnoverFilter] = useState<string[]>([]);
  const [emaFilters, setEmaFilters] = useState({
    ema20: false,
    ema50: false,
    ema100: false,
    ema200: false
  });

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  } | null>(null);

  // Symbol search state
  const [symbolSearch, setSymbolSearch] = useState<string>('');

  // Add a new state for DIY filtered data
  const [diyFilteredData, setDiyFilteredData] = useState<StockData[]>([]);

  // Sector codes
  const [sectorCodes, setSectorCodes] = useState<Set<string>>(new Set());

  // Add new state variables after existing state declarations
  const [sectors, setSectors] = useState<SectorType[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);

  // Add useEffect to fetch sectors on mount
  useEffect(() => {
    fetch('/api/sectors')
      .then(res => res.json())
      .then(data => setSectors(data.sectors || []));
  }, []);

  // 1. Sort sectors alphabetically before rendering
  const sortedSectors = useMemo(() => [...sectors].sort((a, b) => a.sector.localeCompare(b.sector)), [sectors]);

  // 2. By default, select all sectors on mount
  useEffect(() => {
    if (sectors.length > 0 && selectedSectors.length === 0) {
      setSelectedSectors(sectors.map(s => s.sector));
    }
  }, [sectors]);

  // Add handlers for sector dropdown and Apply Filter
  const handleSectorChange = (event: any) => {
    const value = event.target.value;
    if (value.includes('all')) {
      if (selectedSectors.length === sectors.length) {
        setSelectedSectors([]);
      } else {
        setSelectedSectors(sectors.map(s => s.sector));
      }
    } else {
      setSelectedSectors(value);
    }
  };

  const handleApplySectorFilter = () => {
    const codes = new Set<string>();
    sectors.forEach(sector => {
      if (selectedSectors.includes(sector.sector)) {
        if (Array.isArray(sector.codes)) {
          sector.codes.forEach((code: string) => codes.add(code));
        }
        if (Array.isArray(sector.symbols)) {
          sector.symbols.forEach((code: string) => codes.add(code));
        }
      }
    });
    setSectorCodes(codes);
  };

  // Function to get recurring stocks
  const recurringStocks = (data: StockData[]): RecurringStock[] => {
    const countMap: Record<string, number> = {};
    
    // Count occurrences of each symbol
    data.forEach((stock) => {
      countMap[stock.symbol] = (countMap[stock.symbol] || 0) + 1;
    });
    
    // Convert to array of RecurringStock objects and filter for count >= 2
    return Object.entries(countMap)
      .map(([key, value]) => ({ key, value }))
      .filter((item) => item.value >= 2);
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Function to fetch technical analysis data
  const fetchTechnicalData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching technical analysis data...');
      const response = await fetch('/api/technical-analysis/data', { 
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
      
      console.log(`API response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error fetching data: ${response.status}`, errorText);
        throw new Error(`Error fetching data: ${response.status} - ${errorText}`);
      }
      
      const responseData = await response.json();
      
      if (responseData.error) {
        console.error(`API returned error:`, responseData.error);
        throw new Error(responseData.error);
      }
      
      const fetchedData = responseData.data || [];
      console.log(`Received ${fetchedData.length} technical analysis records`);
      
      if (!fetchedData || !Array.isArray(fetchedData) || fetchedData.length === 0) {
        console.warn('No technical analysis data received or empty array');
        setStockData([]);
        setFilteredData([]);
        setTier1Data([]);
        setTier2Data([]);
        setTier3Data([]);
        setLoading(false);
        return;
      }
      
      // Convert API data to StockData format
      const formattedData: StockData[] = fetchedData.map((item: any) => ({
        symbol: item.symbol || '',
        date: item.date || new Date().toISOString().split('T')[0],
        closing_price: typeof item.closing_price === 'number' ? item.closing_price : 0,
        change_pct: typeof item.change_pct === 'number' ? item.change_pct : 0,
        volume: typeof item.volume === 'number' ? item.volume : 0,
        turnover: typeof item.turnover === 'number' ? item.turnover : 0,
        volume_analysis: item.volume_analysis || 'None',
        rsi: typeof item.rsi === 'number' ? item.rsi : 50,
        rsi_divergence: item.rsi_divergence || 'None',
        relative_strength: typeof item.relative_strength === 'number' ? item.relative_strength : 1,
        ema_20: item.ema_20,
        ema_50: item.ema_50,
        ema_100: item.ema_100,
        ema_200: item.ema_200,
        vol_avg_5d: item.vol_avg_5d,
        vol_avg_20d: item.vol_avg_20d
      }));
      
      setStockData(formattedData);
      setFilteredData(formattedData);
      
      // Filter data for each tier (following Python logic)
      const tier1 = formattedData.filter(stock => 
        ['High Bullish Momentum', 'Emerging Bullish Momentum', 'Increase in weekly Volume Activity Detected'].includes(stock.volume_analysis)
      );
      
      const tier2 = formattedData.filter(stock => 
        ['Bullish Divergence', 'Bearish Divergence'].includes(stock.rsi_divergence)
      );
      
      const tier3 = formattedData.filter(stock => 
        ['Emerging Bullish Momentum', 'High Bullish Momentum'].includes(stock.volume_analysis) &&
        stock.turnover > 999999 &&
        stock.volume > 9999 &&
        stock.relative_strength >= 1
      );
      
      setTier1Data(tier1);
      setTier2Data(tier2);
      setTier3Data(tier3);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch technical analysis data';
      console.error('Error in fetchTechnicalData:', errorMessage, err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount
  // useEffect(() => {
  //   fetchTechnicalData();
  // }, []);

  // Add a refresh function to manually refresh data
  const refreshData = () => {
    fetchTechnicalData();
  };

  // Add a new filterByDateRange function that fetches data for the selected date range
  const filterByDateRange = async () => {
    if (!startDate || !endDate) return;
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/technical-analysis/data?start_date=${startDateStr}&end_date=${endDateStr}`, {
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error fetching data: ${response.status} - ${errorText}`);
      }
      const responseData = await response.json();
      const fetchedData = responseData.data || [];
      // Convert API data to StockData format
      let formattedData = fetchedData.map((item: any) => ({
        symbol: item.symbol || '',
        date: item.date || '',
        closing_price: typeof item.closing_price === 'number' ? item.closing_price : 0,
        change_pct: typeof item.change_pct === 'number' ? item.change_pct : 0,
        volume: typeof item.volume === 'number' ? item.volume : 0,
        turnover: typeof item.turnover === 'number' ? item.turnover : 0,
        volume_analysis: item.volume_analysis || 'None',
        rsi: typeof item.rsi === 'number' ? item.rsi : 50,
        rsi_divergence: item.rsi_divergence || 'None',
        relative_strength: typeof item.relative_strength === 'number' ? item.relative_strength : 1,
        ema_20: item.ema_20,
        ema_50: item.ema_50,
        ema_100: item.ema_100,
        ema_200: item.ema_200,
        vol_avg_5d: item.vol_avg_5d,
        vol_avg_20d: item.vol_avg_20d
      }));
      // Filter by date range (inclusive)
      formattedData = formattedData.filter((stock: StockData) => {
        if (!stock.date) return false;
        const stockDate = new Date(stock.date);
        return stockDate >= startDate && stockDate <= endDate;
      });
      setStockData(formattedData);
      setFilteredData(formattedData);
      // Filter data for each tier (add type annotation for stock)
      const tier1 = formattedData.filter((stock: StockData) => 
        ['High Bullish Momentum', 'Emerging Bullish Momentum', 'Increase in weekly Volume Activity Detected'].includes(stock.volume_analysis)
      );
      const tier2 = formattedData.filter((stock: StockData) => 
        ['Bullish Divergence', 'Bearish Divergence'].includes(stock.rsi_divergence)
      );
      const tier3 = formattedData.filter((stock: StockData) => 
        ['Emerging Bullish Momentum', 'High Bullish Momentum'].includes(stock.volume_analysis) &&
        stock.turnover > 999999 &&
        stock.volume > 9999 &&
        stock.relative_strength >= 1
      );
      setTier1Data(tier1);
      setTier2Data(tier2);
      setTier3Data(tier3);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch technical analysis data with date range filter';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Add a sorting function
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    
    setSortConfig({ key, direction });
  };

  // Add this function after requestSort to get sorted data
  const getSortedData = (data: StockData[]): StockData[] => {
    if (!sortConfig || !data || data.length === 0) return data;
    
    const key = sortConfig.key as keyof StockData;
    const direction = sortConfig.direction;
    
    return [...data].sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];
      
      // Handle missing values (treat them as lowest in sort order)
      if (aValue === undefined || aValue === null) {
        return direction === 'ascending' ? -1 : 1;
      }
      if (bValue === undefined || bValue === null) {
        return direction === 'ascending' ? 1 : -1;
      }
      
      // Compare values
      if (aValue < bValue) {
        return direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  };

  // Create filtered and sorted data for each tier
  const filteredTier1Data = useMemo(() => {
    let filtered = tier1Data;
    
    // Apply symbol search filter if it exists
    if (symbolSearch) {
      filtered = filtered.filter(stock => 
        stock.symbol.toLowerCase().includes(symbolSearch.toLowerCase())
      );
    }
    
    return getSortedData(filtered);
  }, [tier1Data, sortConfig, symbolSearch]);

  const filteredTier2Data = useMemo(() => {
    let filtered = tier2Data;
    
    // Apply symbol search filter if it exists
    if (symbolSearch) {
      filtered = filtered.filter(stock => 
        stock.symbol.toLowerCase().includes(symbolSearch.toLowerCase())
      );
    }
    
    return getSortedData(filtered);
  }, [tier2Data, sortConfig, symbolSearch]);

  const filteredTier3Data = useMemo(() => {
    let filtered = tier3Data;
    
    // Apply symbol search filter if it exists
    if (symbolSearch) {
      filtered = filtered.filter(stock => 
        stock.symbol.toLowerCase().includes(symbolSearch.toLowerCase())
      );
    }
    
    return getSortedData(filtered);
  }, [tier3Data, sortConfig, symbolSearch]);

  const filteredStockData = useMemo(() => {
    let filtered = filteredData;
    
    // Apply symbol search filter if it exists
    if (symbolSearch) {
      filtered = filtered.filter(stock => 
        stock.symbol.toLowerCase().includes(symbolSearch.toLowerCase())
      );
    }
    
    return getSortedData(filtered);
  }, [filteredData, sortConfig, symbolSearch]);

  // Filter stockData by sector
  const filteredStockDataBySector = useMemo(() => {
    if (!sectorCodes) return stockData;
    return stockData.filter(stock => sectorCodes.has(stock.symbol));
  }, [stockData, sectorCodes]);

  // Add a function to apply DIY filters
  const applyDiyFilters = () => {
    // Start with all data from stockData
    let results = stockData;
    console.log(`Starting DIY filter with ${results.length} stocks`);
    
    // Apply symbol filter
    if (symbolFilter) {
      results = results.filter(stock => 
        stock.symbol.toLowerCase().includes(symbolFilter.toLowerCase())
      );
      console.log(`After symbol filter: ${results.length} stocks remaining`);
    }
    
    // Apply RSI range filter
    if (rsiRange && rsiRange.length === 2) {
      results = results.filter(stock => 
        stock.rsi >= rsiRange[0] && stock.rsi <= rsiRange[1]
      );
      console.log(`After RSI filter (${rsiRange[0]}-${rsiRange[1]}): ${results.length} stocks remaining`);
    }
    
    // Apply divergence filter
    if (divergenceFilter) {
      results = results.filter(stock => 
        stock.rsi_divergence === divergenceFilter
      );
      console.log(`After divergence filter (${divergenceFilter}): ${results.length} stocks remaining`);
    }
    
    // Apply volume analysis filter
    if (volumeAnalysisFilter) {
      results = results.filter(stock => 
        stock.volume_analysis === volumeAnalysisFilter
      );
      console.log(`After volume analysis filter (${volumeAnalysisFilter}): ${results.length} stocks remaining`);
    }
    
    // Apply turnover range filter
    if (turnoverFilter.length > 0) {
      results = results.filter(stock => {
        if (turnoverFilter.includes('100K-1M') && stock.turnover >= 100000 && stock.turnover < 1000000) {
          return true;
        }
        if (turnoverFilter.includes('1M-10M') && stock.turnover >= 1000000 && stock.turnover < 10000000) {
          return true;
        }
        if (turnoverFilter.includes('10M-100M') && stock.turnover >= 10000000 && stock.turnover < 100000000) {
          return true;
        }
        if (turnoverFilter.includes('100M+') && stock.turnover >= 100000000) {
          return true;
        }
        return false;
      });
      console.log(`After turnover filter: ${results.length} stocks remaining`);
    }
    
    // Apply EMA filters
    if (Object.values(emaFilters).some(value => value)) {
      results = results.filter(stock => {
        const price = stock.closing_price;
        
        if (emaFilters.ema20 && stock.ema_20 && price < stock.ema_20) {
          return false;
        }
        if (emaFilters.ema50 && stock.ema_50 && price < stock.ema_50) {
          return false;
        }
        if (emaFilters.ema100 && stock.ema_100 && price < stock.ema_100) {
          return false;
        }
        if (emaFilters.ema200 && stock.ema_200 && price < stock.ema_200) {
          return false;
        }
        return true;
      });
      console.log(`After EMA filters: ${results.length} stocks remaining`);
    }
    
    console.log(`Applied DIY filters - found ${results.length} matching stocks`);
    setDiyFilteredData(getSortedData(results));
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f7fafc' }}>
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} isDesktop={isDesktop} />
      
      <Box sx={{ 
        flexGrow: 1, 
        width: '100%', 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Top Bar */}
        <AppBar position="static" color="transparent" elevation={0} sx={{ bgcolor: 'white', boxShadow: 'none', borderBottom: '1px solid #eee', px: { xs: 1, sm: 2 }, mb: { xs: 1, sm: 2 } }}>
          <Toolbar sx={{ justifyContent: 'space-between', gap: 2, minHeight: { xs: 56, sm: 64 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              {!drawerOpen && (
                <IconButton edge="start" aria-label="menu" onClick={() => setDrawerOpen(true)} sx={{ color: '#000', mr: 1, p: { xs: 1, sm: 1.5 } }}>
                  <MenuIcon />
                </IconButton>
              )}
              <Typography variant="h4" fontWeight={800} sx={{ color: '#222', fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
                Technical Analysis
              </Typography>
            </Box>
              <Button 
                variant="contained" 
              startIcon={<AttachMoneyIcon />} 
                sx={{ 
                  textTransform: 'none', 
                  fontWeight: 700, 
                  bgcolor: '#2563eb', 
                  color: '#fff', 
                  borderRadius: 2, 
                px: 1.5,
                py: 0.5,
                minWidth: 0,
                fontSize: { xs: '0.9rem', sm: '1rem' },
                boxShadow: 1,
                height: 40,
                '&:hover': { bgcolor: '#1d4ed8' }
              }}
              href="/#premium"
            >
              Premium
              </Button>
          </Toolbar>
        </AppBar>

        {/* Filters */}
        <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, borderRadius: 3, boxShadow: 2, bgcolor: '#fafdff', maxWidth: 480, mx: 'auto' }}>
          <Grid container spacing={1.5} alignItems="center">
            <Grid item xs={12}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={setStartDate}
                  slotProps={{ textField: { fullWidth: true, size: 'small', sx: { borderRadius: 2, bgcolor: '#fff' } } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={setEndDate}
                  slotProps={{ textField: { fullWidth: true, size: 'small', sx: { borderRadius: 2, bgcolor: '#fff' } } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small" sx={{ bgcolor: '#fff', borderRadius: 2 }}>
              <InputLabel>Sector</InputLabel>
              <Select
                multiple
                value={selectedSectors}
                onChange={handleSectorChange}
                  renderValue={selected => selected.join(', ')}
                  sx={{ minHeight: 44 }}
                MenuProps={{
                  PaperProps: {
                    style: {
                        maxHeight: 240,
                        width: '100%',
                    },
                  },
                }}
              >
                  <MenuItem value="all">
                    <em>All Sectors</em>
                  </MenuItem>
                  {sortedSectors.map(sector => (
                  <MenuItem key={sector.sector} value={sector.sector}>
                    <Checkbox checked={selectedSectors.indexOf(sector.sector) > -1} />
                    <ListItemText primary={sector.sector} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            </Grid>
            <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
                fullWidth
                sx={{ fontWeight: 700, borderRadius: 2, py: 1.2, fontSize: '1rem', minHeight: 44, boxShadow: 1, letterSpacing: 0.5, maxWidth: '100%', overflow: 'hidden', whiteSpace: 'nowrap' }}
                onClick={filterByDateRange}
                aria-label="Apply date filter"
            >
              Apply Filter
            </Button>
            </Grid>
          </Grid>
          <Divider sx={{ mt: 2 }} />
        </Paper>

              {/* Tabs for different analysis sections */}
        <Box sx={{ mb: 3, maxWidth: 520, mx: 'auto', mt: 2 }}>
                <Tabs 
                  value={activeTab} 
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ 
              borderBottom: 2, 
              borderColor: '#2563eb',
                    '& .MuiTab-root': {
                fontSize: { xs: '0.95rem', sm: '1.05rem' },
                      px: { xs: 1, sm: 2 },
                minWidth: { xs: 'auto', sm: 120 },
                fontWeight: 700,
                minHeight: 44
              },
              '& .Mui-selected': {
                color: '#2563eb',
                fontWeight: 800,
                bgcolor: 'rgba(37,99,235,0.07)',
                borderRadius: 2
              },
              mb: 1
            }}
            TabIndicatorProps={{ style: { height: 4, background: '#2563eb', borderRadius: 2 } }}
                >
                  <Tab 
                    label="Bullish Volumes" 
                    icon={<TrendingUpIcon />} 
                    iconPosition="start"
              sx={{ textTransform: 'none' }}
                  />
                  <Tab 
                    label="Potential Reversals" 
                    icon={<PriceChangeIcon />} 
                    iconPosition="start"
              sx={{ textTransform: 'none' }}
                  />
                  <Tab 
                    label="Top Performers" 
                    icon={<ShowChartIcon />} 
                    iconPosition="start"
              sx={{ textTransform: 'none' }}
                  />
                  <Tab 
                    label="DIY Analysis" 
                    icon={<SearchIcon />} 
                    iconPosition="start"
              sx={{ textTransform: 'none' }}
                  />
                </Tabs>
          <Divider sx={{ mb: 2 }} />
              </Box>
              
        {/* Main Content */}
        <Box sx={{ 
          flexGrow: 1, 
          p: { xs: 2, md: 3 }, 
          overflow: 'auto'
        }}>
          {/* Introduction */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              🧭Technical Navigator
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
              An intelligent assistant to help you discover high-potential stocks by leveraging technical analysis tools!
            </Typography>
            <Divider />
          </Box>
          
          {/* Only show data/results if data has been loaded (filteredData.length > 0 or loading/error). Otherwise, show a placeholder message. */}
          {!loading && !error && filteredData.length === 0 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Please select sector(s) and date, then click <b>Apply Filter</b> to load technical analysis data.
            </Alert>
          )}
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          ) : (
            <>
              {/* Tab Content */}
              <Box role="tabpanel" hidden={activeTab !== 0}>
                {activeTab === 0 && (
                  <Box>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                      <TrendingUpIcon color="primary" sx={{ mr: 1 }} /> Bullish Volumes!
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      These are the counters identified to have interesting Volume Signatures.
                    </Typography>
                    
                    {filteredTier1Data.length > 0 ? (
                      <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3, overflowX: 'auto' }}>
                        <Table size="small" aria-label="bullish volumes table">
                          <TableHead>
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                              <TableCell 
                                sx={{ fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => requestSort('date')}
                              >
                                Date
                                {sortConfig?.key === 'date' && (
                                  sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                )}
                              </TableCell>
                              <TableCell 
                                sx={{ fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => requestSort('symbol')}
                              >
                                Symbol
                                {sortConfig?.key === 'symbol' && (
                                  sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                )}
                              </TableCell>
                              <TableCell 
                                sx={{ fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => requestSort('closing_price')}
                              >
                                Close
                                {sortConfig?.key === 'closing_price' && (
                                  sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                )}
                              </TableCell>
                              <TableCell 
                                sx={{ fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => requestSort('change_pct')}
                              >
                                % Change
                                {sortConfig?.key === 'change_pct' && (
                                  sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                )}
                              </TableCell>
                              <TableCell 
                                sx={{ display: { xs: 'none', sm: 'table-cell' }, fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => requestSort('volume')}
                              >
                                Volume
                                {sortConfig?.key === 'volume' && (
                                  sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                )}
                              </TableCell>
                              <TableCell 
                                sx={{ display: { xs: 'none', md: 'table-cell' }, fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => requestSort('turnover')}
                              >
                                Turnover
                                {sortConfig?.key === 'turnover' && (
                                  sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                )}
                              </TableCell>
                              <TableCell 
                                sx={{ fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => requestSort('volume_analysis')}
                              >
                                Volume Analysis
                                {sortConfig?.key === 'volume_analysis' && (
                                  sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                )}
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {filteredTier1Data.map((stock, index) => (
                              <TableRow 
                                key={`${stock.symbol}-${index}`}
                                hover
                                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                              >
                                <TableCell>{new Date(stock.date).toLocaleDateString()}</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#2563eb' }}>{stock.symbol}</TableCell>
                                <TableCell>LKR {stock.closing_price > 0 ? stock.closing_price.toFixed(2) : 'N/A'}</TableCell>
                                <TableCell 
                                  sx={{ 
                                    color: stock.change_pct >= 0 ? 'success.main' : 'error.main',
                                    fontWeight: 600
                                  }}
                                >
                                  {stock.change_pct >= 0 ? '+' : ''}{stock.change_pct.toFixed(2)}%
                                </TableCell>
                                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                                  {stock.volume.toLocaleString()}
                                </TableCell>
                                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                                  {stock.turnover > 0 ? `LKR ${stock.turnover.toLocaleString()}` : 'N/A'}
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={stock.volume_analysis} 
                                    size="small"
                                    color={
                                      stock.volume_analysis === 'High Bullish Momentum' ? 'success' :
                                      stock.volume_analysis === 'Emerging Bullish Momentum' ? 'primary' : 'default'
                                    }
                                    sx={{ 
                                      fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                      height: { xs: 24, sm: 'auto' }
                                    }}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Alert severity="info" sx={{ mb: 3 }}>
                        No stocks found with Bullish Volume signatures in the selected period.
                      </Alert>
                    )}
                    
                    <Box sx={{ mb: 2 }}>

                    </Box>

                    {/* Recurring stocks with Bullish Volume Signatures */}
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                      Stocks with Repeated Bullish Volume Signatures:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                      {recurringStocks(filteredTier1Data).map((record) => (
                        <Chip 
                          key={record.key}
                          label={`${record.key}: ${record.value} times`}
                          color="primary" 
                          variant="outlined" 
                          size="small"
                        />
                      ))}
                    </Box>
                    
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                      * All prices and turnover values are in Sri Lankan Rupees (LKR)
                    </Typography>
                  </Box>
                )}
              </Box>
              
              {/* Potential Reversals Tab */}
              <Box role="tabpanel" hidden={activeTab !== 1}>
                {activeTab === 1 && (
                  <Box>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                      <PriceChangeIcon color="primary" sx={{ mr: 1 }} /> Potential Reversal Ahead!
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Stocks that are showing a potential reversal in price action due to divergence with RSI.
                    </Typography>
                    
                    {filteredTier2Data.length > 0 ? (
                      <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3, overflowX: 'auto' }}>
                        <Table size="small" aria-label="potential reversals table">
                          <TableHead>
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                              <TableCell 
                                sx={{ fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => requestSort('date')}
                              >
                                Date
                                {sortConfig?.key === 'date' && (
                                  sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                )}
                              </TableCell>
                              <TableCell 
                                sx={{ fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => requestSort('symbol')}
                              >
                                Symbol
                                {sortConfig?.key === 'symbol' && (
                                  sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                )}
                              </TableCell>
                              <TableCell 
                                sx={{ fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => requestSort('closing_price')}
                              >
                                Close
                                {sortConfig?.key === 'closing_price' && (
                                  sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                )}
                              </TableCell>
                              <TableCell 
                                sx={{ fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => requestSort('change_pct')}
                              >
                                % Change
                                {sortConfig?.key === 'change_pct' && (
                                  sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                )}
                              </TableCell>
                              <TableCell 
                                sx={{ display: { xs: 'none', md: 'table-cell' }, fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => requestSort('turnover')}
                              >
                                Turnover
                                {sortConfig?.key === 'turnover' && (
                                  sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                )}
                              </TableCell>
                              <TableCell 
                                sx={{ display: { xs: 'none', sm: 'table-cell' }, fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => requestSort('rsi')}
                              >
                                RSI
                                {sortConfig?.key === 'rsi' && (
                                  sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                )}
                              </TableCell>
                              <TableCell 
                                sx={{ fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => requestSort('rsi_divergence')}
                              >
                                RSI Divergence
                                {sortConfig?.key === 'rsi_divergence' && (
                                  sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                )}
                              </TableCell>
                              <TableCell 
                                sx={{ display: { xs: 'none', lg: 'table-cell' }, fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => requestSort('relative_strength')}
                              >
                                Rel. Strength
                                {sortConfig?.key === 'relative_strength' && (
                                  sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                )}
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {filteredTier2Data.map((stock, index) => (
                              <TableRow 
                                key={`${stock.symbol}-${index}`}
                                hover
                                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                              >
                                <TableCell>{new Date(stock.date).toLocaleDateString()}</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#2563eb' }}>{stock.symbol}</TableCell>
                                <TableCell>LKR {stock.closing_price > 0 ? stock.closing_price.toFixed(2) : 'N/A'}</TableCell>
                                <TableCell 
                                  sx={{ 
                                    color: stock.change_pct >= 0 ? 'success.main' : 'error.main',
                                    fontWeight: 600
                                  }}
                                >
                                  {stock.change_pct >= 0 ? '+' : ''}{stock.change_pct.toFixed(2)}%
                                </TableCell>
                                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                                  {stock.turnover > 0 ? `LKR ${stock.turnover.toLocaleString()}` : 'N/A'}
                                </TableCell>
                                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                                  {stock.rsi.toFixed(1)}
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={stock.rsi_divergence} 
                                    size="small"
                                    color={
                                      stock.rsi_divergence === 'Bullish Divergence' ? 'success' :
                                      stock.rsi_divergence === 'Bearish Divergence' ? 'error' : 'default'
                                    }
                                    sx={{ 
                                      fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                      height: { xs: 24, sm: 'auto' }
                                    }}
                                  />
                                </TableCell>
                                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                                  {stock.relative_strength.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Alert severity="info" sx={{ mb: 3 }}>
                        No stocks found with RSI Divergence in the selected period.
                      </Alert>
                    )}
                    
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                      * All prices and turnover values are in Sri Lankan Rupees (LKR)
                    </Typography>
                  </Box>
                )}
              </Box>
              
              {/* Top Performers Tab */}
              <Box role="tabpanel" hidden={activeTab !== 2}>
                {activeTab === 2 && (
                  <Box>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                      <ShowChartIcon color="primary" sx={{ mr: 1 }} /> Top Performers!
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      These are rather liquid Stocks that has registered a Bullish Volume as well as price action stronger than the ASI.
                    </Typography>
                    
                    {filteredTier3Data.length > 0 ? (
                      <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3, overflowX: 'auto' }}>
                        <Table size="small" aria-label="top performers table">
                          <TableHead>
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                              <TableCell 
                                sx={{ fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => requestSort('date')}
                              >
                                Date
                                {sortConfig?.key === 'date' && (
                                  sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                )}
                              </TableCell>
                              <TableCell 
                                sx={{ fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => requestSort('symbol')}
                              >
                                Symbol
                                {sortConfig?.key === 'symbol' && (
                                  sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                )}
                              </TableCell>
                              <TableCell 
                                sx={{ fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => requestSort('closing_price')}
                              >
                                Close
                                {sortConfig?.key === 'closing_price' && (
                                  sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                )}
                              </TableCell>
                              <TableCell 
                                sx={{ fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => requestSort('change_pct')}
                              >
                                % Change
                                {sortConfig?.key === 'change_pct' && (
                                  sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                )}
                              </TableCell>
                              <TableCell 
                                sx={{ display: { xs: 'none', sm: 'table-cell' }, fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => requestSort('volume')}
                              >
                                Volume
                                {sortConfig?.key === 'volume' && (
                                  sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                )}
                              </TableCell>
                              <TableCell 
                                sx={{ display: { xs: 'none', md: 'table-cell' }, fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => requestSort('turnover')}
                              >
                                Turnover
                                {sortConfig?.key === 'turnover' && (
                                  sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                )}
                              </TableCell>
                              <TableCell 
                                sx={{ display: { xs: 'none', lg: 'table-cell' }, fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => requestSort('volume_analysis')}
                              >
                                Volume Analysis
                                {sortConfig?.key === 'volume_analysis' && (
                                  sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                )}
                              </TableCell>
                              <TableCell 
                                sx={{ fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => requestSort('relative_strength')}
                              >
                                Rel. Strength
                                {sortConfig?.key === 'relative_strength' && (
                                  sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                )}
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {filteredTier3Data.map((stock, index) => (
                              <TableRow 
                                key={`${stock.symbol}-${index}`}
                                hover
                                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                              >
                                <TableCell>{new Date(stock.date).toLocaleDateString()}</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#2563eb' }}>{stock.symbol}</TableCell>
                                <TableCell>LKR {stock.closing_price > 0 ? stock.closing_price.toFixed(2) : 'N/A'}</TableCell>
                                <TableCell 
                                  sx={{ 
                                    color: stock.change_pct >= 0 ? 'success.main' : 'error.main',
                                    fontWeight: 600
                                  }}
                                >
                                  {stock.change_pct >= 0 ? '+' : ''}{stock.change_pct.toFixed(2)}%
                                </TableCell>
                                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                                  {stock.volume.toLocaleString()}
                                </TableCell>
                                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                                  {stock.turnover > 0 ? `LKR ${stock.turnover.toLocaleString()}` : 'N/A'}
                                </TableCell>
                                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                                  <Chip 
                                    label={stock.volume_analysis} 
                                    size="small"
                                    color={
                                      stock.volume_analysis === 'High Bullish Momentum' ? 'success' :
                                      stock.volume_analysis === 'Emerging Bullish Momentum' ? 'primary' : 'default'
                                    }
                                    sx={{ 
                                      fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                      height: { xs: 24, sm: 'auto' }
                                    }}
                                  />
                                </TableCell>
                                <TableCell 
                                  sx={{ 
                                    fontWeight: 600,
                                    color: stock.relative_strength >= 1 ? 'success.main' : 'inherit'
                                  }}
                                >
                                  {stock.relative_strength.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Alert severity="info" sx={{ mb: 3 }}>
                        No Top Performing stocks found in the selected period based on the criteria.
                      </Alert>
                    )}
                    
                    {/* Stock Chart Section */}
                    {filteredTier3Data.length > 0 && (
                      <Box sx={{ mt: 4 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                          Closing Price Trend
                        </Typography>
                        <TextField
                          select
                          label="Select Symbol for Chart"
                          value={filteredTier3Data.length > 0 ? filteredTier3Data[0].symbol : ''}
                          onChange={(e) => {}}
                          size="small"
                          sx={{ width: 200, mb: 2 }}
                        >
                          {Array.from(new Set(filteredTier3Data.map(stock => stock.symbol))).map((symbol) => (
                            <MenuItem key={symbol} value={symbol}>
                              {symbol}
                            </MenuItem>
                          ))}
                        </TextField>
                        
                        <Paper
                          elevation={0}
                          variant="outlined"
                          sx={{ p: 2, borderRadius: 2, height: 300 }}
                        >
                          <Box sx={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Typography color="text.secondary">
                              Chart will be displayed here
                            </Typography>
                          </Box>
                        </Paper>
                      </Box>
                    )}
                    
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 4, mb: 2 }}>
                      * All prices and turnover values are in Sri Lankan Rupees (LKR)
                    </Typography>
                  </Box>
                )}
              </Box>
              
              {/* DIY Analysis Tab */}
              <Box role="tabpanel" hidden={activeTab !== 3}>
                {activeTab === 3 && (
                  <Box>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                      <SearchIcon color="primary" sx={{ mr: 1 }} /> DIY & Take Control of Your Analysis
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Use the filters below to invoke your selection criteria. You can filter stocks based on RSI, Divergence, Volume Analysis, and more.
                    </Typography>
                    
                    <Alert severity="info" sx={{ mb: 3 }}>
                      <Typography variant="body2">
                        <strong>Pro Tip:</strong> Combine multiple filters such as "Price Above EMA 200" with "Bullish Divergence" to find stocks with strong technical setups.
                      </Typography>
                    </Alert>

                    <Grid container spacing={3}>
                      {/* Left Column - Filters */}
                      <Grid item xs={12} md={4}>
                        <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
                          <CardContent>
                            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                              Basic Filters
                            </Typography>
                            
                            {/* Symbol Filter */}
                            <FormControl fullWidth margin="dense" size="small">
                              <InputLabel>Symbol</InputLabel>
                              <Select
                                value={symbolFilter}
                                onChange={(e) => setSymbolFilter(e.target.value)}
                                label="Symbol"
                              >
                                <MenuItem value="">
                                  <em>All</em>
                                </MenuItem>
                                {Array.from(new Set(stockData.map(s => s.symbol))).map(symbol => (
                                  <MenuItem key={symbol} value={symbol}>{symbol}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            
                            {/* Divergence Filter */}
                            <FormControl fullWidth margin="dense" size="small">
                              <InputLabel>Divergence</InputLabel>
                              <Select
                                value={divergenceFilter}
                                onChange={(e) => setDivergenceFilter(e.target.value)}
                                label="Divergence"
                              >
                                <MenuItem value="">
                                  <em>All</em>
                                </MenuItem>
                                <MenuItem value="Bullish Divergence">Bullish Divergence</MenuItem>
                                <MenuItem value="Bearish Divergence">Bearish Divergence</MenuItem>
                                <MenuItem value="None">None</MenuItem>
                              </Select>
                            </FormControl>
                            
                            {/* Volume Analysis Filter */}
                            <FormControl fullWidth margin="dense" size="small">
                              <InputLabel>Volume Analysis</InputLabel>
                              <Select
                                value={volumeAnalysisFilter}
                                onChange={(e) => setVolumeAnalysisFilter(e.target.value)}
                                label="Volume Analysis"
                              >
                                <MenuItem value="">
                                  <em>All</em>
                                </MenuItem>
                                <MenuItem value="High Bullish Momentum">High Bullish Momentum</MenuItem>
                                <MenuItem value="Emerging Bullish Momentum">Emerging Bullish Momentum</MenuItem>
                                <MenuItem value="Increase in weekly Volume Activity Detected">Increase in Weekly Volume</MenuItem>
                              </Select>
                            </FormControl>
                          </CardContent>
                        </Card>
                        
                        <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
                          <CardContent>
                            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                              RSI Range
                            </Typography>
                            <Box sx={{ px: 1 }}>
                              <Slider
                                value={rsiRange}
                                onChange={(e, newValue) => setRsiRange(newValue as [number, number])}
                                valueLabelDisplay="auto"
                                min={0}
                                max={100}
                                step={1}
                              />
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">0</Typography>
                                <Typography variant="body2" color="text.secondary">100</Typography>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                        
                        <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
                          <CardContent>
                            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                              Turnover Range
                            </Typography>
                            <FormGroup>
                              <FormControlLabel 
                                control={
                                  <Checkbox 
                                    checked={turnoverFilter.includes('100K-1M')} 
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setTurnoverFilter([...turnoverFilter, '100K-1M']);
                                      } else {
                                        setTurnoverFilter(turnoverFilter.filter(r => r !== '100K-1M'));
                                      }
                                    }}
                                  />
                                } 
                                label="100K-1M" 
                              />
                              <FormControlLabel 
                                control={
                                  <Checkbox 
                                    checked={turnoverFilter.includes('1M-10M')} 
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setTurnoverFilter([...turnoverFilter, '1M-10M']);
                                      } else {
                                        setTurnoverFilter(turnoverFilter.filter(r => r !== '1M-10M'));
                                      }
                                    }}
                                  />
                                } 
                                label="1M-10M" 
                              />
                              <FormControlLabel 
                                control={
                                  <Checkbox 
                                    checked={turnoverFilter.includes('10M-100M')} 
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setTurnoverFilter([...turnoverFilter, '10M-100M']);
                                      } else {
                                        setTurnoverFilter(turnoverFilter.filter(r => r !== '10M-100M'));
                                      }
                                    }}
                                  />
                                } 
                                label="10M-100M" 
                              />
                              <FormControlLabel 
                                control={
                                  <Checkbox 
                                    checked={turnoverFilter.includes('100M+')} 
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setTurnoverFilter([...turnoverFilter, '100M+']);
                                      } else {
                                        setTurnoverFilter(turnoverFilter.filter(r => r !== '100M+'));
                                      }
                                    }}
                                  />
                                } 
                                label="100M+" 
                              />
                            </FormGroup>
                          </CardContent>
                        </Card>
                        
                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                          <CardContent>
                            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                              EMA Checker
                            </Typography>
                            <FormGroup>
                              <FormControlLabel 
                                control={
                                  <Checkbox 
                                    checked={emaFilters.ema20} 
                                    onChange={(e) => setEmaFilters({...emaFilters, ema20: e.target.checked})}
                                  />
                                } 
                                label="Price Above EMA 20" 
                              />
                              <FormControlLabel 
                                control={
                                  <Checkbox 
                                    checked={emaFilters.ema50} 
                                    onChange={(e) => setEmaFilters({...emaFilters, ema50: e.target.checked})}
                                  />
                                } 
                                label="Price Above EMA 50" 
                              />
                              <FormControlLabel 
                                control={
                                  <Checkbox 
                                    checked={emaFilters.ema100} 
                                    onChange={(e) => setEmaFilters({...emaFilters, ema100: e.target.checked})}
                                  />
                                } 
                                label="Price Above EMA 100" 
                              />
                              <FormControlLabel 
                                control={
                                  <Checkbox 
                                    checked={emaFilters.ema200} 
                                    onChange={(e) => setEmaFilters({...emaFilters, ema200: e.target.checked})}
                                  />
                                } 
                                label="Price Above EMA 200" 
                              />
                            </FormGroup>
                          </CardContent>
                        </Card>
                        
                        <Button 
                          variant="contained" 
                          fullWidth 
                          color="primary" 
                          sx={{ mt: 2, py: 1 }}
                          onClick={applyDiyFilters}
                        >
                          Apply Filters
                        </Button>
                      </Grid>
                      
                      {/* Right Column - Results */}
                      <Grid item xs={12} md={8}>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                          Filtered Results
                        </Typography>
                        
                        <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3, overflowX: 'auto' }}>
                          <Table size="small" aria-label="filtered results table">
                            <TableHead>
                              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                <TableCell 
                                  sx={{ fontWeight: 700, cursor: 'pointer' }}
                                  onClick={() => requestSort('date')}
                                >
                                  Date
                                  {sortConfig?.key === 'date' && (
                                    sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                  )}
                                </TableCell>
                                <TableCell 
                                  sx={{ fontWeight: 700, cursor: 'pointer' }}
                                  onClick={() => requestSort('symbol')}
                                >
                                  Symbol
                                  {sortConfig?.key === 'symbol' && (
                                    sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                  )}
                                </TableCell>
                                <TableCell 
                                  sx={{ fontWeight: 700, cursor: 'pointer' }}
                                  onClick={() => requestSort('closing_price')}
                                >
                                  Close
                                  {sortConfig?.key === 'closing_price' && (
                                    sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                  )}
                                </TableCell>
                                <TableCell 
                                  sx={{ fontWeight: 700, cursor: 'pointer' }}
                                  onClick={() => requestSort('change_pct')}
                                >
                                  % Change
                                  {sortConfig?.key === 'change_pct' && (
                                    sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                  )}
                                </TableCell>
                                <TableCell 
                                  sx={{ display: { xs: 'none', sm: 'table-cell' }, fontWeight: 700, cursor: 'pointer' }}
                                  onClick={() => requestSort('rsi')}
                                >
                                  RSI
                                  {sortConfig?.key === 'rsi' && (
                                    sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                  )}
                                </TableCell>
                                <TableCell 
                                  sx={{ display: { xs: 'none', md: 'table-cell' }, fontWeight: 700, cursor: 'pointer' }}
                                  onClick={() => requestSort('turnover')}
                                >
                                  Turnover
                                  {sortConfig?.key === 'turnover' && (
                                    sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                  )}
                                </TableCell>
                                <TableCell 
                                  sx={{ display: { xs: 'none', lg: 'table-cell' }, fontWeight: 700, cursor: 'pointer' }}
                                  onClick={() => requestSort('volume_analysis')}
                                >
                                  Volume Analysis
                                  {sortConfig?.key === 'volume_analysis' && (
                                    sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                  )}
                                </TableCell>
                                <TableCell 
                                  sx={{ fontWeight: 700, cursor: 'pointer' }}
                                  onClick={() => requestSort('relative_strength')}
                                >
                                  RS
                                  {sortConfig?.key === 'relative_strength' && (
                                    sortConfig.direction === 'ascending' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                                  )}
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {diyFilteredData.length > 0 ? diyFilteredData.map((stock, index) => (
                                <TableRow 
                                  key={`${stock.symbol}-${index}`}
                                  hover
                                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                >
                                  <TableCell>{new Date(stock.date).toLocaleDateString()}</TableCell>
                                  <TableCell sx={{ fontWeight: 600, color: '#2563eb' }}>{stock.symbol}</TableCell>
                                  <TableCell>LKR {stock.closing_price > 0 ? stock.closing_price.toFixed(2) : 'N/A'}</TableCell>
                                  <TableCell 
                                    sx={{ 
                                      color: stock.change_pct >= 0 ? 'success.main' : 'error.main',
                                      fontWeight: 600
                                    }}
                                  >
                                    {stock.change_pct >= 0 ? '+' : ''}{stock.change_pct.toFixed(2)}%
                                  </TableCell>
                                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                                    {stock.rsi.toFixed(1)}
                                  </TableCell>
                                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                                    {stock.turnover > 0 ? `LKR ${stock.turnover.toLocaleString()}` : 'N/A'}
                                  </TableCell>
                                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                                    <Chip 
                                      label={stock.volume_analysis} 
                                      size="small"
                                      color={
                                        stock.volume_analysis === 'High Bullish Momentum' ? 'success' :
                                        stock.volume_analysis === 'Emerging Bullish Momentum' ? 'primary' : 'default'
                                      }
                                      sx={{ 
                                        fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                        height: { xs: 24, sm: 'auto' }
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell 
                                    sx={{ 
                                      fontWeight: 600,
                                      color: stock.relative_strength >= 1 ? 'success.main' : 'inherit'
                                    }}
                                  >
                                    {stock.relative_strength.toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              )) : filteredStockDataBySector.slice(0, 10).map((stock, index) => (
                                <TableRow 
                                  key={`${stock.symbol}-${index}`}
                                  hover
                                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                >
                                  <TableCell>{new Date(stock.date).toLocaleDateString()}</TableCell>
                                  <TableCell sx={{ fontWeight: 600, color: '#2563eb' }}>{stock.symbol}</TableCell>
                                  <TableCell>LKR {stock.closing_price > 0 ? stock.closing_price.toFixed(2) : 'N/A'}</TableCell>
                                  <TableCell 
                                    sx={{ 
                                      color: stock.change_pct >= 0 ? 'success.main' : 'error.main',
                                      fontWeight: 600
                                    }}
                                  >
                                    {stock.change_pct >= 0 ? '+' : ''}{stock.change_pct.toFixed(2)}%
                                  </TableCell>
                                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                                    {stock.rsi.toFixed(1)}
                                  </TableCell>
                                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                                    {stock.turnover > 0 ? `LKR ${stock.turnover.toLocaleString()}` : 'N/A'}
                                  </TableCell>
                                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                                    <Chip 
                                      label={stock.volume_analysis} 
                                      size="small"
                                      color={
                                        stock.volume_analysis === 'High Bullish Momentum' ? 'success' :
                                        stock.volume_analysis === 'Emerging Bullish Momentum' ? 'primary' : 'default'
                                      }
                                      sx={{ 
                                        fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                        height: { xs: 24, sm: 'auto' }
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell 
                                    sx={{ 
                                      fontWeight: 600,
                                      color: stock.relative_strength >= 1 ? 'success.main' : 'inherit'
                                    }}
                                  >
                                    {stock.relative_strength.toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Grid>
                    </Grid>
                    
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 4, mb: 2 }}>
                      * All prices and turnover values are in Sri Lankan Rupees (LKR)
                    </Typography>
                  </Box>
                )}
              </Box>
            </>
          )}
          
          {/* Legend section */}
          {!loading && !error && (
            <Box sx={{ mt: 5, mb: 3 }}>
              <Divider sx={{ mb: 3 }} />
              <Typography variant="h5" fontWeight={700} gutterBottom>
                📘 Legend: Understanding Key Terms
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                        📈 Relative Strength (RS)
                      </Typography>
                      <Typography variant="body2" paragraph>
                        A momentum indicator that compares the performance of a stock to the overall market or to the ASI.
                      </Typography>
                      <Typography component="div" variant="body2">
                        <Box component="ul" sx={{ pl: 2, mb: 0 }}>
                          <li><strong>RS ≥ 1</strong>: Indicates the stock is outperforming the market.</li>
                          <li><strong>RS &lt; 1</strong>: Indicates the stock is underperforming the market.</li>
                        </Box>
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                        🔄 Bullish/Bearish Divergence
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Bullish Divergence</strong>: Occurs when the stock's price is making lower lows, but the RSI (Relative Strength Index) is making higher lows. This is a potential signal for a reversal to the upside.
                      </Typography>
                      <Typography variant="body2">
                        <strong>Bearish Divergence</strong>: Occurs when the stock's price is making higher highs, but the RSI is making lower highs. This can signal a potential downward reversal.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                        📊 Volume Analysis Criteria
                      </Typography>
                      <Typography component="div" variant="body2">
                        <Box component="ul" sx={{ pl: 2, mb: 0 }}>
                          <li><strong>Emerging Bullish Momentum</strong>: Indicates a sudden increase in buying activity, compared to their weekly average volumes. Suggesting in start of interest shown to the stock.</li>
                          <li><strong>High Bullish Momentum</strong>: Indicates break-out buying activity, higher volume than their weekly or monthly averages. Suggesting a strong, committed interest in the stock.</li>
                          <li><strong>Increase in Weekly Volume Activity</strong>: Highlights stocks with a gradual increase in trading volume compared to their weekly average.</li>
                        </Box>
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                        📐 EMAs (Exponential Moving Averages)
                      </Typography>
                      <Typography variant="body2" paragraph>
                        A type of moving average that gives more weight to recent prices, making it more responsive to new information.
                      </Typography>
                      <Typography component="div" variant="body2">
                        <Box component="ul" sx={{ pl: 2, mb: 0 }}>
                          <li><strong>EMA 20</strong>: Short-term trend indicator.</li>
                          <li><strong>EMA 50</strong>: Medium-term trend indicator.</li>
                          <li><strong>EMA 100</strong>: Long-term trend indicator.</li>
                          <li><strong>EMA 200</strong>: Very long-term trend indicator, often used to identify major support or resistance levels.</li>
                        </Box>
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              <Typography variant="body2" sx={{ mt: 3, textAlign: 'center', fontStyle: 'italic' }}>
                We hope this helps you better understand the analysis and make informed decisions! 🚀
              </Typography>
            </Box>
          )}
        </Box>
        
        {/* Footer */}
        <Box sx={{ 
          width: '100%', 
          borderTop: '1px solid #eee', 
          py: 2, 
          px: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          fontSize: 14, 
          color: '#888',
          bgcolor: 'white'
        }}>
          <Typography variant="body2" color="text.secondary">
            If you find this information helpful, please consider supporting us on Patreon 💚
          </Typography>
          <Button 
            variant="outlined" 
            size="small" 
            href="https://www.patreon.com/c/CSEMaverick" 
            target="_blank" 
            sx={{ textTransform: 'none' }}
          >
            Support Us
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
