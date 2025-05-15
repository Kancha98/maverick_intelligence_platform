'use client';

import { useState } from 'react';
import {
  Box, Typography, Container, Paper, Button, Divider, Stepper,
  Step, StepLabel, StepContent, Card, CardContent, List, ListItem,
  ListItemIcon, ListItemText, Accordion, AccordionSummary, AccordionDetails,
  Grid, Chip, Alert, Link
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PriceChangeIcon from '@mui/icons-material/PriceChange';
import SearchIcon from '@mui/icons-material/Search';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import NextLink from 'next/link';
import Sidebar from '../../components/Sidebar';
import { useMediaQuery, useTheme } from '@mui/material';

export default function GuidePage() {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  const steps = [
    {
      label: 'Start with Technical Analysis',
      description: `Begin by visiting the Technical Analysis page where stocks are categorized into different tiers based on technical indicators. This powerful page helps you identify potential opportunities in minutes instead of hours of manual research.`,
      details: (
        <Box>
          <Typography variant="body2" paragraph>
            The Technical Analysis page uses sophisticated algorithms to analyze stock price and volume patterns, 
            presenting you with pre-filtered groups of stocks that show promising technical setups.
          </Typography>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
            Key Features:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><TrendingUpIcon color="primary" /></ListItemIcon>
              <ListItemText 
                primary="Bullish Volumes" 
                secondary="Stocks showing increased trading activity and potential momentum" 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><PriceChangeIcon color="success" /></ListItemIcon>
              <ListItemText 
                primary="Potential Reversals" 
                secondary="Stocks showing RSI divergence, indicating possible trend changes" 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><ShowChartIcon color="secondary" /></ListItemIcon>
              <ListItemText 
                primary="Top Performers" 
                secondary="Liquid stocks with bullish momentum and strong relative strength" 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><SearchIcon color="info" /></ListItemIcon>
              <ListItemText 
                primary="DIY Analysis" 
                secondary="Create your own custom filters for precise stock screening" 
              />
            </ListItem>
          </List>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Time-Saving Tip:</strong> Focus on the "Top Performers" section first to see stocks that have both bullish volume and price action stronger than the overall market.
            </Typography>
          </Alert>
        </Box>
      )
    },
    {
      label: 'Apply Date Filtering and Search',
      description: `Use the date filter to focus on a specific day's data. This allows you to analyze price action from particularly interesting market sessions. The symbol search helps you quickly find specific stocks.`,
      details: (
        <Box>
          <Typography variant="body2" paragraph>
            Date filtering provides a snapshot of market conditions on a specific day, allowing you to see which stocks were showing technical strength at that time.
          </Typography>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
            How to use:
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Date Filtering
                </Typography>
                <Typography variant="body2">
                  1. Select a date using the calendar control<br />
                  2. Click "Apply Filter"<br />
                  3. The platform will load data specific to that date
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Symbol Search
                </Typography>
                <Typography variant="body2">
                  1. Enter a stock symbol or partial text<br />
                  2. The tables will automatically filter<br />
                  3. Works across all tabs and sections
                </Typography>
              </Box>
            </Grid>
          </Grid>
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Pro Tip:</strong> When major market events occur, use date filtering to identify which stocks showed strength or resilience during that session.
            </Typography>
          </Alert>
        </Box>
      )
    },
    {
      label: 'Dive into DIY Analysis',
      description: `For advanced filtering, use the DIY Analysis tab to combine multiple technical criteria. This powerful feature gives you precise control over your stock screening process.`,
      details: (
        <Box>
          <Typography variant="body2" paragraph>
            The DIY Analysis section allows you to apply multiple filters simultaneously to find stocks that meet your specific technical criteria. This can dramatically reduce your research time.
          </Typography>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
            Available Filters:
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Basic Filters
                  </Typography>
                  <List dense disablePadding>
                    <ListItem disablePadding>
                      <ListItemText primary="Symbol" secondary="Filter by specific stock" />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemText primary="RSI Range" secondary="Set RSI boundaries" />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemText primary="Divergence" secondary="Bullish or Bearish patterns" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Volume Filters
                  </Typography>
                  <List dense disablePadding>
                    <ListItem disablePadding>
                      <ListItemText primary="Volume Analysis" secondary="Momentum classifications" />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemText primary="Turnover Range" secondary="From 100K to 100M+" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Technical Indicators
                  </Typography>
                  <List dense disablePadding>
                    <ListItem disablePadding>
                      <ListItemText primary="EMA Filters" secondary="Price above key moving averages" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Time-Saving Strategy:</strong> Start with broader filters and gradually add more specific criteria to narrow your results. This top-down approach helps you quickly discover potential candidates.
            </Typography>
          </Alert>
        </Box>
      )
    },
    {
      label: 'Understand the Key Indicators',
      description: `Learn what each technical indicator means to make informed decisions. The platform provides explanations of all key metrics in the Legend section.`,
      details: (
        <Box>
          <Typography variant="body2" paragraph>
            Understanding the technical indicators is crucial for effective stock selection. The platform provides detailed explanations in the Legend section at the bottom of the Technical Analysis page.
          </Typography>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
            Key Indicators Explained:
          </Typography>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Relative Strength (RS)</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2">
                A momentum indicator that compares a stock's performance to the overall market. Values above 1 indicate the stock is outperforming the market, while values below 1 show underperformance.
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Bullish/Bearish Divergence</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2">
                <strong>Bullish Divergence:</strong> When price makes lower lows but RSI makes higher lows, signaling potential upward reversal.<br />
                <strong>Bearish Divergence:</strong> When price makes higher highs but RSI makes lower highs, signaling potential downward reversal.
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Volume Analysis</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2">
                <strong>Emerging Bullish Momentum:</strong> Sudden increase in buying activity compared to weekly averages.<br />
                <strong>High Bullish Momentum:</strong> Breakout buying activity, significantly higher than weekly or monthly averages.<br />
                <strong>Increase in Weekly Volume:</strong> Gradual increase in trading volume compared to weekly average.
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>EMAs (Exponential Moving Averages)</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2">
                <strong>EMA 20:</strong> Short-term trend indicator.<br />
                <strong>EMA 50:</strong> Medium-term trend indicator.<br />
                <strong>EMA 100:</strong> Long-term trend indicator.<br />
                <strong>EMA 200:</strong> Very long-term trend indicator, often used to identify major support or resistance.
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Research Shortcut:</strong> Focus on stocks with both technical and volume strength. When price is above key EMAs (particularly 50 and 200) with increasing volume, it often indicates strong bullish momentum.
            </Typography>
          </Alert>
        </Box>
      )
    },
    {
      label: 'Create a Watchlist',
      description: `After identifying potential stocks, create a focused watchlist of candidates for further fundamental analysis or trading opportunities.`,
      details: (
        <Box>
          <Typography variant="body2" paragraph>
            The final step is creating a focused watchlist of the most promising candidates. This typically consists of 5-10 stocks that deserve closer attention.
          </Typography>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
            Recommended Watchlist Structure:
          </Typography>
          <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2, mb: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Strong Momentum Stocks (2-3)
                </Typography>
                <Typography variant="body2">
                  Stocks from the Top Performers section with high RS values and increasing volume
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="success" gutterBottom>
                  Potential Reversal Plays (2-3)
                </Typography>
                <Typography variant="body2">
                  Stocks from the Potential Reversals section showing bullish divergence
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="secondary" gutterBottom>
                  Custom Filter Results (2-3)
                </Typography>
                <Typography variant="body2">
                  Stocks from DIY Analysis section based on your personal criteria
                </Typography>
              </Grid>
            </Grid>
          </Box>
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Time Management:</strong> With this streamlined approach, your entire stock selection process should take less than 10 minutes, compared to hours of manual screening. Review your watchlist daily for entries and exits.
            </Typography>
          </Alert>
        </Box>
      )
    },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f7fafc' }}>
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} isDesktop={isDesktop} />
      
      <Box sx={{ 
        flexGrow: 1, 
        width: '100%', 
        p: { xs: 2, md: 3 }, 
        overflow: 'auto'
      }}>
        <Container maxWidth="lg">
          <Paper 
            elevation={0} 
            sx={{ 
              p: { xs: 2, md: 4 }, 
              mb: 4, 
              borderRadius: 2, 
              border: '1px solid #eaeaea',
              backgroundColor: 'white'
            }}
          >
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
                CSE Predictor Platform Guide
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Cut stock selection time from hours to under 10 minutes
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <AccessTimeIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="body2" color="primary" fontWeight={600}>
                  Faster analysis. Better decisions. Superior results.
                </Typography>
              </Box>
            </Box>

            {/* Key Benefits */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Why CSE Predictor Outperforms Other Platforms
              </Typography>
              
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12} md={4}>
                  <Card sx={{ height: '100%', bgcolor: '#f8fafc' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <AccessTimeIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6" fontWeight={600}>
                          90% Time Reduction
                        </Typography>
                      </Box>
                      <Typography variant="body2">
                        Cut analysis time from hours to minutes with pre-filtered technical setups and intelligent categorization.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card sx={{ height: '100%', bgcolor: '#f8fafc' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <ShowChartIcon color="success" sx={{ mr: 1 }} />
                        <Typography variant="h6" fontWeight={600}>
                          Superior Detection
                        </Typography>
                      </Box>
                      <Typography variant="body2">
                        Uncovers technical patterns other platforms miss, with precise RSI divergence identification and volume analysis.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card sx={{ height: '100%', bgcolor: '#f8fafc' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <TrendingUpIcon color="error" sx={{ mr: 1 }} />
                        <Typography variant="h6" fontWeight={600}>
                          Sri Lanka Focused
                        </Typography>
                      </Box>
                      <Typography variant="body2">
                        Specifically optimized for CSE market dynamics with LKR currency display and local market patterns.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ mb: 4 }} />

            {/* How It Works */}
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Fast-Track Stock Selection Process
            </Typography>
            
            <List>
              <ListItem>
                <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                <ListItemText 
                  primary={<Typography fontWeight={600}>Start: Technical Analysis Dashboard</Typography>}
                  secondary="Pre-filtered stock categories save hours of manual screening. Instantly see bullish volume patterns, potential reversals, and top performers." 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                <ListItemText 
                  primary={<Typography fontWeight={600}>Apply Date Filters</Typography>}
                  secondary="Focus on specific market sessions to identify emerging opportunities. Use the exact date filter for precise analysis." 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                <ListItemText 
                  primary={<Typography fontWeight={600}>Customize with DIY Filters</Typography>}
                  secondary="Combine multiple technical criteria in seconds that would take hours manually. Filter by RSI, price-EMA relationships, and volume patterns simultaneously." 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                <ListItemText 
                  primary={<Typography fontWeight={600}>Create 5-10 Stock Watchlist</Typography>}
                  secondary="Focus on the most promising candidates in minutes, not hours. Includes a balanced mix of momentum plays and potential reversals." 
                />
              </ListItem>
            </List>

            <Alert severity="success" sx={{ my: 3 }}>
              <Typography variant="body2">
                <strong>10-Minute Process:</strong> What used to take 3+ hours of manual chart analysis can now be accomplished in under 10 minutes with CSE Predictor.
              </Typography>
            </Alert>

            {/* Competitive Advantages */}
            <Box sx={{ mt: 4, mb: 4 }}>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Advantages Over Other Platforms
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography fontWeight={600} gutterBottom>
                        vs. Traditional Stock Screeners
                      </Typography>
                      <List dense disablePadding>
                        <ListItem disablePadding>
                          <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                          <ListItemText secondary="Auto-categorizes stocks by technical setup vs. manual filtering" />
                        </ListItem>
                        <ListItem disablePadding>
                          <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                          <ListItemText secondary="Detects complex patterns like divergence automatically" />
                        </ListItem>
                        <ListItem disablePadding>
                          <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                          <ListItemText secondary="Presents pre-analyzed results vs. overwhelming data tables" />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography fontWeight={600} gutterBottom>
                        vs. Charting Platforms
                      </Typography>
                      <List dense disablePadding>
                        <ListItem disablePadding>
                          <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                          <ListItemText secondary="Reviews hundreds of stocks simultaneously vs. one at a time" />
                        </ListItem>
                        <ListItem disablePadding>
                          <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                          <ListItemText secondary="Identifies relative strength automatically" />
                        </ListItem>
                        <ListItem disablePadding>
                          <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                          <ListItemText secondary="Eliminates 90% of manual chart review time" />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>

            {/* Key Features */}
            <Box sx={{ mt: 4, mb: 4 }}>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Key Features That Save You Time
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2, height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                      <Typography fontWeight={600}>
                        Bullish Volumes
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Instantly find stocks with increasing trading activity and momentum
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2, height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PriceChangeIcon color="primary" sx={{ mr: 1 }} />
                      <Typography fontWeight={600}>
                        Potential Reversals
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Automatically detect RSI divergence patterns that predict trend changes
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2, height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <ShowChartIcon color="primary" sx={{ mr: 1 }} />
                      <Typography fontWeight={600}>
                        Top Performers
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      See stocks outperforming the market with strong relative strength
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2, height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <AccessTimeIcon color="primary" sx={{ mr: 1 }} />
                      <Typography fontWeight={600}>
                        Advanced Filters
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Combine multiple technical criteria in seconds instead of hours
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
            
            {/* Get Started Button */}
            <Box sx={{ mt: 5, textAlign: 'center' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Button 
                  component={NextLink}
                  href="/technical-analysis" 
                  variant="contained" 
                  size="large"
                  sx={{ px: 3, py: 1 }}
                >
                  Technical Analysis
                </Button>
                <Button 
                  component={NextLink}
                  href="/cse-predictor" 
                  variant="outlined"
                  size="large" 
                  sx={{ px: 3, py: 1 }}
                >
                  CSE Predictor
                </Button>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Cut your stock selection time by 90% today
              </Typography>
            </Box>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}