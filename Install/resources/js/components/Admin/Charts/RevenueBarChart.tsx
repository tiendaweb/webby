import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { useChartColors } from '@/hooks/useChartColors';
import { useTranslation } from '@/contexts/LanguageContext';
import type { RevenueByMethod } from '@/types/admin';

interface RevenueBarChartProps {
    data: RevenueByMethod[];
}

const PRIMARY_COLOR = '#10B981';

export function RevenueBarChart({ data }: RevenueBarChartProps) {
    const colors = useChartColors();
    const { t, isRtl } = useTranslation();

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                {t('No revenue data this month')}
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={colors.border}
                    vertical={false}
                />
                <XAxis
                    dataKey="method"
                    tick={{ fontSize: 12, fill: colors.mutedForeground }}
                    axisLine={{ stroke: colors.border }}
                    tickLine={false}
                    reversed={isRtl}
                />
                <YAxis
                    tick={{ fontSize: 12, fill: colors.mutedForeground }}
                    tickFormatter={(value) => `$${value}`}
                    axisLine={false}
                    tickLine={false}
                    orientation={isRtl ? 'right' : 'left'}
                />
                <Tooltip
                    formatter={(value) => [
                        `$${Number(value).toFixed(2)}`,
                        t('Revenue'),
                    ]}
                    contentStyle={{
                        backgroundColor: colors.card,
                        color: colors.cardForeground,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                    }}
                    labelStyle={{ color: colors.cardForeground }}
                    itemStyle={{ color: colors.cardForeground }}
                />
                <Bar
                    dataKey="amount"
                    fill={PRIMARY_COLOR}
                    radius={[4, 4, 0, 0]}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
