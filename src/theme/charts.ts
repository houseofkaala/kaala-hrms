/** Recharts palette — Apple light theme */
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

export const CHART = CHART_LIGHT;

export function useChartTheme() {
  const palette = CHART_LIGHT;
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