'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  AppBar,
  Toolbar,
  IconButton,
  TextField,
  Button,
  useTheme,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fade,
  Zoom,
  Chip,
  Tooltip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Sidebar from '../../components/Sidebar';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

interface TradeData {
  id: number;
  net_change: string;
  no_of_trades: number;
  price: string;
  quantity: number;
  symbol: string;
  timestamp: string;
}

interface TradeSummary {
  date: string;
  latest_net_change: number;
  latest_price: number;
  total_quantity: number;
  total_records: number;
  total_trades: number;
}

interface ApiResponse {
  data: TradeData[];
  status: string;
  summary: TradeSummary;
}

interface KeyLevel {
  price: number;
  volume: number;
  strength: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  keyLevels: {
    support: KeyLevel[];
    resistance: KeyLevel[];
  };
}

interface OHLCVData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface OHLCVResponse {
  ohlcv: OHLCVData[];
}

const formatNetChange = (value: number) => {
  return `${value >= 0 ? '+' : ''}${value}%`;
};

const CustomTooltip = ({ active, payload, label, keyLevels }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isSupportLevel = keyLevels.support.some((level: KeyLevel) => Math.abs(level.price - data.price) < 0.01);
    const isResistanceLevel = keyLevels.resistance.some((level: KeyLevel) => Math.abs(level.price - data.price) < 0.01);
    
    let levelType = '';
    if (isSupportLevel) {
      levelType = 'Heavy Support Level';
    } else if (isResistanceLevel) {
      levelType = 'Heavy Resistance Level';
    }

    return (
      <Box
        sx={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Typography variant="subtitle2" sx={{ color: '#1e293b', fontWeight: 600, mb: 1 }}>
          Price: {data.price?.toFixed(2) || 'N/A'}
        </Typography>
        <Typography variant="body2" sx={{ color: '#475569', mb: 0.5 }}>
          Volume: {data.quantity?.toLocaleString() || 'N/A'}
        </Typography>
        <Typography variant="body2" sx={{ color: '#475569', mb: 0.5 }}>
          Net Change: {formatNetChange(data.netChange || 0)}
        </Typography>
        {levelType && (
          <Typography 
            variant="body2" 
            sx={{ 
              color: isSupportLevel ? '#166534' : '#991b1b',
              fontWeight: 600,
              mt: 1,
              pt: 1,
              borderTop: '1px solid rgba(0, 0, 0, 0.1)'
            }}
          >
            {levelType}
          </Typography>
        )}
      </Box>
    );
  }
  return null;
};

const Watermark = () => (
  <Box
    sx={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '100%',
      textAlign: 'center',
      pointerEvents: 'none',
      zIndex: 1,
    }}
  >
    <Typography
      variant="h3"
      sx={{
        color: 'rgba(0, 0, 0, 0.03)',
        fontWeight: 700,
        letterSpacing: '0.1em',
        userSelect: 'none',
        fontSize: { xs: '2rem', sm: '3rem', md: '4rem' },
      }}
    >
      MAVERICK INTELLIGENCE
    </Typography>
  </Box>
);

const findKeyLevels = (data: TradeData[], currentPrice: number, ohlcv: OHLCVData[]): { support: KeyLevel[], resistance: KeyLevel[] } => {
  // Get the latest OHLCV data
  const latestOHLCV = ohlcv[ohlcv.length - 1];
  if (!latestOHLCV) {
    return { support: [], resistance: [] };
  }

  // Group trades by price and calculate total volume
  const priceMap = new Map<number, number>();
  data.forEach(trade => {
    const price = parseFloat(trade.price);
    const volume = trade.quantity;
    priceMap.set(price, (priceMap.get(price) || 0) + volume);
  });

  // Convert to array and sort by price
  const priceLevels = Array.from(priceMap.entries())
    .map(([price, volume]) => ({ price, volume }))
    .sort((a, b) => a.price - b.price);

  let resistanceLevels: KeyLevel[] = [];
  let supportLevels: KeyLevel[] = [];

  // Find resistance level(s) (all within ±5% of max volume from close price to high price)
  if (latestOHLCV.close < latestOHLCV.high) {
    const levelsFromCloseToHigh = priceLevels.filter(level => level.price >= latestOHLCV.close && level.price <= latestOHLCV.high);
    if (levelsFromCloseToHigh.length > 0) {
      const maxVolume = Math.max(...levelsFromCloseToHigh.map(level => level.volume));
      resistanceLevels = levelsFromCloseToHigh.filter(level => level.volume >= maxVolume * 0.85)
        .map(level => ({ price: level.price, volume: level.volume, strength: 1 }));
    }
  }

  // Find support level(s) (all within ±5% of max volume below close price)
  if (latestOHLCV.low < latestOHLCV.close) {
    const levelsBelowClose = priceLevels.filter(level => level.price < latestOHLCV.close);
    if (levelsBelowClose.length > 0) {
      const maxVolume = Math.max(...levelsBelowClose.map(level => level.volume));
      supportLevels = levelsBelowClose.filter(level => level.volume >= maxVolume * 0.85)
        .map(level => ({ price: level.price, volume: level.volume, strength: 1 }));
    }
  }

  return {
    support: supportLevels,
    resistance: resistanceLevels
  };
};

function MiniCandlestick({ ohlc }: { ohlc: OHLCVData | undefined }) {
  if (!ohlc) return null;
  const { open, high, low, close } = ohlc;
  const isBull = close >= open;
  const candleColor = isBull ? '#22c55e' : '#ef4444';
  const width = 40, height = 80, midX = width / 2;
  const min = Math.min(open, close, low), max = Math.max(open, close, high);
  const scale = (val: number) => height - ((val - min) / (max - min || 1)) * (height - 10) - 5;

  return (
    <Box sx={{
      position: 'absolute',
      top: 12,
      right: 12,
      bgcolor: 'rgba(255,255,255,0.85)',
      borderRadius: 2,
      boxShadow: 2,
      p: 1,
      zIndex: 10,
      minWidth: 48,
      minHeight: 90,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5 }}>OHLC</Typography>
      <svg width={width} height={height}>
        {/* Wick */}
        <line
          x1={midX} x2={midX}
          y1={scale(high)} y2={scale(low)}
          stroke={candleColor}
          strokeWidth={2}
        />
        {/* Body */}
        <rect
          x={midX - 7}
          width={14}
          y={scale(Math.max(open, close))}
          height={Math.max(6, Math.abs(scale(open) - scale(close)))}
          fill={candleColor}
          rx={3}
        />
      </svg>
      <Typography variant="caption" sx={{ fontSize: 11 }}>
        O:{open} H:{high} L:{low} C:{close}
      </Typography>
    </Box>
  );
}

// Helper to get today's date in YYYY-MM-DD format
const getTodayString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function VolumeProfilePage() {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [symbol, setSymbol] = useState('AAF.N0000');
  const [symbols, setSymbols] = useState<string[]>([]);
  const [tradeData, setTradeData] = useState<TradeData[]>([]);
  const [summary, setSummary] = useState<TradeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyLevels, setKeyLevels] = useState<{ support: KeyLevel[], resistance: KeyLevel[] }>({ support: [], resistance: [] });
  const [ohlcvData, setOHLCVData] = useState<OHLCVData[]>([]);

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

  const fetchTradeData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://cse-maverick-be-platform.onrender.com/api/trade-summary/${symbol}`);
      if (!response.ok) throw new Error('Failed to fetch trade data');
      const data: ApiResponse = await response.json();
      setTradeData(data.data);
      setSummary(data.summary);
    } catch (err) {
      setError('Failed to load trade data');
    } finally {
      setLoading(false);
    }
  };

  const fetchOHLCVData = async () => {
    try {
      const response = await fetch(`https://cse-maverick-be-platform.onrender.com/api/ohlcv/${symbol}`);
      if (!response.ok) throw new Error('Failed to fetch OHLCV data');
      const data: OHLCVResponse = await response.json();
      setOHLCVData(data.ohlcv);
    } catch (error) {
      console.error('Error fetching OHLCV data:', error);
    }
  };

  useEffect(() => {
    if (symbol) {
      fetchTradeData();
      fetchOHLCVData();
    }
  }, [symbol]);

  useEffect(() => {
    if (tradeData.length > 0 && summary?.latest_price && ohlcvData.length > 0) {
      const levels = findKeyLevels(tradeData, summary.latest_price, ohlcvData);
      setKeyLevels(levels);
    }
  }, [tradeData, summary?.latest_price, ohlcvData]);

  const calculateCashMap = (data: TradeData[]) => {
    const totalVolume = data.reduce((sum, trade) => sum + trade.quantity, 0);
    const buyVolume = data.reduce((sum, trade) => {
      const netChange = parseFloat(trade.net_change);
      return sum + (netChange >= 0 ? trade.quantity : 0);
    }, 0);
    return ((buyVolume / totalVolume) * 100).toFixed(2);
  };

  const chartData = tradeData.map(trade => ({
    price: parseFloat(trade.price),
    quantity: trade.quantity,
    netChange: parseFloat(trade.net_change)
  })).sort((a, b) => a.price - b.price);

  const getBarColor = (value: number) => {
    // Check if this price level is a support or resistance level
    const isSupportLevel = keyLevels.support.some(level => Math.abs(level.price - value) < 0.01);
    const isResistanceLevel = keyLevels.resistance.some(level => Math.abs(level.price - value) < 0.01);

    if (isSupportLevel) {
      return '#166534'; // Dark green for support levels
    }
    if (isResistanceLevel) {
      return '#991b1b'; // Dark red for resistance levels
    }
    return '#404040'; // Charcoal grey for other levels
  };

  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  // Find OHLCV for today or latest available
  const todayStr = getTodayString();
  let todaysOhlc: OHLCVData | undefined = undefined;
  if (ohlcvData.length > 0) {
    todaysOhlc = ohlcvData.find(item => item.date === todayStr);
    if (!todaysOhlc) {
      // fallback to latest available (assume sorted oldest to newest)
      todaysOhlc = ohlcvData[ohlcvData.length - 1];
    }
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc' }}>
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} isDesktop={!isMobile} />
      <Box sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 } }}>
        <AppBar 
          position="sticky" 
          color="default" 
          elevation={0} 
          sx={{ 
            bgcolor: '#fff', 
            mb: 2,
            borderBottom: '1px solid #e2e8f0'
          }}
        >
          <Toolbar sx={{ px: { xs: 1, sm: 2 } }}>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                flexGrow: 1, 
                fontWeight: 700,
                background: 'linear-gradient(45deg, #22c55e 30%, #16a34a 90%)',
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Volume Profile
            </Typography>
          </Toolbar>
        </AppBar>

        <Fade in={true} timeout={500}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: { xs: 1.5, sm: 2 }, 
              mb: 2, 
              borderRadius: 2, 
              bgcolor: '#fff',
              position: 'sticky',
              top: { xs: 56, sm: 64 },
              zIndex: 1,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
            }}
          >
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Select Symbol</InputLabel>
              <Select
                value={symbol}
                label="Select Symbol"
                onChange={(e) => setSymbol(e.target.value)}
                sx={{ 
                  bgcolor: '#fff',
                  '& .MuiSelect-select': {
                    py: 1.2
                  }
                }}
              >
                {symbols.map((sym) => (
                  <MenuItem key={sym} value={sym}>
                    {sym}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>
        </Fade>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress sx={{ color: '#22c55e' }} />
          </Box>
        )}

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              my: 2,
              borderRadius: 2,
              '& .MuiAlert-icon': {
                color: 'error.main'
              }
            }}
          >
            {error}
          </Alert>
        )}

        {tradeData.length > 0 && (
          <Zoom in={true} timeout={500}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: { xs: 1.5, sm: 2 }, 
                mb: 2, 
                borderRadius: 2, 
                bgcolor: '#fff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Mini Candlestick in top-right corner */}
              {todaysOhlc && (
                <MiniCandlestick ohlc={todaysOhlc} />
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontSize: { xs: '1.1rem', sm: '1.25rem' },
                    fontWeight: 700
                  }}
                >
                  {symbol}
                </Typography>
                <Chip 
                  label={summary?.date} 
                  size="small" 
                  sx={{ 
                    bgcolor: '#f1f5f9',
                    fontWeight: 500
                  }} 
                />
                <Tooltip title="Cash Map shows the ratio of buy volume to total volume">
                  <Chip 
                    icon={<InfoOutlinedIcon />}
                    label={`Cash Map: ${calculateCashMap(tradeData)}%`}
                    size="small"
                    sx={{ 
                      bgcolor: '#f0fdf4',
                      color: '#16a34a',
                      fontWeight: 600
                    }}
                  />
                </Tooltip>
              </Box>
              <Box 
                sx={{ 
                  width: '100%', 
                  height: { xs: 300, sm: 400 }, 
                  mt: 2,
                  position: 'relative',
                  '& .recharts-wrapper': {
                    margin: '0 auto'
                  },
                  '& .recharts-surface': {
                    overflow: 'visible'
                  }
                }}
              >
                <Watermark />
                <ResponsiveContainer>
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.3}/>
                      </linearGradient>
                      <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="#e2e8f0"
                      vertical={false}
                    />
                    <XAxis 
                      dataKey="price" 
                      label={{ 
                        value: 'Price', 
                        position: 'insideBottom', 
                        offset: -5,
                        fill: '#64748b'
                      }}
                      tick={{ 
                        fontSize: 12,
                        fill: '#64748b'
                      }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis 
                      label={{ 
                        value: 'Quantity', 
                        angle: -90, 
                        position: 'insideLeft',
                        fill: '#64748b',
                        offset: -5
                      }}
                      tick={{ 
                        fontSize: 12,
                        fill: '#64748b'
                      }}
                      tickFormatter={formatYAxis}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={{ stroke: '#e2e8f0' }}
                    />
                    <RechartsTooltip 
                      content={<CustomTooltip keyLevels={keyLevels} />}
                      cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                    />
                    <Bar 
                      dataKey="quantity" 
                      radius={[4, 4, 0, 0]}
                      animationDuration={1000}
                    >
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={getBarColor(entry.price)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Zoom>
        )}

        {summary && (
          <Fade in={true} timeout={500}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: { xs: 1.5, sm: 2 }, 
                mb: 2, 
                borderRadius: 2, 
                bgcolor: '#fff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
              }}
            >
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  fontSize: { xs: '1.1rem', sm: '1.25rem' },
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                Summary
                {summary.latest_net_change >= 0 ? (
                  <TrendingUpIcon color="success" />
                ) : (
                  <TrendingDownIcon color="error" />
                )}
              </Typography>
              <Box 
                sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { 
                    xs: '1fr', 
                    sm: 'repeat(2, 1fr)', 
                    md: 'repeat(4, 1fr)'
                  }, 
                  gap: 2 
                }}
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">Date</Typography>
                  <Typography variant="body1" fontWeight={600}>{summary.date}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Latest Price</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    LKR {summary.latest_price.toFixed(2)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Latest Net Change</Typography>
                  <Typography 
                    variant="body1" 
                    fontWeight={600}
                    sx={{ 
                      color: summary.latest_net_change >= 0 ? 'success.main' : 'error.main',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}
                  >
                    {summary.latest_net_change >= 0 ? '+' : ''}{summary.latest_net_change.toFixed(2)}%
                    {summary.latest_net_change >= 0 ? (
                      <TrendingUpIcon fontSize="small" />
                    ) : (
                      <TrendingDownIcon fontSize="small" />
                    )}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Total Quantity</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {summary.total_quantity.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Fade>
        )}

        {tradeData.length > 0 && (
          <Fade in={true} timeout={500}>
            <TableContainer 
              component={Paper} 
              elevation={0} 
              sx={{ 
                borderRadius: 2, 
                bgcolor: '#fff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                overflowX: 'auto'
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Price</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Net Change</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Quantity</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>No. of Trades</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tradeData.map((trade, index) => (
                    <TableRow 
                      key={index}
                      hover
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 },
                        transition: 'background-color 0.2s',
                        '&:hover': {
                          bgcolor: '#f8fafc'
                        }
                      }}
                    >
                      <TableCell>LKR {parseFloat(trade.price).toFixed(2)}</TableCell>
                      <TableCell 
                        sx={{ 
                          color: parseFloat(trade.net_change) >= 0 ? 'success.main' : 'error.main',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5
                        }}
                      >
                        {parseFloat(trade.net_change) >= 0 ? '+' : ''}{trade.net_change}%
                        {parseFloat(trade.net_change) >= 0 ? (
                          <TrendingUpIcon fontSize="small" />
                        ) : (
                          <TrendingDownIcon fontSize="small" />
                        )}
                      </TableCell>
                      <TableCell>{trade.quantity.toLocaleString()}</TableCell>
                      <TableCell>{trade.no_of_trades.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Fade>
        )}

        {!loading && tradeData.length > 0 && (
          <>
            {/* Key Levels Display */}
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                mb: 2, 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                justifyContent: 'space-between',
                bgcolor: 'white',
                borderRadius: 2
              }}
            >
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Key Support Levels
                </Typography>
                {keyLevels.support.map((level, index) => (
                  <Typography 
                    key={`support-${index}`}
                    variant="body2"
                    sx={{ 
                      color: 'success.main',
                      fontWeight: 500,
                      mb: 0.5
                    }}
                  >
                    S: {level.price.toFixed(2)}
                  </Typography>
                ))}
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Key Resistance Levels
                </Typography>
                {keyLevels.resistance.map((level, index) => (
                  <Typography 
                    key={`resistance-${index}`}
                    variant="body2"
                    sx={{ 
                      color: 'error.main',
                      fontWeight: 500,
                      mb: 0.5
                    }}
                  >
                    R: {level.price.toFixed(2)}
                  </Typography>
                ))}
              </Box>
            </Paper>
          </>
        )}
      </Box>
    </Box>
  );
} 