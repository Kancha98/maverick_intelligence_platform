'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Slider, Checkbox,
  FormControlLabel, CircularProgress, Alert, AppBar, Toolbar,
  IconButton, Paper, Grid, FormGroup, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, TableSortLabel, TextField, InputAdornment,
  Select, MenuItem, ListItemText, FormControl, InputLabel, Tooltip, Divider, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import Sidebar from '../../components/Sidebar';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import RefreshIcon from '@mui/icons-material/Refresh';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import HelpOutline from '@mui/icons-material/HelpOutline';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// Define types for the financial metrics
interface FinancialMetric {
  code: string;
  'EPS(TTM)'?: number;
  'Book Value Per Share'?: number;
  'Dividend Per Share'?: number;
  'Cumulative Net Profit'?: number;
  'Return on Equity'?: number;
  'Return on Assets'?: number;
  'Latest Close Price'?: number;
  'PER'?: number;
  'PBV'?: number;
  'DY(%)'?: number;
}

export default function FundamentalAnalysisPage() {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<FinancialMetric[]>([]);
  const [filteredMetrics, setFilteredMetrics] = useState<FinancialMetric[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'code', 'PER', 'PBV', 'DY(%)', 'Latest Close Price'
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorCodes, setSectorCodes] = useState<Set<string>>(new Set());
  const [sectors, setSectors] = useState<{ sector: string; codes: string[]; symbols?: string[] }[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  
  // Define column definitions with labels and default selection status
  const columnDefinitions = [
    { id: 'code', label: 'Symbol', defaultSelected: true },
    { id: 'EPS(TTM)', label: 'EPS (TTM)', defaultSelected: false },
    { id: 'Book Value Per Share', label: 'Book Value Per Share', defaultSelected: false },
    { id: 'Dividend Per Share', label: 'Dividend Per Share', defaultSelected: false },
    { id: 'Cumulative Net Profit', label: 'Cumulative Net Profit', defaultSelected: false },
    { id: 'Return on Equity', label: 'Return on Equity', defaultSelected: false },
    { id: 'Return on Assets', label: 'Return on Assets', defaultSelected: false },
    { id: 'Latest Close Price', label: 'Latest Close Price', defaultSelected: true },
    { id: 'PER', label: 'PER', defaultSelected: true },
    { id: 'PBV', label: 'PBV', defaultSelected: true },
    { id: 'DY(%)', label: 'DY(%)', defaultSelected: true },
  ];
  
  // Slider states for filters
  const [perRange, setPerRange] = useState<[number, number]>([0, 50]);
  const [pbvRange, setPbvRange] = useState<[number, number]>([0, 10]);
  const [dyRange, setDyRange] = useState<[number, number]>([0, 15]);
  
  // Sort state
  const [orderBy, setOrderBy] = useState<string>('DY(%)');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  
  // 1. Sort sectors alphabetically before rendering
  const sortedSectors = useMemo(() => [...sectors].sort((a, b) => a.sector.localeCompare(b.sector)), [sectors]);
  
  // 2. By default, select all sectors on mount
  useEffect(() => {
    if (sectors.length > 0 && selectedSectors.length === 0) {
      setSelectedSectors(sectors.map(s => s.sector));
    }
  }, [sectors]);
  
  // Fetch financial metrics
  const fetchFinancialMetrics = async () => {
    setLoading(true);
    setError(null);
    console.log("Fetching financial metrics...");
    try {
      const response = await fetch('/api/fundamental-analysis/metrics', { 
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
      console.log(`API response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error fetching data: ${response.status}`, errorText);
        throw new Error(`Error fetching data: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log(`Received data:`, data);
      
      if (data.error) {
        console.error(`API returned error:`, data.error);
        throw new Error(data.error);
      }
      
      if (!data.metrics || !Array.isArray(data.metrics)) {
        console.error(`Invalid metrics data:`, data);
        throw new Error('Invalid data format received from API');
      }
      
      console.log(`Received ${data.metrics.length} metrics`);
      setMetrics(data.metrics || []);
      
      // Initialize filters with data ranges
      if (data.metrics && data.metrics.length > 0) {
        // Extract and log the columns from the first record to help debug
        const sampleRecord = data.metrics[0];
        console.log(`Sample record columns:`, Object.keys(sampleRecord));
        
        const perValues = data.metrics
          .map((m: FinancialMetric) => m.PER)
          .filter((v: number | undefined) => v !== undefined && isFinite(v));
        console.log(`Found ${perValues.length} valid PER values`);
        
        const pbvValues = data.metrics
          .map((m: FinancialMetric) => m.PBV)
          .filter((v: number | undefined) => v !== undefined && isFinite(v));
        console.log(`Found ${pbvValues.length} valid PBV values`);
        
        const dyValues = data.metrics
          .map((m: FinancialMetric) => m['DY(%)'])
          .filter((v: number | undefined) => v !== undefined && isFinite(v));
        console.log(`Found ${dyValues.length} valid DY(%) values`);
          
        if (perValues.length > 0) setPerRange([0, Math.min(50, Math.max(...perValues))]);
        if (pbvValues.length > 0) setPbvRange([0, Math.min(10, Math.max(...pbvValues))]);
        if (dyValues.length > 0) setDyRange([0, Math.min(15, Math.max(...dyValues))]);
      } else {
        console.warn('No metrics data received or empty array');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      console.error('Error in fetchFinancialMetrics:', errorMessage, err);
      setError(errorMessage);
    } finally {
      setLoading(false);
      console.log('Financial metrics fetch completed');
    }
  };
  
  // Apply filters to the metrics
  useEffect(() => {
    if (!metrics.length) {
      setFilteredMetrics([]);
      return;
    }
    
    console.log(`Filtering ${metrics.length} metrics with ranges:`, { perRange, pbvRange, dyRange });
    
    try {
      const filtered = metrics.filter((metric) => {
        // Enhanced search filter that handles partial symbols and ignores case
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const code = (metric.code || '').toLowerCase();
          
          // Remove common extensions for search purposes
          const baseCode = code.replace(/\.n\d{4}$/i, '');
          const searchableCode = code;
          
          // Check if search query matches any part of the code
          if (!searchableCode.includes(query) && !baseCode.includes(query)) {
            return false;
          }
        }
        
        // Log if we encounter a record without the expected fields
        if (!metric.code) {
          console.warn('Found metric without code:', metric);
        }
        
        const per = metric.PER;
        const pbv = metric.PBV;
        const dy = metric['DY(%)'];
        
        return (
          (per === undefined || isNaN(per) || (per >= perRange[0] && per <= perRange[1])) &&
          (pbv === undefined || isNaN(pbv) || (pbv >= pbvRange[0] && pbv <= pbvRange[1])) &&
          (dy === undefined || isNaN(dy) || (dy >= dyRange[0] && dy <= dyRange[1]))
        );
      });
      
      console.log(`Filtered down to ${filtered.length} metrics`);
      
      // Apply sorting
      const sorted = [...filtered].sort((a, b) => {
        const valueA = a[orderBy as keyof FinancialMetric];
        const valueB = b[orderBy as keyof FinancialMetric];
        
        // Handle undefined or non-numeric values
        if (valueA === undefined && valueB === undefined) return 0;
        if (valueA === undefined) return order === 'asc' ? -1 : 1;
        if (valueB === undefined) return order === 'asc' ? 1 : -1;
        
        // For string comparison
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          return order === 'asc' 
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        }
        
        // For numeric comparison
        return order === 'asc' 
          ? (valueA as number) - (valueB as number)
          : (valueB as number) - (valueA as number);
      });
      
      console.log(`Sorted by ${orderBy} in ${order} order`);
      setFilteredMetrics(sorted);
    } catch (error) {
      console.error('Error while filtering and sorting metrics:', error);
      // On error, show all metrics without filtering
      setFilteredMetrics(metrics);
    }
  }, [metrics, perRange, pbvRange, dyRange, orderBy, order, searchQuery]);
  
  // Filter metrics by sector
  const filteredMetricsBySector = useMemo(() => {
    if (!sectorCodes) return filteredMetrics;
    return filteredMetrics.filter(m => sectorCodes.has(m.code));
  }, [filteredMetrics, sectorCodes]);
  
  // Initial data fetch
  useEffect(() => {
    fetchFinancialMetrics();
  }, []);
  
  // Handle column selection
  const handleColumnToggle = (columnId: string) => {
    setSelectedColumns(prev => 
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };
  
  // Handle sort request
  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };
  
  // Add a function to clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    
    // Reset ranges based on available data
    if (metrics.length > 0) {
      const perValues = metrics
        .map((m) => m.PER)
        .filter((v): v is number => v !== undefined && !isNaN(v) && isFinite(v));
      const pbvValues = metrics
        .map((m) => m.PBV)
        .filter((v): v is number => v !== undefined && !isNaN(v) && isFinite(v));
      const dyValues = metrics
        .map((m) => m['DY(%)'])
        .filter((v): v is number => v !== undefined && !isNaN(v) && isFinite(v));
        
      if (perValues.length > 0) setPerRange([0, Math.min(50, Math.max(...perValues))]);
      if (pbvValues.length > 0) setPbvRange([0, Math.min(10, Math.max(...pbvValues))]);
      if (dyValues.length > 0) setDyRange([0, Math.min(15, Math.max(...dyValues))]);
    } else {
      // Default ranges if no data
      setPerRange([0, 50]);
      setPbvRange([0, 10]);
      setDyRange([0, 15]);
    }
    
    // Reset selected columns to default
    setSelectedColumns(['code', 'PER', 'PBV', 'DY(%)', 'Latest Close Price']);
  };
  
  // Add useEffect to fetch sectors on mount
  useEffect(() => {
    fetch('/api/sectors')
      .then(res => res.json())
      .then(data => setSectors(data.sectors || []));
  }, []);
  
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
  
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f7fafc', fontFamily: 'Roboto, Arial, sans-serif' }}>
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} isDesktop={isDesktop} />
      <Box sx={{ flexGrow: 1, width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f7fafc' }}>
        <AppBar position="static" color="transparent" elevation={0} sx={{ bgcolor: 'white', boxShadow: 'none', borderBottom: '1px solid #eee', px: 2 }}>
          <Toolbar sx={{ justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {!drawerOpen && (
                <IconButton edge="start" aria-label="menu" onClick={() => setDrawerOpen(true)} sx={{ color: '#000', mr: 2 }}>
                  <MenuIcon />
                </IconButton>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button startIcon={<AccountCircle />} sx={{ textTransform: 'none', fontWeight: 700, color: '#222' }}>Account</Button>
            </Box>
          </Toolbar>
        </AppBar>
        
        {/* Header */}
        <Box sx={{ width: '100%', bgcolor: '#eaf1fb', py: { xs: 4, md: 5 }, px: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h3" fontWeight={800} align="center" sx={{ color: '#222', mb: 1, fontSize: { xs: '1.8rem', md: '2.5rem' } }}>
            Fundamental Analysis <Box component="span" sx={{ color: '#2563eb' }}></Box>
          </Typography>
          <Typography variant="h6" align="center" sx={{ color: '#444', mb: 3, fontWeight: 400, maxWidth: 700 }}>
            Analyze stocks based on key financial metrics and ratios
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<RefreshIcon />}
            onClick={fetchFinancialMetrics}
            sx={{ 
              fontWeight: 700, 
              borderRadius: 2, 
              px: 3, 
              py: 1,
              bgcolor: '#2563eb',
              '&:hover': { bgcolor: '#1d4ed8' }
            }}
          >
            Refresh Data
          </Button>
        </Box>
        
        {/* Main Content */}
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: '100%', overflow: 'auto' }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Loading financial metrics...</Typography>
            </Box>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
              <Button 
                variant="outlined" 
                size="small" 
                onClick={fetchFinancialMetrics} 
                sx={{ ml: 2 }}
              >
                Try Again
              </Button>
            </Alert>
          )}
          
          {!loading && !error && metrics.length === 0 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              No financial metrics data available. Please try refreshing the data.
            </Alert>
          )}
          
          {/* Filters */}
          {!loading && metrics.length > 0 && (
            <>
              <Paper elevation={0} sx={{ p: { xs: 1, sm: 2 }, mb: 2, borderRadius: 2, bgcolor: '#fafdff' }}>
                <Grid container spacing={{ xs: 1, sm: 2 }} alignItems="center">
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small">
                  <InputLabel>Sector</InputLabel>
                  <Select
                    multiple
                    value={selectedSectors}
                    onChange={handleSectorChange}
                    label="Sector"
                    renderValue={(selected) => {
                      if (selected.length === 0 || selected.length === sortedSectors.length) return 'All Sectors';
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
                        <MenuItem key="all" value="all">
                      <Checkbox
                        checked={selectedSectors.length === sortedSectors.length && sortedSectors.length > 0}
                        indeterminate={selectedSectors.length > 0 && selectedSectors.length < sortedSectors.length}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedSectors(sortedSectors.map(s => s.sector));
                          } else {
                            setSelectedSectors([]);
                          }
                        }}
                          />
                          <ListItemText primary="All Sectors" />
                        </MenuItem>
                        {sortedSectors.map((sector) => (
                          <MenuItem key={sector.sector} value={sector.sector}>
                            <Checkbox checked={selectedSectors.indexOf(sector.sector) > -1} />
                            <ListItemText primary={sector.sector} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                <Button
                  variant="contained"
                  color="primary"
                      fullWidth
                      sx={{ mt: { xs: 1, sm: 0 }, fontWeight: 700, borderRadius: 2, py: 1, px: 2, fontSize: { xs: '0.9rem', sm: '1rem' } }}
                  onClick={handleApplySectorFilter}
                      aria-label="Apply sector filter"
                >
                      Apply
                </Button>
                  </Grid>
                  <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  variant="outlined"
                      placeholder="Search by symbol"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                      size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery ? (
                      <InputAdornment position="end">
                            <IconButton aria-label="clear search" onClick={() => setSearchQuery('')} size="small">
                          <ClearIcon />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                      sx={{ mb: { xs: 1, md: 0 } }}
                    />
                  </Grid>
                </Grid>
                <Grid container spacing={{ xs: 1, md: 2 }} sx={{ mt: 1 }}>
                  <Grid item xs={12} md={4}>
                    <Typography gutterBottom fontSize={14} fontWeight={600}>
                      PER
                      <Tooltip title="Price Earnings Ratio (Price/EPS)"><InfoOutlined fontSize="small" sx={{ ml: 0.5 }} /></Tooltip>
                    </Typography>
                      <Slider
                        value={perRange}
                        onChange={(_, newValue) => setPerRange(newValue as [number, number])}
                        valueLabelDisplay="auto"
                        min={0}
                        max={Math.min(100, perRange[1] * 2)}
                      sx={{ color: '#2563eb', mx: 1 }}
                      />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography gutterBottom fontSize={14} fontWeight={600}>
                      PBV
                      <Tooltip title="Price to Book Value (Price/BVPS)"><InfoOutlined fontSize="small" sx={{ ml: 0.5 }} /></Tooltip>
                    </Typography>
                      <Slider
                        value={pbvRange}
                        onChange={(_, newValue) => setPbvRange(newValue as [number, number])}
                        valueLabelDisplay="auto"
                        min={0}
                        max={Math.min(20, pbvRange[1] * 2)}
                      sx={{ color: '#2563eb', mx: 1 }}
                      />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography gutterBottom fontSize={14} fontWeight={600}>
                      DY (%)
                      <Tooltip title="Dividend Yield (Dividend/Price × 100)"><InfoOutlined fontSize="small" sx={{ ml: 0.5 }} /></Tooltip>
                    </Typography>
                      <Slider
                        value={dyRange}
                        onChange={(_, newValue) => setDyRange(newValue as [number, number])}
                        valueLabelDisplay="auto"
                        min={0}
                        max={Math.min(30, dyRange[1] * 2)}
                      sx={{ color: '#2563eb', mx: 1 }}
                      />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<ClearIcon />}
                    onClick={clearAllFilters}
                    sx={{ borderRadius: 2, fontSize: { xs: '0.9rem', sm: '1rem' } }}
                  >
                    Clear All Filters
                  </Button>
                </Box>
              </Paper>
              {/* Column Selection - collapsible */}
              <Paper elevation={0} sx={{ mb: 2, borderRadius: 2, bgcolor: '#fafdff', p: { xs: 1, sm: 2 } }}>
                <Accordion sx={{ boxShadow: 'none', bgcolor: 'transparent' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="column-select-content" id="column-select-header">
                    <Typography fontWeight={700} fontSize={16}>Column Selection</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <FormGroup row sx={{ flexWrap: 'wrap', gap: 2 }}>
                  {columnDefinitions.map(column => (
                    <FormControlLabel
                      key={column.id}
                      control={
                        <Checkbox
                          checked={selectedColumns.includes(column.id)}
                          onChange={() => handleColumnToggle(column.id)}
                          color="primary"
                        />
                      }
                      label={column.label}
                    />
                  ))}
                </FormGroup>
                  </AccordionDetails>
                </Accordion>
              </Paper>
              <Divider sx={{ mb: 2 }} />
            </>
          )}
              
              {/* Results Table */}
              <Paper elevation={0} sx={{ p: { xs: 0, sm: 1, md: 2 }, borderRadius: 2, mb: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ px: 2, pt: 2 }}>
                  Financial Metrics Results
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {searchQuery ? `Showing results for "${searchQuery}"` : ''} 
                    {filteredMetricsBySector.length} of {metrics.length} stocks
                  </Typography>
                </Typography>
                
                <TableContainer sx={{ maxHeight: { xs: 400, md: 600 }, overflowX: 'auto' }}>
                  <Table stickyHeader sx={{ minWidth: 650 }} size="small">
                    <TableHead>
                      <TableRow>
                        {selectedColumns.map(columnId => {
                          const column = columnDefinitions.find(c => c.id === columnId);
                          return column ? (
                            <TableCell 
                              key={column.id}
                              sortDirection={orderBy === column.id ? order : false}
                              sx={{ 
                                fontWeight: 'bold', 
                                whiteSpace: 'nowrap',
                                backgroundColor: '#f8fafc',
                                py: 1.5
                              }}
                            >
                              <TableSortLabel
                                active={orderBy === column.id}
                                direction={orderBy === column.id ? order : 'asc'}
                                onClick={() => handleRequestSort(column.id)}
                              >
                                {column.label}
                              </TableSortLabel>
                            </TableCell>
                          ) : null;
                        })}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredMetricsBySector.map((row, index) => (
                        <TableRow 
                          key={index}
                          sx={{ '&:nth-of-type(even)': { backgroundColor: '#f8fafc' } }}
                        >
                          {selectedColumns.map(columnId => {
                            const value = row[columnId as keyof FinancialMetric];
                            
                            // Special formatting for code (symbol)
                            if (columnId === 'code') {
                              return (
                                <TableCell key={`${index}-${columnId}`} sx={{ fontWeight: 500 }}>
                                  {value as string}
                                </TableCell>
                              );
                            }
                            
                            // For numeric columns, add colored indicators for certain metrics
                            if (typeof value === 'number') {
                              let formattedValue: string | JSX.Element = value.toFixed(2);
                              
                              // PER indicator (lower is generally better)
                              if (columnId === 'PER' && value !== undefined) {
                                const color = value < 15 ? '#16a34a' : value > 25 ? '#ef4444' : '#f59e0b';
                                formattedValue = (
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    {value.toFixed(2)}
                                    <Box 
                                      component="span" 
                                      sx={{ 
                                        width: 8, 
                                        height: 8, 
                                        borderRadius: '50%', 
                                        bgcolor: color, 
                                        ml: 1 
                                      }} 
                                    />
                                  </Box>
                                );
                              }
                              
                              // PBV indicator (lower is generally better)
                              if (columnId === 'PBV' && value !== undefined) {
                                const color = value < 1.5 ? '#16a34a' : value > 3 ? '#ef4444' : '#f59e0b';
                                formattedValue = (
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    {value.toFixed(2)}
                                    <Box 
                                      component="span" 
                                      sx={{ 
                                        width: 8, 
                                        height: 8, 
                                        borderRadius: '50%', 
                                        bgcolor: color, 
                                        ml: 1 
                                      }} 
                                    />
                                  </Box>
                                );
                              }
                              
                              // DY(%) indicator (higher is generally better)
                              if (columnId === 'DY(%)' && value !== undefined) {
                                const color = value > 5 ? '#16a34a' : value < 2 ? '#ef4444' : '#f59e0b';
                                formattedValue = (
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    {value.toFixed(1)}%
                                    <Box 
                                      component="span" 
                                      sx={{ 
                                        width: 8, 
                                        height: 8, 
                                        borderRadius: '50%', 
                                        bgcolor: color, 
                                        ml: 1 
                                      }} 
                                    />
                                  </Box>
                                );
                              }
                              
                              return (
                                <TableCell 
                                  key={`${index}-${columnId}`} 
                                  align="right"
                                  sx={{ whiteSpace: 'nowrap' }}
                                >
                                  {formattedValue}
                                </TableCell>
                              );
                            }
                            
                            return (
                              <TableCell key={`${index}-${columnId}`}>
                                {value === undefined || value === null ? '—' : value.toString()}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                      
                      {filteredMetricsBySector.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={selectedColumns.length} align="center" sx={{ py: 3 }}>
                            No results found with the current filters.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
          
          {/* Footer */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              🙏 If you find this information helpful and want to support our work
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              href="https://www.patreon.com/c/CSEMaverick"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ 
                textTransform: 'none', 
                borderRadius: 6, 
                py: 0.75, 
                px: 3, 
                fontWeight: 700 
              }}
            >
              Support us on Patreon
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
} 