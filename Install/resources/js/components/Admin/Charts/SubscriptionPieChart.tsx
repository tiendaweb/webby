import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Legend,
    Tooltip,
} from 'recharts';
import { useChartColors } from '@/hooks/useChartColors';
import { useTranslation } from '@/contexts/LanguageContext';
import type { SubscriptionDistributionItem } from '@/types/admin';

interface SubscriptionPieChartProps {
    data: SubscriptionDistributionItem[];
}

export function SubscriptionPieChart({ data }: SubscriptionPieChartProps) {
    const { t, isRtl } = useTranslation();
    const colors = useChartColors();
    const hasData = data.length > 0 && data.some((d) => d.count > 0);

    if (!hasData) {
        return (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                {t('No subscription data available')}
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={200}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="count"
                    nameKey="name"
                    paddingAngle={2}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip
                    formatter={(value, name) => [
                        `${value} ${t('subscribers')}`,
                        String(name),
                    ]}
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
                <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{
                        direction: isRtl ? 'rtl' : 'ltr',
                    }}
                    formatter={(value) => (
                        <span style={{
                            color: colors.tooltipFg,
                            fontSize: '14px',
                            marginInlineStart: '4px',
                        }}>
                            {value}
                        </span>
                    )}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
