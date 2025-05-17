import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
} from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

interface SectorMomentumGainsProps {
  data: {
    sector: string;
    sector_momentum: number;
    momentum_gains: {
      threeDay: number | null;
      fiveDay: number | null;
      tenDay: number | null;
    };
  }[];
}

const SectorMomentumGains: React.FC<SectorMomentumGainsProps> = ({ data }) => {
  const formatPercentage = (value: number | null) => {
    if (value === null) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  const getTrendIcon = (value: number | null) => {
    if (value === null) return null;
    return value > 0 ? (
      <TrendingUp color="success" />
    ) : value < 0 ? (
      <TrendingDown color="error" />
    ) : null;
  };

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Sector Momentum Gains
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Sector</TableCell>
              <TableCell align="right">Current Momentum</TableCell>
              <TableCell align="right">3-Day Gain</TableCell>
              <TableCell align="right">5-Day Gain</TableCell>
              <TableCell align="right">10-Day Gain</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.sector}>
                <TableCell component="th" scope="row">
                  {row.sector}
                </TableCell>
                <TableCell align="right">
                  {(row.sector_momentum * 100).toFixed(2)}%
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {getTrendIcon(row.momentum_gains?.threeDay)}
                    <Box sx={{ ml: 1 }}>{formatPercentage(row.momentum_gains?.threeDay ?? null)}</Box>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {getTrendIcon(row.momentum_gains?.fiveDay)}
                    <Box sx={{ ml: 1 }}>{formatPercentage(row.momentum_gains?.fiveDay ?? null)}</Box>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {getTrendIcon(row.momentum_gains?.tenDay)}
                    <Box sx={{ ml: 1 }}>{formatPercentage(row.momentum_gains?.tenDay ?? null)}</Box>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default SectorMomentumGains; 