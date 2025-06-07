'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ShareIcon from '@mui/icons-material/Share';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import Sidebar from '../../components/Sidebar';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

interface PositionItem {
  symbol: string;
  quantity: number;
  besPrice: number;
  priceAlert?: number;
}

interface LatestPrices {
  [symbol: string]: number | null;
}

interface TechnicalData {
  rsi: number;
  rsi_divergence: string;
  relative_strength: number;
  volume_analysis: string;
  volume?: number;
  turnover?: number;
}

interface TechnicalDataMap {
  [symbol: string]: TechnicalData;
}

export default function PositionPage() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newBesPrice, setNewBesPrice] = useState('');
  const [newPriceAlert, setNewPriceAlert] = useState('');
  const [editingItem, setEditingItem] = useState<PositionItem | null>(null);
  const [latestPrices, setLatestPrices] = useState<LatestPrices>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [technicalData, setTechnicalData] = useState<TechnicalDataMap>({});
  const [loadingTechnical, setLoadingTechnical] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load positions from localStorage on component mount
  useEffect(() => {
    const savedPositions = localStorage.getItem('positions');
    if (savedPositions) {
      setPositions(JSON.parse(savedPositions));
    }
    fetchAvailableSymbols();
  }, []);

  // Save positions to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('positions', JSON.stringify(positions));
  }, [positions]);

  // Fetch latest prices and technical data whenever positions change
  useEffect(() => {
    if (positions.length > 0) {
      fetchLatestPrices();
      fetchTechnicalData();
    }
  }, [positions]);

  const fetchLatestPrices = async () => {
    setLoadingPrices(true);
    try {
      const symbols = positions.map(p => p.symbol);
      const response = await fetch(`/api/cse-insights/latest-price-batch?symbols=${symbols.join(',')}`);
      if (!response.ok) {
        throw new Error('Failed to fetch latest prices');
      }
      const data = await response.json();
      setLatestPrices(data);
    } catch (err) {
      console.error('Error fetching latest prices:', err);
      setError('Failed to fetch latest prices');
    } finally {
      setLoadingPrices(false);
    }
  };

  const fetchTechnicalData = async () => {
    setLoadingTechnical(true);
    try {
      const symbols = positions.map(p => p.symbol);
      const latestTechnicalData: TechnicalDataMap = {};
      
      // Process each symbol sequentially
      for (const symbol of symbols) {
        try {
          console.log(`Fetching technical data for ${symbol}`); // Debug log
          const response = await fetch(`https://cse-maverick-be-platform.onrender.com/api/latest-technical-analysis/${symbol}`);
          
          if (!response.ok) {
            console.error(`Failed to fetch technical data for ${symbol}: ${response.status}`);
            continue;
          }
          
          const data = await response.json();
          console.log(`Received data for ${symbol}:`, data); // Debug log
          
          if (data.data) {
            // Create a new object for each symbol's data
            latestTechnicalData[symbol] = {
              rsi: data.data.rsi ?? 50,
              rsi_divergence: data.data.rsi_divergence ?? 'None',
              relative_strength: data.data.relative_strength ?? 1,
              volume_analysis: data.data.volume_analysis ?? 'None',
              volume: data.data.volume ?? undefined,
              turnover: data.data.turnover ?? undefined,
            };
            
            console.log(`Processed data for ${symbol}:`, latestTechnicalData[symbol]); // Debug log
          } else {
            console.warn(`No data available for ${symbol}`);
            // Set default values for this symbol
            latestTechnicalData[symbol] = {
              rsi: 50,
              rsi_divergence: 'None',
              relative_strength: 1,
              volume_analysis: 'None',
              volume: undefined,
              turnover: undefined,
            };
          }
        } catch (err) {
          console.error(`Error fetching technical data for ${symbol}:`, err);
          // Set default values for this symbol in case of error
          latestTechnicalData[symbol] = {
            rsi: 50,
            rsi_divergence: 'None',
            relative_strength: 1,
            volume_analysis: 'None',
            volume: undefined,
            turnover: undefined,
          };
        }
      }
      
      console.log('Final technical data:', latestTechnicalData); // Debug log
      setTechnicalData(latestTechnicalData);
    } catch (err) {
      console.error('Error in fetchTechnicalData:', err);
      setError('Failed to fetch technical data');
    } finally {
      setLoadingTechnical(false);
    }
  };

  const fetchAvailableSymbols = async () => {
    try {
      console.log('Fetching available symbols...');
      const response = await fetch('https://cse-maverick-be-platform.onrender.com/symbols');
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch symbols:', errorText);
        throw new Error('Failed to fetch available symbols');
      }
      const data = await response.json();
      console.log('Received symbols data:', data);
      setAvailableSymbols(data.symbols || []);
    } catch (err) {
      console.error('Error fetching available symbols:', err);
      setError('Failed to load available symbols');
    }
  };

  const handleAddPosition = () => {
    if (!newSymbol.trim()) {
      setError('Please select a symbol');
      return;
    }

    if (!newQuantity.trim() || isNaN(Number(newQuantity)) || Number(newQuantity) <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    if (!newBesPrice.trim() || isNaN(Number(newBesPrice)) || Number(newBesPrice) <= 0) {
      setError('Please enter a valid BES price');
      return;
    }

    // Check if symbol already exists in positions
    if (positions.some(item => item.symbol === newSymbol)) {
      setError('Symbol already in positions');
      return;
    }

    const newItem: PositionItem = {
      symbol: newSymbol.trim().toUpperCase(),
      quantity: Number(newQuantity),
      besPrice: Number(newBesPrice),
      priceAlert: newPriceAlert ? parseFloat(newPriceAlert) : undefined
    };

    setPositions([...positions, newItem]);
    setNewSymbol('');
    setNewQuantity('');
    setNewBesPrice('');
    setNewPriceAlert('');
    setAddDialogOpen(false);
    setSuccess('Position added successfully');
  };

  const handleEditItem = (item: PositionItem) => {
    setEditingItem(item);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;

    const updatedPositions = positions.map(item => 
      item.symbol === editingItem.symbol ? editingItem : item
    );

    setPositions(updatedPositions);
    setEditDialogOpen(false);
    setEditingItem(null);
    setSuccess('Position updated successfully');
  };

  const handleRemovePosition = (symbol: string) => {
    setPositions(positions.filter(item => item.symbol !== symbol));
    setSuccess('Position removed successfully');
  };

  const handleSharePositions = () => {
    if (!shareEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    // In a real implementation, you would send this to your backend
    console.log('Sharing positions with:', shareEmail);
    setShareDialogOpen(false);
    setShareEmail('');
    setSuccess('Positions shared successfully');
  };

  const calculateTotalValue = (quantity: number, price: number) => {
    return quantity * price;
  };

  const calculateProfitLoss = (quantity: number, besPrice: number, latestPrice: number | null) => {
    if (latestPrice === null) return null;
    return (latestPrice - besPrice) * quantity;
  };

  const getDivergenceColor = (divergence: string) => {
    if (divergence.startsWith('Bullish')) return 'success';
    if (divergence.startsWith('Bearish')) return 'error';
    return 'default';
  };

  const getVolumeAnalysisColor = (analysis: string) => {
    if (analysis === 'High Bullish Momentum') return 'success';
    if (analysis === 'Emerging Bullish Momentum') return 'primary';
    return 'default';
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchLatestPrices(),
      fetchTechnicalData()
    ]);
    setRefreshing(false);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f7fafc' }}>
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} isDesktop={isDesktop} />
      <Box sx={{ flexGrow: 1, width: '100%', p: { xs: 2, md: 3 }, overflow: 'auto' }}>
        <Container maxWidth="lg">
          {/* Header Section */}
          <Paper elevation={0} sx={{ p: { xs: 2, md: 4 }, borderRadius: 2, border: '1px solid #eaeaea', backgroundColor: 'white', mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h4" fontWeight={700}>
                My Positions
              </Typography>
              <Box>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddDialogOpen(true)}
                  sx={{ mr: 2 }}
                >
                  Add Position
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                  sx={{ mr: 2 }}
                  disabled={refreshing}
                >
                  {refreshing ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
                  Refresh
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ShareIcon />}
                  onClick={() => setShareDialogOpen(true)}
                >
                  Share
                </Button>
              </Box>
            </Box>

            {/* Positions Table */}
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #eaeaea' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                    <TableCell><Typography fontWeight={600}>Symbol</Typography></TableCell>
                    <TableCell align="right"><Typography fontWeight={600}>Quantity</Typography></TableCell>
                    <TableCell align="right"><Typography fontWeight={600}>BES Price</Typography></TableCell>
                    <TableCell align="right"><Typography fontWeight={600}>Latest Price</Typography></TableCell>
                    <TableCell align="right"><Typography fontWeight={600}>Total Value</Typography></TableCell>
                    <TableCell align="right"><Typography fontWeight={600}>P/L</Typography></TableCell>
                    <TableCell align="right"><Typography fontWeight={600}>Gain %</Typography></TableCell>
                    <TableCell align="right"><Typography fontWeight={600}>Volume</Typography></TableCell>
                    <TableCell align="right"><Typography fontWeight={600}>Turnover</Typography></TableCell>
                    <TableCell align="right"><Typography fontWeight={600}>RSI</Typography></TableCell>
                    <TableCell align="right"><Typography fontWeight={600}>RS</Typography></TableCell>
                    <TableCell align="center"><Typography fontWeight={600}>Divergence</Typography></TableCell>
                    <TableCell align="center"><Typography fontWeight={600}>Volume Analysis</Typography></TableCell>
                    <TableCell align="right"><Typography fontWeight={600}>Actions</Typography></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {positions.map((item) => {
                    const latestPrice = latestPrices[item.symbol];
                    const totalValue = calculateTotalValue(item.quantity, item.besPrice);
                    const profitLoss = calculateProfitLoss(item.quantity, item.besPrice, latestPrice);
                    const techData = technicalData[item.symbol];
                    
                    return (
                      <TableRow key={item.symbol} hover>
                        <TableCell component="th" scope="row">
                          <Typography fontWeight={500}>{item.symbol}</Typography>
                        </TableCell>
                        <TableCell align="right">{item.quantity.toLocaleString()}</TableCell>
                        <TableCell align="right">LKR {item.besPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell align="right">
                          {loadingPrices ? (
                            <CircularProgress size={20} />
                          ) : latestPrice !== undefined ? (
                            `LKR ${latestPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell align="right">LKR {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell align="right">
                          {profitLoss !== null ? (
                            <Typography
                              color={profitLoss >= 0 ? 'success.main' : 'error.main'}
                            >
                              LKR {profitLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Typography>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {profitLoss !== null && latestPrice !== null ? (
                            <Typography
                              color={profitLoss >= 0 ? 'success.main' : 'error.main'}
                            >
                              {((profitLoss / (item.quantity * item.besPrice)) * 100).toFixed(2)}%
                            </Typography>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {loadingTechnical ? (
                            <CircularProgress size={20} />
                          ) : techData && techData.volume !== undefined && techData.volume !== null ? (
                            techData.volume.toLocaleString()
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {loadingTechnical ? (
                            <CircularProgress size={20} />
                          ) : techData && techData.turnover !== undefined && techData.turnover !== null ? (
                            `LKR ${techData.turnover.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {loadingTechnical ? (
                            <CircularProgress size={20} />
                          ) : techData ? (
                            techData.rsi.toFixed(1)
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {loadingTechnical ? (
                            <CircularProgress size={20} />
                          ) : techData ? (
                            <Typography
                              color={techData.relative_strength >= 1 ? 'success.main' : 'inherit'}
                            >
                              {techData.relative_strength.toFixed(2)}
                            </Typography>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {loadingTechnical ? (
                            <CircularProgress size={20} />
                          ) : techData ? (
                            <Chip
                              label={techData.rsi_divergence}
                              size="small"
                              color={getDivergenceColor(techData.rsi_divergence)}
                              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                            />
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {loadingTechnical ? (
                            <CircularProgress size={20} />
                          ) : techData ? (
                            <Chip
                              label={techData.volume_analysis}
                              size="small"
                              color={getVolumeAnalysisColor(techData.volume_analysis)}
                              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                            />
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            onClick={() => handleEditItem(item)}
                            size="small"
                            sx={{ mr: 1 }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => handleRemovePosition(item.symbol)}
                            size="small"
                            disabled={loading}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {positions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={14} align="center" sx={{ py: 3 }}>
                        <Typography color="text.secondary">
                          No positions added yet. Click "Add Position" to get started.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Container>

        {/* Add Position Dialog */}
        <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
          <DialogTitle>Add New Position</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Symbol</InputLabel>
              <Select
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                label="Symbol"
              >
                {availableSymbols.map((symbol) => (
                  <MenuItem key={symbol} value={symbol}>{symbol}</MenuItem>
                ))}
              </Select>
            </FormControl>
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
            <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddPosition}
              variant="contained"
              disabled={loading}
            >
              Add
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
          <DialogTitle>Edit Position</DialogTitle>
          <DialogContent>
            {editingItem && (
              <>
                <TextField
                  fullWidth
                  label="Quantity"
                  type="number"
                  value={editingItem.quantity}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    quantity: Number(e.target.value)
                  })}
                  sx={{ mt: 2 }}
                />
                <TextField
                  fullWidth
                  label="BES Price"
                  type="number"
                  value={editingItem.besPrice}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    besPrice: Number(e.target.value)
                  })}
                  sx={{ mt: 2 }}
                />
                <TextField
                  fullWidth
                  label="Price Alert (optional)"
                  type="number"
                  value={editingItem.priceAlert || ''}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    priceAlert: e.target.value ? Number(e.target.value) : undefined
                  })}
                  sx={{ mt: 2 }}
                />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveEdit}
              variant="contained"
              disabled={loading}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Share Dialog */}
        <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)}>
          <DialogTitle>Share Positions</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShareDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSharePositions}
              variant="contained"
              disabled={loading}
            >
              Share
            </Button>
          </DialogActions>
        </Dialog>

        {/* Notifications */}
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError('')}
        >
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </Snackbar>
        <Snackbar
          open={!!success}
          autoHideDuration={6000}
          onClose={() => setSuccess('')}
        >
          <Alert severity="success" onClose={() => setSuccess('')}>
            {success}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
} 