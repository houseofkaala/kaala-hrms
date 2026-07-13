import { useThemeStore } from '../theme';

/** Shared Recharts palette — antique gold on obsidian */
export const CHART_DARK = {
  gold: '#c9a962',
  goldLight: '#e8d5a3',
  goldMuted: '#8a7340',
  goldDim: '#5c4d2a',
  ivory: '#f5f0e8',
  ivoryMuted: '#8a8680',
  grid: 'rgba(201, 169, 98, 0.08)',
  tooltipBg: '#1a1a1e',
  tooltipBorder: 'rgba(201, 169, 98, 0.2)',
  series: ['#c9a962', '#e8d5a3', '#8a7340', '#a89050', '#6b5a30'],
};

export const CHART_LIGHT = {
  gold: '#a88b3d',
  goldLight: '#c9a962',
  goldMuted: '#8a7340',
  goldDim: '#6b5a30',
  ivory: '#1a1814',
  ivoryMuted: '#6b6560',
  grid: 'rgba(168, 139, 61, 0.12)',
  tooltipBg: '#ffffff',
  tooltipBorder: 'rgba(168, 139, 61, 0.25)',
  series: ['#a88b3d', '#c9a962', '#8a7340', '#b89a50', '#7a6530'],
};

export const CHART = CHART_DARK;

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
  backgroundColor: CHART_DARK.tooltipBg,
  border: `1px solid ${CHART_DARK.tooltipBorder}`,
  borderRadius: '12px',
  fontSize: '12px',
  color: CHART_DARK.ivory,
};