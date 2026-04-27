import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, RefreshCw, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from '@/contexts/LanguageContext';

interface Collection {
    id: string;
    path: string;
}

interface Props {
    prefix: string;
    onSelectCollection: (path: string) => void;
    projectId?: string;
}

export function CollectionGrid({ prefix, onSelectCollection, projectId }: Props) {
    const { t } = useTranslation();
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCollections = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(route('firebase.collections'), {
                params: { prefix, project_id: projectId }
            });
            setCollections(response.data.collections || []);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            setError(error.response?.data?.error || t('Failed to load collections'));
        } finally {
            setLoading(false);
        }
    }, [prefix, projectId, t]);

    useEffect(() => {
        fetchCollections();
    }, [fetchCollections]);

    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-8 w-8 text-destructive/50 mb-2" />
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchCollections}>
                    <RefreshCw className="h-4 w-4 me-2 rtl:rotate-180" />
                    {t('Retry')}
                </Button>
            </div>
        );
    }

    if (collections.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
                <Database className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">{t('No collections found')}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                    {t('Collections will appear here once data is added')}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {t(':count collections found', { count: collections.length })}
                </p>
                <Button variant="ghost" size="sm" onClick={fetchCollections}>
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {collections.map((collection) => (
                    <Card
                        key={collection.id}
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => onSelectCollection(collection.path)}
                    >
                        <CardContent className="p-4 flex flex-col items-center text-center">
                            <Database className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="font-medium truncate w-full">{collection.id}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
