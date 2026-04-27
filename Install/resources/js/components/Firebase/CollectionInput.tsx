import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, History, X, FolderOpen } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

interface CollectionInputProps {
    prefix: string;
    onBrowse: (collectionPath: string) => void;
    disabled?: boolean;
    usesSystemFirebase?: boolean;
}

const RECENT_COLLECTIONS_KEY = 'firebase-recent-collections';
const MAX_RECENT = 5;

export function CollectionInput({ prefix, onBrowse, disabled, usesSystemFirebase = false }: CollectionInputProps) {
    const { t } = useTranslation();
    const [collectionName, setCollectionName] = useState('');
    const [recentCollections, setRecentCollections] = useState<string[]>([]);

    // Load recent collections from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(RECENT_COLLECTIONS_KEY);
            if (stored) {
                setRecentCollections(JSON.parse(stored));
            }
        } catch {
            // Ignore errors
        }
    }, []);

    const saveToRecent = useCallback((name: string) => {
        setRecentCollections(prev => {
            const filtered = prev.filter(c => c !== name);
            const updated = [name, ...filtered].slice(0, MAX_RECENT);
            try {
                localStorage.setItem(RECENT_COLLECTIONS_KEY, JSON.stringify(updated));
            } catch {
                // Ignore errors
            }
            return updated;
        });
    }, []);

    const removeFromRecent = useCallback((name: string) => {
        setRecentCollections(prev => {
            const updated = prev.filter(c => c !== name);
            try {
                localStorage.setItem(RECENT_COLLECTIONS_KEY, JSON.stringify(updated));
            } catch {
                // Ignore errors
            }
            return updated;
        });
    }, []);

    const handleBrowse = useCallback(() => {
        if (!collectionName.trim()) return;
        const name = collectionName.trim();
        saveToRecent(name);
        onBrowse(`${prefix}/${name}`);
    }, [collectionName, prefix, saveToRecent, onBrowse]);

    const handleRecentClick = useCallback((name: string) => {
        setCollectionName(name);
        saveToRecent(name);
        onBrowse(`${prefix}/${name}`);
    }, [prefix, saveToRecent, onBrowse]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBrowse();
        }
    }, [handleBrowse]);

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <div className="flex-1 relative">
                    <FolderOpen className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={collectionName}
                        onChange={(e) => setCollectionName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t("Enter collection name (e.g., users, products)")}
                        className="ps-10"
                        disabled={disabled}
                    />
                </div>
                <Button
                    onClick={handleBrowse}
                    disabled={!collectionName.trim() || disabled}
                >
                    <Search className="h-4 w-4 me-2" />
                    {t('Browse')}
                </Button>
            </div>

            {recentCollections.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <History className="h-3 w-3" />
                        <span>{t('Recent collections')}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {recentCollections.map((name) => (
                            <Badge
                                key={name}
                                variant="secondary"
                                className="cursor-pointer hover:bg-secondary/80 group"
                                onClick={() => !disabled && handleRecentClick(name)}
                            >
                                {name}
                                <button
                                    className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeFromRecent(name);
                                    }}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            {!usesSystemFirebase && (
                <p className="text-xs text-muted-foreground">
                    {t('Full path:')} <code className="bg-muted px-1 py-0.5 rounded">{prefix}/{collectionName || '...'}</code>
                </p>
            )}
        </div>
    );
}
