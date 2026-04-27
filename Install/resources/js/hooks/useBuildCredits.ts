import { useState, useCallback } from 'react';
import axios from 'axios';

export interface BuildCreditsInfo {
    remaining: number;
    monthlyLimit: number;
    isUnlimited: boolean;
    usingOwnKey: boolean;
}

interface UseBuildCreditsReturn {
    credits: BuildCreditsInfo;
    isRefreshing: boolean;
    refresh: () => Promise<void>;
    update: (credits: BuildCreditsInfo) => void;
}

export function useBuildCredits(initialCredits: BuildCreditsInfo): UseBuildCreditsReturn {
    const [credits, setCredits] = useState<BuildCreditsInfo>(initialCredits);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const refresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            const response = await axios.get('/billing/usage/stats');
            const data = response.data;
            setCredits({
                remaining: data.credits_remaining,
                monthlyLimit: data.monthly_limit,
                isUnlimited: data.is_unlimited,
                usingOwnKey: data.using_own_key,
            });
        } catch (error) {
            // Silently fail - keep existing credits
            console.error('Failed to refresh credits:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    const update = useCallback((newCredits: BuildCreditsInfo) => setCredits(newCredits), []);

    return { credits, isRefreshing, refresh, update };
}
