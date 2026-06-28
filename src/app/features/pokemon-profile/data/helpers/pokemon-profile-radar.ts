import type { EChartsOption } from 'echarts';
import { MAX_STAT_VALUE } from '../constants/pokemon-profile.constants';

interface MiniStat {
  stat?: {
    name?: string;
  };
}

export function createRadarChartOptions(
  stats: readonly MiniStat[],
  values: readonly number[],
  pokemonName: string,
  t: (key: string) => string,
): EChartsOption {
  const indicators = stats.map((s) => ({
    name: s.stat?.name ?? '',
    max: MAX_STAT_VALUE,
  }));

  return {
    animationDuration: 350,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'var(--tui-background-elevated)',
      borderColor: 'var(--tui-border-normal)',
      textStyle: {
        color: 'var(--tui-text-primary)',
        fontFamily: 'var(--tui-font-texts)',
        fontSize: 12,
      },
    },
    radar: {
      shape: 'polygon',
      indicator: indicators,
      center: ['50%', '50%'],
      radius: '70%',
      axisName: {
        color: 'var(--tui-text-secondary)',
        fontFamily: 'var(--tui-font-heading)',
        fontSize: 11,
        fontWeight: 'normal',
        formatter: (value?: string) => t(`pokemonProfile.${value ?? ''}`),
      },
      splitLine: {
        lineStyle: { color: 'var(--tui-border-normal)' },
      },
      splitArea: {
        show: true,
        areaStyle: { color: ['transparent', 'rgba(0, 0, 0, 0.01)'] },
      },
      axisLine: {
        lineStyle: { color: 'var(--tui-border-normal)' },
      },
    },
    series: [
      {
        type: 'radar',
        symbol: 'circle',
        symbolSize: 5,
        data: [
          {
            name: pokemonName.toUpperCase(),
            value: values as number[],
            itemStyle: { color: 'var(--accent)' },
            lineStyle: { width: 2 },
            areaStyle: {
              color: 'var(--accent)',
              opacity: 0.2,
            },
          },
        ],
      },
    ],
  };
}
