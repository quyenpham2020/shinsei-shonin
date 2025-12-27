import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { revenueService, RevenueRecord } from '../services/revenueService';
import { customerService, Customer } from '../services/customerService';
import { useTranslation } from 'react-i18next';

interface MonthlyData {
  month: string;
  revenue: number;
  mm: number;
  year: number;
  monthNum: number;
}

interface CustomerData {
  name: string;
  revenue: number;
  mm: number;
}

interface YearOverYearData {
  month: string;
  currentYear: number;
  lastYear: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#ff7c7c'];

const RevenueStatsPage: React.FC = () => {
  const { t } = useTranslation();
  const [records, setRecords] = useState<RevenueRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<number>(0);
  const [viewPeriod, setViewPeriod] = useState<'6months' | '12months' | '24months'>('12months');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [selectedCustomer]);

  const fetchData = async () => {
    try {
      const [revenueData, customerData] = await Promise.all([
        selectedCustomer > 0
          ? revenueService.getByCustomer(selectedCustomer)
          : revenueService.getAll(),
        customerService.getAll(),
      ]);
      setRecords(revenueData);
      setCustomers(customerData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare monthly trend data
  const getMonthlyTrendData = (): MonthlyData[] => {
    const monthsToShow = viewPeriod === '6months' ? 6 : viewPeriod === '12months' ? 12 : 24;
    const now = new Date();
    const monthlyMap = new Map<string, MonthlyData>();

    // Initialize last N months
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, {
        month: `${date.getFullYear()}/${date.getMonth() + 1}`,
        revenue: 0,
        mm: 0,
        year: date.getFullYear(),
        monthNum: date.getMonth() + 1,
      });
    }

    // Fill with actual data
    records.forEach((record) => {
      const key = `${record.year}-${String(record.month).padStart(2, '0')}`;
      if (monthlyMap.has(key)) {
        const existing = monthlyMap.get(key)!;
        existing.revenue += record.total_amount;
        existing.mm += record.mm_onsite + record.mm_offshore;
      }
    });

    return Array.from(monthlyMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthNum - b.monthNum;
    });
  };

  // Prepare year-over-year comparison
  const getYearOverYearData = (): YearOverYearData[] => {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    const monthlyData: YearOverYearData[] = [];

    for (let month = 1; month <= 12; month++) {
      const currentYearRevenue = records
        .filter((r) => r.year === currentYear && r.month === month)
        .reduce((sum, r) => sum + r.total_amount, 0);

      const lastYearRevenue = records
        .filter((r) => r.year === lastYear && r.month === month)
        .reduce((sum, r) => sum + r.total_amount, 0);

      monthlyData.push({
        month: `${month}月`,
        currentYear: currentYearRevenue,
        lastYear: lastYearRevenue,
      });
    }

    return monthlyData;
  };

  // Prepare customer breakdown
  const getCustomerBreakdown = (): CustomerData[] => {
    const customerMap = new Map<string, CustomerData>();

    records.forEach((record) => {
      if (!customerMap.has(record.customer_name)) {
        customerMap.set(record.customer_name, {
          name: record.customer_name,
          revenue: 0,
          mm: 0,
        });
      }
      const customer = customerMap.get(record.customer_name)!;
      customer.revenue += record.total_amount;
      customer.mm += record.mm_onsite + record.mm_offshore;
    });

    return Array.from(customerMap.values()).sort((a, b) => b.revenue - a.revenue);
  };

  // Calculate quarterly data
  const getQuarterlyData = () => {
    const currentYear = new Date().getFullYear();
    const quarters = [
      { name: 'Q1', months: [1, 2, 3] },
      { name: 'Q2', months: [4, 5, 6] },
      { name: 'Q3', months: [7, 8, 9] },
      { name: 'Q4', months: [10, 11, 12] },
    ];

    return quarters.map((q) => {
      const currentYearRevenue = records
        .filter((r) => r.year === currentYear && q.months.includes(r.month))
        .reduce((sum, r) => sum + r.total_amount, 0);

      const lastYearRevenue = records
        .filter((r) => r.year === currentYear - 1 && q.months.includes(r.month))
        .reduce((sum, r) => sum + r.total_amount, 0);

      return {
        quarter: q.name,
        [currentYear]: currentYearRevenue,
        [currentYear - 1]: lastYearRevenue,
      };
    });
  };

  // Simple prediction using moving average
  const getPrediction = (months: number = 3): MonthlyData[] => {
    const monthlyData = getMonthlyTrendData();
    if (monthlyData.length < 3) return [];

    // Calculate average revenue growth rate
    const recentData = monthlyData.slice(-6);
    const avgRevenue =
      recentData.reduce((sum, d) => sum + d.revenue, 0) / recentData.length;

    const predictions: MonthlyData[] = [];
    const lastMonth = monthlyData[monthlyData.length - 1];
    const lastDate = new Date(lastMonth.year, lastMonth.monthNum - 1);

    for (let i = 1; i <= months; i++) {
      const predDate = new Date(lastDate.getFullYear(), lastDate.getMonth() + i, 1);
      predictions.push({
        month: `${predDate.getFullYear()}/${predDate.getMonth() + 1} (予測)`,
        revenue: avgRevenue,
        mm: 0,
        year: predDate.getFullYear(),
        monthNum: predDate.getMonth() + 1,
      });
    }

    return predictions;
  };

  const monthlyTrend = getMonthlyTrendData();
  const yearOverYear = getYearOverYearData();
  const customerBreakdown = getCustomerBreakdown();
  const quarterlyData = getQuarterlyData();
  const predictions = getPrediction(3);
  const trendWithPrediction = [...monthlyTrend, ...predictions];

  const totalRevenue = records.reduce((sum, r) => sum + r.total_amount, 0);
  const totalMM = records.reduce((sum, r) => sum + r.mm_onsite + r.mm_offshore, 0);
  const avgUnitPrice = totalMM > 0 ? totalRevenue / totalMM : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{t('revenue:stats.title')}</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>{t('revenue:stats.customerFilter')}</InputLabel>
            <Select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(Number(e.target.value))}
              label={t('revenue:stats.customerFilter')}
            >
              <MenuItem value={0}>{t('revenue:stats.allCustomers')}</MenuItem>
              {customers.map((customer) => (
                <MenuItem key={customer.id} value={customer.id}>
                  {customer.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <ToggleButtonGroup
            value={viewPeriod}
            exclusive
            onChange={(e, newPeriod) => newPeriod && setViewPeriod(newPeriod)}
            size="small"
          >
            <ToggleButton value="6months">{t('revenue:stats.6months')}</ToggleButton>
            <ToggleButton value="12months">{t('revenue:stats.12months')}</ToggleButton>
            <ToggleButton value="24months">{t('revenue:stats.24months')}</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                {t('revenue:stats.totalRevenue')}
              </Typography>
              <Typography variant="h5" color="primary">
                {formatCurrency(totalRevenue)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                {t('revenue:stats.totalMM')}
              </Typography>
              <Typography variant="h5" color="success.main">
                {totalMM.toFixed(2)} MM
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                {t('revenue:stats.avgUnitPrice')}
              </Typography>
              <Typography variant="h5" color="info.main">
                {formatCurrency(avgUnitPrice)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                {t('revenue:stats.customerCount')}
              </Typography>
              <Typography variant="h5" color="warning.main">
                {customerBreakdown.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Monthly Trend with Prediction */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {t('revenue:stats.monthlyTrend')} <Chip label={t('revenue:stats.forecastIncluded')} size="small" color="secondary" sx={{ ml: 1 }} />
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trendWithPrediction}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value) => `¥${(value / 1000000).toFixed(1)}M`} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#8884d8"
              fill="#8884d8"
              name={t('revenue:stats.revenue')}
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Paper>

      {/* Year-over-Year Comparison */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {t('revenue:stats.yearOverYear')}
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={yearOverYear}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value) => `¥${(value / 1000000).toFixed(1)}M`} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Bar dataKey="currentYear" fill="#8884d8" name={`${new Date().getFullYear()}年`} />
            <Bar dataKey="lastYear" fill="#82ca9d" name={`${new Date().getFullYear() - 1}年`} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      <Grid container spacing={3}>
        {/* Quarterly Comparison */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('revenue:stats.quarterlyComparison')}
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={quarterlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quarter" />
                <YAxis tickFormatter={(value) => `¥${(value / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey={new Date().getFullYear()} fill="#8884d8" />
                <Bar dataKey={new Date().getFullYear() - 1} fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Customer Breakdown */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('revenue:stats.revenueByCustomer')}
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={customerBreakdown}
                  dataKey="revenue"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => entry.name}
                >
                  {customerBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RevenueStatsPage;
