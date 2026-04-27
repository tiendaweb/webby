import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { useChartColors } from '@/hooks/useChartColors';
import { useTranslation } from '@/contexts/LanguageContext';
import type { AiUsageTrendItem } from '@/types/admin';

interface AiUsageTrendChartProps {
    data: AiUsageTrendItem[];
}

const CHART_COLOR = '#8B5CF6';

function formatTokens(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return value.toString();
}

export function AiUsageTrendChart({ data }: AiUsageTrendChartProps) {
    const { t, locale, isRtl } = useTranslation();
    const colors = useChartColors();
    const hasData = data.length > 0 && data.some((d) => d.tokens > 0);

    if (!hasData) {
        return (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                {t('No AI usage data for this period')}
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={200}>
            <AreaChart
                data={data}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            >
                <defs>
                    <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLOR} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLOR} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={colors.border}
                    vertical={false}
                />
                <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: colors.mutedForeground }}
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
                    minTickGap={30}
                    reversed={isRtl}
                />
                <YAxis
                    tick={{ fontSize: 10, fill: colors.mutedForeground }}
                    tickFormatter={formatTokens}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                    orientation={isRtl ? 'right' : 'left'}
                />
                <Tooltip
                    formatter={(value, name) => {
                        const numValue = Number(value);
                        if (name === 'tokens') return [formatTokens(numValue), t('Tokens')];
                        return [`$${numValue.toFixed(2)}`, t('Cost')];
                    }}
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
                    dataKey="tokens"
                    stroke={CHART_COLOR}
                    strokeWidth={2}
                    fill="url(#tokenGradient)"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
