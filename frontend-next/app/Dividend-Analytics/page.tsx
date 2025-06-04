'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Card,
  CardContent,
  Grid,
  Container,
  useTheme,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import Sidebar from '../../components/Sidebar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface DividendHistory {
  company_code: string;
  date: string;
  rate_of_dividend: number | string;
}

interface ApiResponse {
  data: DividendHistory[];
}

// Custom tick renderer for rotated date labels
const DateTick = (props: any) => {
  const { x, y, payload } = props;
  let label = '';
  if (payload && payload.value) {
    const dateObj = new Date(payload.value);
    if (!isNaN(dateObj.getTime())) {
      label = format(dateObj, 'MM-yyyy');
    }
  }
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        fill="#666"
        fontSize={12}
        transform="rotate(-30)"
      >
        {label}
      </text>
    </g>
  );
};

export default function DividendAnalyticsPage() {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isMobile = !isDesktop;
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [companies, setCompanies] = useState<string[]>([]);
  const [dividendData, setDividendData] = useState<DividendHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [sharePrice, setSharePrice] = useState<number | null | undefined>(undefined);

  // Fetch list of companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        console.log('Fetching companies...');
        const response = await fetch('/api/dividend-history?unique_companies=true');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch companies: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json() as ApiResponse;
        console.log('Received data:', data);
        
        if (!data.data || !Array.isArray(data.data)) {
          throw new Error('Invalid data format received from API');
        }
        
        // Extract company codes from the response
        const companyCodes = data.data
          .map(item => item.company_code)
          .filter(code => code && typeof code === 'string')
          .sort((a, b) => a.localeCompare(b));
        
        console.log('Extracted companies:', companyCodes);
        
        if (companyCodes.length === 0) {
          throw new Error('No valid company codes found in the data');
        }
        
        setCompanies(companyCodes);
        setError(null); // Clear any previous errors
      } catch (err) {
        console.error('Error fetching companies:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load companies list';
        setError(errorMessage);
        
        // Implement retry logic
        if (retryCount < maxRetries) {
          console.log(`Retrying... Attempt ${retryCount + 1} of ${maxRetries}`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 2000); // Wait 2 seconds before retrying
        }
      }
    };
    fetchCompanies();
  }, [retryCount]); // Add retryCount as a dependency

  // Fetch dividend history when company is selected
  useEffect(() => {
    const fetchDividendHistory = async () => {
      if (!selectedCompany) return;
      
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/dividend-history?company_code=${selectedCompany}`);
        if (!response.ok) throw new Error('Failed to fetch dividend history');
        const data = await response.json();
        
        // Sort data by date and convert rate_of_dividend to number
        const sortedData = data.data
          .filter((item: DividendHistory) => item.company_code === selectedCompany)
          .map((item: DividendHistory) => ({
            ...item,
            rate_of_dividend: Number(item.rate_of_dividend)
          }))
          .sort((a: DividendHistory, b: DividendHistory) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );
        
        setDividendData(sortedData);
      } catch (err) {
        console.error('Error fetching dividend history:', err);
        setError('Failed to load dividend history');
      } finally {
        setLoading(false);
      }
    };

    fetchDividendHistory();
  }, [selectedCompany]);

  useEffect(() => {
    const fetchSharePrice = async () => {
      if (!selectedCompany) {
        setSharePrice(undefined);
        return;
      }
      setSharePrice(undefined); // show loading
      try {
        const res = await fetch(`/api/cse-insights/latest-price?symbol=${encodeURIComponent(selectedCompany)}`);
        const data = await res.json();
        setSharePrice(typeof data.latestPrice === 'number' ? data.latestPrice : null);
      } catch {
        setSharePrice(null);
      }
    };
    fetchSharePrice();
  }, [selectedCompany]);

  const sortedData = dividendData
    .filter(item => item.date && item.rate_of_dividend !== null && item.rate_of_dividend !== undefined)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate dividend per share: trailing 12 months, fallback to most recent dividend, always show a value if possible
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  const ttmDividends = sortedData.filter(d => new Date(d.date) >= oneYearAgo);
  console.log('TTM Dividends:', ttmDividends);
  let dividendPerShare = ttmDividends.reduce(
    (sum, d) => {
      const dividendValue = typeof d.rate_of_dividend === 'string' ? Number(d.rate_of_dividend) : d.rate_of_dividend;
      console.log('Processing dividend:', dividendValue, 'Type:', typeof dividendValue);
      return !isNaN(dividendValue) ? sum + dividendValue : sum;
    },
    0
  );
  console.log('Calculated dividendPerShare:', dividendPerShare);
  // Fallback to most recent dividend if TTM is zero
  if (dividendPerShare === 0 && sortedData.length > 0) {
    const lastDividend = typeof sortedData[sortedData.length - 1].rate_of_dividend === 'string' 
      ? Number(sortedData[sortedData.length - 1].rate_of_dividend)
      : sortedData[sortedData.length - 1].rate_of_dividend;
    console.log('Last dividend value:', lastDividend, 'Type:', typeof lastDividend);
    dividendPerShare = !isNaN(Number(lastDividend)) ? Number(lastDividend) : 0;
  }
  console.log('Final dividendPerShare:', dividendPerShare);
  console.log('Share price:', sharePrice);
  const dividendYield = (dividendPerShare > 0 && sharePrice && sharePrice > 0)
    ? ((dividendPerShare / sharePrice) * 100).toFixed(2)
    : '0.00';
  console.log('Calculated dividend yield:', dividendYield);

  // Calculate max dividend value for YAxis domain
  const maxDividend = Math.max(
    ...sortedData.map(d => {
      const value = typeof d.rate_of_dividend === 'string' ? Number(d.rate_of_dividend) : d.rate_of_dividend;
      return !isNaN(value) ? value : 0;
    })
  );
  const yAxisMax = Math.ceil(maxDividend * 1.1); // Add 10% padding to the top

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f7fafc' }}>
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} isDesktop={isDesktop} />
      
      <Box sx={{ flexGrow: 1, width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f7fafc' }}>
        {/* Top Bar */}
        <AppBar position="static" color="transparent" elevation={0} sx={{ bgcolor: 'white', boxShadow: 'none', borderBottom: '1px solid #eee', px: 2 }}>
          <Toolbar sx={{ justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {!drawerOpen && (
                <IconButton edge="start" aria-label="menu" onClick={() => setDrawerOpen(true)} sx={{ color: '#000', mr: 2 }}>
                  <MenuIcon />
                </IconButton>
              )}
              <Typography variant="h4" fontWeight={800} sx={{ color: '#222', fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
                Dividend Analytics
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button 
                startIcon={<AccountCircle />} 
                sx={{ textTransform: 'none', fontWeight: 700, color: '#222' }}
              >
                Account
              </Button>
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
                  '&:hover': { bgcolor: '#1d4ed8' }
                }}
                href="/#premium"
              >
                Premium
              </Button>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
          {/* Hero Section */}
          <Box sx={{ width: '100%', bgcolor: '#eaf1fb', py: { xs: 4, md: 7 }, px: { xs: 2, md: 0 }, display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4, borderRadius: 3 }}>
            <Typography variant="h3" fontWeight={800} align="center" sx={{ color: '#222', mb: 1, fontSize: { xs: '2rem', md: '2.7rem' } }}>
              Dividend Analytics <Box component="span" sx={{ color: '#2563eb' }}>by Maverick Intelligence</Box>
            </Typography>
            <Typography variant="h6" align="center" sx={{ color: '#444', mb: 3, fontWeight: 400, maxWidth: 600 }}>
              Track and analyze dividend trends across different companies
            </Typography>
          </Box>

          {/* Company Selection and Chart */}
          <Card sx={{ mb: 4, borderRadius: 3, boxShadow: 1 }}>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth error={!!error}>
                    <InputLabel>Select Company</InputLabel>
                    <Select
                      value={selectedCompany}
                      label="Select Company"
                      onChange={(e) => setSelectedCompany(e.target.value)}
                      displayEmpty
                      disabled={loading || !!error}
                    >
                      <MenuItem value="" disabled>
                        <em>Select a company</em>
                      </MenuItem>
                      {companies.map((company) => (
                        <MenuItem key={company} value={company}>
                          {company}
                        </MenuItem>
                      ))}
                    </Select>
                    {error && (
                      <Typography color="error" variant="caption" sx={{ mt: 1 }}>
                        {error}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : error ? (
                    <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
                  ) : dividendData.length > 0 ? (
                    <Box sx={{ width: '100%', height: { xs: 320, md: 420 }, p: { xs: 1, md: 3 } }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={sortedData}
                          margin={{ top: 30, right: 40, left: 10, bottom: 40 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tick={DateTick}
                            label={{
                              value: 'Date',
                              position: 'insideBottom',
                              offset: -25,
                              fontSize: isMobile ? 12 : 16,
                              fill: '#8884d8',
                            }}
                            minTickGap={20}
                            interval={0}
                          />
                          <YAxis
                            tick={{ fontSize: isMobile ? 11 : 14 }}
                            label={{
                              value: 'Dividend per Share (LKR)',
                              angle: -90,
                              position: 'insideLeft',
                              fontSize: isMobile ? 12 : 16,
                              fill: '#8884d8',
                            }}
                            domain={[0, yAxisMax]}
                            allowDecimals
                          />
                          <Tooltip
                            formatter={(value: number) => [value]}
                            labelFormatter={(label) => `Date: ${format(new Date(label), 'MM-yyyy')}`}
                          />
                          <Line
                            type="monotone"
                            dataKey="rate_of_dividend"
                            stroke="#2563eb"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                            connectNulls={true}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  ) : (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Select a company to view its dividend history
                    </Alert>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Dividend Analytics Insights */}
          {dividendData.length > 0 && (
            <Card sx={{ mb: 4, borderRadius: 3, boxShadow: 1 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
                  Dividend Analytics Insights
                </Typography>
                <Grid container spacing={3}>
                  {/* Dividend Yield */}
                  <Grid item xs={12} md={6} lg={4}>
                    <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 0, border: '1px solid #eee' }}>
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Dividend Yield (Trailing 12 Months)
                        </Typography>
                        <Typography variant="h4" fontWeight={700} color="primary">
                          {sharePrice === undefined ? (
                            <CircularProgress size={18} sx={{ verticalAlign: 'middle' }} />
                          ) : (
                            `${dividendYield}%`
                          )}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {typeof dividendPerShare === 'number' && isFinite(dividendPerShare) && typeof sharePrice === 'number' && isFinite(sharePrice)
                            ? `DPS: ${dividendPerShare.toFixed(2)}, Price: ${sharePrice.toFixed(2)}`
                            : ''}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  {/* CAGR */}
                  <Grid item xs={12} md={6} lg={4}>
                    <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 0, border: '1px solid #eee' }}>
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Compound Annual Growth Rate (CAGR)
                        </Typography>
                        <Typography variant="h4" fontWeight={700} color="primary">
                          {(() => {
                            if (sortedData.length < 2) return 'N/A';
                            
                            // Group dividends by year
                            const yearlyDividends: { [key: number]: number[] } = {};
                            sortedData.forEach(d => {
                              const year = new Date(d.date).getFullYear();
                              if (!yearlyDividends[year]) {
                                yearlyDividends[year] = [];
                              }
                              const value = typeof d.rate_of_dividend === 'string' ? Number(d.rate_of_dividend) : d.rate_of_dividend;
                              if (!isNaN(value)) {
                                yearlyDividends[year].push(value);
                              }
                            });

                            // Calculate average dividend for each year
                            const yearlyAverages: { year: number; avg: number }[] = Object.entries(yearlyDividends)
                              .map(([year, dividends]) => ({
                                year: parseInt(year),
                                avg: dividends.reduce((sum, val) => sum + val, 0) / dividends.length
                              }))
                              .sort((a, b) => a.year - b.year);

                            if (yearlyAverages.length < 2) return 'N/A';

                            // Calculate CAGR using the most recent 5 years of data
                            const calculateCAGR = () => {
                              // Get the last 5 years of data, or all available if less than 5 years
                              const yearsToUse = Math.min(5, yearlyAverages.length);
                              const selectedYears = yearlyAverages.slice(-yearsToUse);
                              
                              if (selectedYears.length < 2) return null;

                              const firstYearAvg = selectedYears[0].avg;
                              const lastYearAvg = selectedYears[selectedYears.length - 1].avg;
                              const yearSpan = selectedYears[selectedYears.length - 1].year - selectedYears[0].year;

                              // Ensure we have valid numbers and a positive year span
                              if (yearSpan <= 0 || firstYearAvg <= 0 || lastYearAvg <= 0) return null;

                              // Calculate CAGR
                              const cagr = ((lastYearAvg / firstYearAvg) ** (1 / yearSpan) - 1) * 100;
                              
                              // Validate the result
                              if (isNaN(cagr) || !isFinite(cagr)) return null;
                              
                              return cagr;
                            };

                            const cagr = calculateCAGR();
                            if (cagr === null) return 'N/A';
                            
                            // Format the result with 1 decimal place
                            return `${cagr.toFixed(1)}%`;
                          })()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Dividend Cycle */}
                  <Grid item xs={12} md={6} lg={4}>
                    <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 0, border: '1px solid #eee' }}>
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Typical Dividend Cycle Start
                        </Typography>
                        <Typography variant="h4" fontWeight={700} color="primary">
                          {(() => {
                            if (sortedData.length < 2) return 'N/A';
                            const months = sortedData.map(d => new Date(d.date).getMonth());
                            const mostCommonMonth = months.reduce((a, b) => 
                              months.filter(v => v === a).length >= months.filter(v => v === b).length ? a : b
                            );
                            return format(new Date(2024, mostCommonMonth, 1), 'MMMM');
                          })()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Common Dividend Months */}
                  <Grid item xs={12} md={6} lg={4}>
                    <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 0, border: '1px solid #eee' }}>
                <CardContent>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Common Dividend Months
                        </Typography>
                        <Typography variant="h4" fontWeight={700} color="primary">
                          {(() => {
                            if (sortedData.length < 2) return 'N/A';
                            const months = sortedData.map(d => new Date(d.date).getMonth());
                            const monthCounts: { [key: number]: number } = {};
                            months.forEach(month => {
                              monthCounts[month] = (monthCounts[month] || 0) + 1;
                            });
                            const sortedMonths = Object.entries(monthCounts)
                              .sort(([,a], [,b]) => (b as number) - (a as number))
                              .slice(0, 2)
                              .map(([month]) => format(new Date(2024, parseInt(month), 1), 'MMMM'));
                            return sortedMonths.join(', ');
                          })()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

                  {/* Dividend Frequency */}
                  <Grid item xs={12} md={6} lg={4}>
                    <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 0, border: '1px solid #eee' }}>
                <CardContent>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Dividend Frequency
                        </Typography>
                        <Typography variant="h4" fontWeight={700} color="primary">
                          {(() => {
                            if (sortedData.length < 2) return 'N/A';
                            const years = (new Date(sortedData[sortedData.length - 1].date).getTime() - new Date(sortedData[0].date).getTime()) / (1000 * 60 * 60 * 24 * 365);
                            const frequency = sortedData.length / years;
                            return `${Math.round(frequency)} times/year`;
                          })()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

                  {/* Next Likely Dividend Month */}
                  <Grid item xs={12} md={6} lg={4}>
                    <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 0, border: '1px solid #eee' }}>
                <CardContent>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Next Likely Dividend Day
                        </Typography>
                        <Typography variant="h4" fontWeight={700} color="primary">
                          {(() => {
                            if (sortedData.length < 2) return 'N/A';
                            
                            // Get all dividend dates for the most common month
                            const months = sortedData.map(d => new Date(d.date).getMonth());
                            const mostCommonMonth = months.reduce((a, b) => 
                              months.filter(v => v === a).length >= months.filter(v => v === b).length ? a : b
                            );
                            
                            // Get all payment days for the most common month
                            const paymentDays = sortedData
                              .filter(d => new Date(d.date).getMonth() === mostCommonMonth)
                              .map(d => new Date(d.date).getDate());
                            
                            if (paymentDays.length === 0) return 'N/A';
                            
                            // Calculate the average payment day
                            const avgPaymentDay = Math.round(
                              paymentDays.reduce((sum, day) => sum + day, 0) / paymentDays.length
                            );
                            
                            const currentDate = new Date();
                            const currentMonth = currentDate.getMonth();
                            const currentYear = currentDate.getFullYear();
                            
                            // Create next dividend date
                            let nextDividendDate = new Date(currentYear, mostCommonMonth, avgPaymentDay);
                            
                            // If the most common month has already passed this year, look to next year
                            if (mostCommonMonth < currentMonth) {
                              nextDividendDate.setFullYear(currentYear + 1);
                            }
                            
                            // If we're in the most common month and have passed the average payment day, look to next year
                            if (mostCommonMonth === currentMonth && currentDate.getDate() > avgPaymentDay) {
                              nextDividendDate.setFullYear(currentYear + 1);
                            }
                            
                            return format(nextDividendDate, 'MMMM d, yyyy');
                          })()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
              </CardContent>
            </Card>
          )}
        </Container>

        {/* Footer */}
        <Box sx={{ width: '100%', bgcolor: '#f7fafc', borderTop: '1px solid #eee', py: 2, px: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, color: '#888', mt: 'auto' }}>
          <Box>Maverick Intelligence<br />© 2025 All rights reserved</Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button href="#" sx={{ color: '#888', textDecoration: 'none', mr: 2 }}>Terms</Button>
            <Button href="#" sx={{ color: '#888', textDecoration: 'none', mr: 2 }}>Privacy</Button>
            <Button href="#" sx={{ color: '#888', textDecoration: 'none' }}>Contact</Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
