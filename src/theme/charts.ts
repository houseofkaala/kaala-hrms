import { useThemeStore } from '../theme';

export const CHART_LIGHT = {
  gold: '#007aff',
  goldLight: '#409cff',
  goldMuted: '#86868b',
  goldDim: '#0056b3',
  ivory: '#1d1d1f',
  ivoryMuted: '#86868b',
  grid: 'rgba(0, 0, 0, 0.06)',
  tooltipBg: '#ffffff',
  tooltipBorder: 'rgba(0, 0, 0, 0.1)',
  series: ['#007aff', '#34c759', '#ff9500', '#5856d6', '#ff2d55'],
};

export const CHART_DARK = {
  gold: '#0a84ff',
  goldLight: '#409cff',
  goldMuted: '#98989d',
  goldDim: '#0066cc',
  ivory: '#f5f5f7',
  ivoryMuted: '#98989d',
  grid: 'rgba(255, 255, 255, 0.08)',
  tooltipBg: '#1c1c1e',
  tooltipBorder: 'rgba(255, 255, 255, 0.12)',
  series: ['#0a84ff', '#30d158', '#ff9f0a', '#5e5ce6', '#ff375f'],
};

export const CHART = CHART_LIGHT;

export function useChartTheme() {
  const theme = useThemeStore(s => s.theme);
  const palette = theme === 'light' ? CHART_LIGHT : CHART_DARK;
  return {
    CHART: palette,
    chartTooltipStyle: {
      backgroundColor: palette.tooltipBg,
      border: `1px solid ${palette.tooltipBorder}`,
      borderRadius: '12px',
      fontSize: '12px',
      color: palette.ivory,
    },
  };
}

export const chartTooltipStyle = {
  backgroundColor: CHART_LIGHT.tooltipBg,
  border: `1px solid ${CHART_LIGHT.tooltipBorder}`,
  borderRadius: '12px',
  fontSize: '12px',
  color: CHART_LIGHT.ivory,
};