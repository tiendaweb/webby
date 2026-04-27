import { useState } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useChartColors } from '@/hooks/useChartColors';
import { useTranslation } from '@/contexts/LanguageContext';
import type { TrendData } from '@/types/admin';

interface TrendLineChartProps {
    data: TrendData;
}

type TrendType = 'revenue' | 'users' | 'projects';

const formatters: Record<TrendType, (value: number) => string> = {
    revenue: (value) => `$${value.toFixed(0)}`,
    users: (value) => value.toString(),
    projects: (value) => value.toString(),
};

const chartColors: Record<TrendType, string> = {
    revenue: '#10B981',
    users: '#3B82F6',
    projects: '#8B5CF6',
};

export function TrendLineChart({ data }: TrendLineChartProps) {
    const colors = useChartColors();
    const { t, locale, isRtl } = useTranslation();
    const [activeTab, setActiveTab] = useState<TrendType>('revenue');

    const labels: Record<TrendType, string> = {
        revenue: t('Revenue'),
        users: t('New Users'),
        projects: t('New Projects'),
    };
    const chartData = data[activeTab];
    const formatter = formatters[activeTab];
    const color = chartColors[activeTab];

    const hasData = chartData.length > 0 && chartData.some((d) => d.value > 0);

    return (
        <div className="space-y-4">
            <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as TrendType)}
            >
                <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="revenue">{t('Revenue')}</TabsTrigger>
                    <TabsTrigger value="users">{t('Users')}</TabsTrigger>
                    <TabsTrigger value="projects">{t('Projects')}</TabsTrigger>
                </TabsList>
            </Tabs>

            {!hasData ? (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                    {t('No :type data for this period', { type: labels[activeTab].toLowerCase() })}
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={250}>
                    <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient
                                id={`gradient-${activeTab}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="5%"
                                    stopColor={color}
                                    stopOpacity={0.3}
                                />
                                <stop
                                    offset="95%"
                                    stopColor={color}
                                    stopOpacity={0}
                                />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={colors.border}
                            vertical={false}
                        />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: colors.mutedForeground }}
                            axisLine={{ stroke: colors.border }}
                            tickLine={false}
                            tickFormatter={(value) => {
                                const date = new Date(value);
                                return date.toLocaleDateString(locale, {
                                    month: 'short',
                                    day: 'numeric',
                                });
                            }}
                            interval="preserveStartEnd"
                            minTickGap={40}
                            reversed={isRtl}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: colors.mutedForeground }}
                            tickFormatter={formatter}
                            axisLine={false}
                            tickLine={false}
                            width={60}
                            orientation={isRtl ? 'right' : 'left'}
                        />
                        <Tooltip
                            formatter={(value) => [
                                formatter(Number(value)),
                                labels[activeTab],
                            ]}
                            labelFormatter={(label) => {
                                const date = new Date(label);
                                return date.toLocaleDateString(locale, {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                });
                            }}
                            contentStyle={{
                                backgroundColor: colors.tooltipBg,
                                color: colors.tooltipFg,
                                border: `1px solid ${colors.border}`,
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                                padding: '8px 12px',
                            }}
                            labelStyle={{ color: colors.tooltipFg, fontWeight: 500 }}
                            itemStyle={{ color: colors.tooltipFg }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={2}
                            fill={`url(#gradient-${activeTab})`}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
