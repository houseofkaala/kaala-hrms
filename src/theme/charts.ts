/** Shared Recharts palette — antique gold on obsidian */
export const CHART = {
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

export const chartTooltipStyle = {
  backgroundColor: CHART.tooltipBg,
  border: `1px solid ${CHART.tooltipBorder}`,
  borderRadius: '12px',
  fontSize: '12px',
  color: CHART.ivory,
};