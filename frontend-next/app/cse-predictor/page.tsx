'use client';

import { useState, useEffect, useMemo } from 'react';
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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import Sidebar from '../../components/Sidebar';
import { navLinks } from '../../components/navLinks';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

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

export default function CSEPredictorPage() {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [groupedPicks, setGroupedPicks] = useState<any>({});
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [tab, setTab] = useState(0);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const response = await fetch('/api/cse-predictor/symbols');
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
        const response = await fetch(`/api/cse-predictor?date=${dateStr}&symbol=${selectedSymbol}`);
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        setGroupedPicks(data.groupedPicks || {});
        setChartData(data.chartData || []);
      } catch (err) {
        setError('Failed to load stock data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedDate, selectedSymbol]);

  // Preprocess symbol stats for the selected timeframe
  const symbolStats = useMemo(() => {
    const stats: Record<string, {
      firstDate: string,
      firstPrice: number,
      count: number
    }> = {};
    Object.values(groupedPicks).forEach((day: any) => {
      ['tier1Picks', 'tier2Picks'].forEach(tier => {
        (day?.[tier] || []).forEach((pick: any) => {
          if (!stats[pick.symbol]) {
            stats[pick.symbol] = {
              firstDate: pick.date,
              firstPrice: pick.closing_price,
              count: 1
            };
          } else {
            // Update firstDate/firstPrice if this pick is earlier
            if (pick.date < stats[pick.symbol].firstDate) {
              stats[pick.symbol].firstDate = pick.date;
              stats[pick.symbol].firstPrice = pick.closing_price;
            }
            stats[pick.symbol].count += 1;
          }
        });
      });
    });
    return stats;
  }, [groupedPicks]);

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
              CSE Predictor
            </Typography>
            <Tooltip title="Show disclaimer">
              <IconButton onClick={() => setShowDisclaimer((v) => !v)}>
                <InfoOutlined />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
        {showDisclaimer && (
          <Alert severity="info" sx={{ my: 2 }}>
            <b>Disclaimer:</b> These results are for informational purposes only. Always conduct your own research and consult with a qualified financial advisor before making any investment decisions.
          </Alert>
        )}
        {/* Filters */}
        <Grid container spacing={2} sx={{ my: 1 }}>
          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Select Start Date"
                value={selectedDate}
                onChange={(newValue) => setSelectedDate(newValue)}
                sx={{ width: '100%' }}
              />
            </LocalizationProvider>
          </Grid>
          {tab === 1 && (
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
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
        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable" scrollButtons="auto">
          <Tab label="Picks" />
          <Tab label="Charts" />
          <Tab label="Info" />
        </Tabs>
        {/* Tab Panels */}
        {tab === 0 && (
          <Box>
            {Object.keys(groupedPicks).sort((a, b) => b.localeCompare(a)).map(date => {
              const t1 = [...(groupedPicks[date]?.tier1Picks || [])].sort((a, b) => b.turnover - a.turnover);
              const t2 = [...(groupedPicks[date]?.tier2Picks || [])].sort((a, b) => b.turnover - a.turnover);
              return (
                <Accordion key={date} defaultExpanded={Object.keys(groupedPicks)[0] === date}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">{date}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {/* Tier 1 Picks */}
                    <Typography variant="subtitle1" sx={{ mt: 1, mb: 1, display: 'flex', alignItems: 'center' }}>
                      <span role="img" aria-label="star">🌟</span> Tier 1 Picks
                    </Typography>
                    {t1.length === 0 && (
                      <Typography color="text.secondary" sx={{ mb: 2 }}>No Tier 1 picks for this date.</Typography>
                    )}
                    <Grid container spacing={2}>
                      {t1.map((stock: any) => {
                        const stat = symbolStats[stock.symbol] || {};
                        const gainTilDate = stat.firstPrice ? (((stock.closing_price - stat.firstPrice) / stat.firstPrice) * 100).toFixed(2) : '-';
                        return (
                          <Grid item xs={12} sm={6} md={4} key={stock.symbol + stock.date}>
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
                                '&:hover': { boxShadow: 6, borderColor: 'primary.main' },
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Typography variant="h6" fontWeight={900} sx={{ flexGrow: 1 }}>
                                  {stock.symbol}
                                </Typography>
                              </Box>
                              <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Tooltip title="Number of times this stock was detected in the selected period. If multiple detections happen, that means it's more likely to give better capital gains.">
                                  <InfoOutlined sx={{ fontSize: 18, color: 'primary.main', mr: 0.5 }} />
                                </Tooltip>
                                <Box
                                  sx={{
                                    bgcolor: 'primary.main',
                                    color: '#111',
                                    px: 1.2,
                                    py: 0.2,
                                    borderRadius: 2,
                                    fontWeight: 700,
                                    fontSize: 15,
                                    minWidth: 32,
                                    textAlign: 'center',
                                    boxShadow: 1,
                                    border: '2px solid #fff',
                                    letterSpacing: 0.5,
                                  }}
                                >
                                  {stat.count || 1}x
                                </Box>
                              </Box>
                              <Grid container spacing={0.5} sx={{ mb: 1 }}>
                                <Grid item xs={7} sx={{ color: 'text.secondary' }}>Daily Gain</Grid>
                                <Grid item xs={5} sx={{ textAlign: 'right', color: Number(stock.change_pct) > 0 ? 'success.main' : Number(stock.change_pct) < 0 ? 'error.main' : 'text.primary', fontWeight: 700 }}>
                                  {stock.change_pct}%
                                </Grid>
                                <Grid item xs={7} sx={{ color: 'text.secondary' }}>Turnover</Grid>
                                <Grid item xs={5} sx={{ textAlign: 'right' }}>{Number(stock.turnover).toLocaleString()}</Grid>
                                <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
                                  Volume Signature
                                  <Tooltip title="If High Bullish, very high volume has been trading. If Emerging Bullish, significant volume has been traded.">
                                    <InfoOutlined sx={{ fontSize: 16, color: 'primary.main', ml: 0.5 }} />
                                  </Tooltip>
                                </Grid>
                                <Grid item xs={5} sx={{ textAlign: 'right' }}>{(stock.volume_analysis || '').replace(/\s*Momentum$/, '')}</Grid>
                                <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
                                  Relative Strength
                                  <Tooltip title="More than 1 means in the near short term it has performed better than ASI.">
                                    <InfoOutlined sx={{ fontSize: 16, color: 'primary.main', ml: 0.5 }} />
                                  </Tooltip>
                                </Grid>
                                <Grid item xs={5} sx={{ textAlign: 'right' }}>{stock.relative_strength}</Grid>
                                <Grid item xs={7} sx={{ color: 'text.secondary' }}>First Detected</Grid>
                                <Grid item xs={5} sx={{ textAlign: 'right' }}>{formatDate(stat.firstDate)}</Grid>
                                <Grid item xs={7} sx={{ color: 'text.secondary' }}>Gain til date</Grid>
                                <Grid item xs={5} sx={{ textAlign: 'right', color: Number(gainTilDate) > 0 ? 'success.main' : Number(gainTilDate) < 0 ? 'error.main' : 'text.primary', fontWeight: 700 }}>
                                  {gainTilDate}%
                                </Grid>
                              </Grid>
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 1 }}>
                                <Typography variant="h5" fontWeight={900} sx={{ color: 'primary.main' }}>
                                  {stock.closing_price}
                                </Typography>
                              </Box>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>
                    {/* Tier 2 Picks */}
                    <Typography variant="subtitle1" sx={{ mt: 4, mb: 1, display: 'flex', alignItems: 'center' }}>
                      <span role="img" aria-label="diamond">🔹</span> Tier 2 Picks
                    </Typography>
                    {t2.length === 0 && (
                      <Typography color="text.secondary" sx={{ mb: 2 }}>No Tier 2 picks for this date.</Typography>
                    )}
                    <Grid container spacing={2}>
                      {t2.map((stock: any) => {
                        const stat = symbolStats[stock.symbol] || {};
                        const gainTilDate = stat.firstPrice ? (((stock.closing_price - stat.firstPrice) / stat.firstPrice) * 100).toFixed(2) : '-';
                        return (
                          <Grid item xs={12} sm={6} md={4} key={stock.symbol + stock.date}>
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
                                '&:hover': { boxShadow: 6, borderColor: 'primary.main' },
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Typography variant="h6" fontWeight={900} sx={{ flexGrow: 1 }}>
                                  {stock.symbol}
                                </Typography>
                              </Box>
                              <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Tooltip title="Number of times this stock was detected in the selected period. If multiple detections happen, that means it's more likely to give better capital gains.">
                                  <InfoOutlined sx={{ fontSize: 18, color: 'primary.main', mr: 0.5 }} />
                                </Tooltip>
                                <Box
                                  sx={{
                                    bgcolor: 'primary.main',
                                    color: '#111',
                                    px: 1.2,
                                    py: 0.2,
                                    borderRadius: 2,
                                    fontWeight: 700,
                                    fontSize: 15,
                                    minWidth: 32,
                                    textAlign: 'center',
                                    boxShadow: 1,
                                    border: '2px solid #fff',
                                    letterSpacing: 0.5,
                                  }}
                                >
                                  {stat.count || 1}x
                                </Box>
                              </Box>
                              <Grid container spacing={0.5} sx={{ mb: 1 }}>
                                <Grid item xs={7} sx={{ color: 'text.secondary' }}>Daily Gain</Grid>
                                <Grid item xs={5} sx={{ textAlign: 'right', color: Number(stock.change_pct) > 0 ? 'success.main' : Number(stock.change_pct) < 0 ? 'error.main' : 'text.primary', fontWeight: 700 }}>
                                  {stock.change_pct}%
                                </Grid>
                                <Grid item xs={7} sx={{ color: 'text.secondary' }}>Turnover</Grid>
                                <Grid item xs={5} sx={{ textAlign: 'right' }}>{Number(stock.turnover).toLocaleString()}</Grid>
                                <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
                                  Volume Signature
                                  <Tooltip title="If High Bullish, very high volume has been trading. If Emerging Bullish, significant volume has been traded.">
                                    <InfoOutlined sx={{ fontSize: 16, color: 'primary.main', ml: 0.5 }} />
                                  </Tooltip>
                                </Grid>
                                <Grid item xs={5} sx={{ textAlign: 'right' }}>{(stock.volume_analysis || '').replace(/\s*Momentum$/, '')}</Grid>
                                <Grid item xs={7} sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
                                  Relative Strength
                                  <Tooltip title="More than 1 means in the near short term it has performed better than ASI.">
                                    <InfoOutlined sx={{ fontSize: 16, color: 'primary.main', ml: 0.5 }} />
                                  </Tooltip>
                                </Grid>
                                <Grid item xs={5} sx={{ textAlign: 'right' }}>{stock.relative_strength}</Grid>
                                <Grid item xs={7} sx={{ color: 'text.secondary' }}>First Detected</Grid>
                                <Grid item xs={5} sx={{ textAlign: 'right' }}>{formatDate(stat.firstDate)}</Grid>
                                <Grid item xs={7} sx={{ color: 'text.secondary' }}>Gain til date</Grid>
                                <Grid item xs={5} sx={{ textAlign: 'right', color: Number(gainTilDate) > 0 ? 'success.main' : Number(gainTilDate) < 0 ? 'error.main' : 'text.primary', fontWeight: 700 }}>
                                  {gainTilDate}%
                                </Grid>
                              </Grid>
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 1 }}>
                                <Typography variant="h5" fontWeight={900} sx={{ color: 'primary.main' }}>
                                  {stock.closing_price}
                                </Typography>
                              </Box>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>
                    {/* If both are empty */}
                    {t1.length === 0 && t2.length === 0 && (
                      <Typography color="text.secondary" sx={{ mt: 2 }}>No picks for this date.</Typography>
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
                <Typography variant="h6" sx={{ mb: 2 }}>Price Trend</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="closing_price" stroke="#8884d8" activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Box>
        )}
        {tab === 2 && (
          <Box sx={{ mt: 2 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Legend: Understanding Key Terms</Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>
                    <b>📈 Relative Strength (RS):</b> A momentum indicator that compares the performance of a stock to the overall market or to the ASI.
                  </li>
                  <li>
                    <b>🔄 Bullish Divergence:</b> Occurs when the stock's price is making lower lows, but the RSI is making higher lows.
                  </li>
                  <li>
                    <b>📊 Volume Analysis:</b> Indicates the level of trading activity and potential market interest in a stock.
                  </li>
                </ul>
              </CardContent>
            </Card>
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
    </Box>
  );
} 