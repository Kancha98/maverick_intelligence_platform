'use client';

import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Box,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  AccountBalance as AccountBalanceIcon,
  School as SchoolIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import { usePathname, useRouter } from 'next/navigation';
import { styled } from '@mui/material/styles';

const drawerWidth = 240;

const StyledDrawer = styled(Drawer)({
  width: drawerWidth,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    borderRight: '1px solid rgba(0, 0, 0, 0.12)',
  },
});

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Market Analysis', icon: <TrendingUpIcon />, path: '/market-analysis' },
  { text: 'Portfolio', icon: <AssessmentIcon />, path: '/portfolio' },
  { text: 'Trading Tools', icon: <AccountBalanceIcon />, path: '/trading-tools' },
  { text: 'Learning Center', icon: <SchoolIcon />, path: '/learning' },
];

const Sidebar = () => {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <StyledDrawer variant="permanent">
      <Box sx={{ overflow: 'auto', mt: 8 }}>
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={pathname === item.path}
                onClick={() => router.push(item.path)}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(25, 118, 210, 0.08)',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.12)',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: pathname === item.path ? '#1976d2' : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{
                    color: pathname === item.path ? '#1976d2' : 'inherit',
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider />
        <List>
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <HelpIcon />
              </ListItemIcon>
              <ListItemText primary="Help & Support" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </StyledDrawer>
  );
};

export default Sidebar; 