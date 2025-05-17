import {
  Home,
  BarChart,
  Book,
  Notifications,
  AccountCircle,
  MenuBook,
} from '@mui/icons-material';

export const navLinks = [
  { icon: <Home />, label: 'Home', path: '/' },
  { icon: <BarChart />, label: 'CSE Insights by Maverick', path: '/cse-insights' },
  { icon: <MenuBook />, label: 'Fundamental Analysis', path: '/fundamental-analysis' },
  { icon: <BarChart />, label: 'Technical Analysis', path: '/technical-analysis' },
  { icon: <BarChart />, label: 'Sector Analysis', path: '/sector-analysis' },
  { icon: <Book />, label: 'Guide', path: '/guide' },
  { icon: <Notifications />, label: 'Notifications', path: '/notifications' },
  { icon: <AccountCircle />, label: 'Profile Management', path: '/profile' },
]; 