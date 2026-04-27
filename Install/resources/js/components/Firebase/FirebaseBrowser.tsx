import { useState, useEffect, useCallback } from 'react';
import { DocumentData } from 'firebase/firestore';
import { initFirebase } from '@/lib/firebase-client';
import { Button } from '@/components/ui/button';
import { CollectionInput } from './CollectionInput';
import { CollectionGrid } from './CollectionGrid';
import { DocumentList } from './DocumentList';
import { DocumentEditor } from './DocumentEditor';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import type { FirebaseConfig } from '@/types/storage';
import { useTranslation } from '@/contexts/LanguageContext';

interface FirebaseBrowserProps {
    config: FirebaseConfig | null;
    collectionPrefix: string;
    projectName: string;
    projectId: string;
    usesSystemFirebase?: boolean;
    adminSdkConfigured?: boolean;
}

export function FirebaseBrowser({ config, collectionPrefix, projectName: _projectName, projectId, usesSystemFirebase = false, adminSdkConfigured = false }: FirebaseBrowserProps) {
    const { t } = useTranslation();
    const [initialized, setInitialized] = useState(false);
    const [initError, setInitError] = useState<string | null>(null);
    const [currentCollection, setCurrentCollection] = useState<string | null>(null);
    const [selectedDoc, setSelectedDoc] = useState<{ id: string; data: DocumentData } | null>(null);

    // Initialize Firebase when config changes
    useEffect(() => {
        if (!config) {
            setInitialized(false);
            setInitError('Firebase configuration not available');
            return;
        }

        try {
            initFirebase(config);
            setInitialized(true);
            setInitError(null);
        } catch (err) {
            setInitialized(false);
            setInitError(err instanceof Error ? err.message : 'Failed to initialize Firebase');
        }

        // Cleanup on unmount
        return () => {
            // Don't reset on unmount to allow reconnection
        };
    }, [config]);

    const handleBrowseCollection = useCallback((path: string) => {
        setCurrentCollection(path);
        setSelectedDoc(null);
    }, []);

    const handleSelectDocument = useCallback((docId: string, data: DocumentData) => {
        setSelectedDoc({ id: docId, data });
    }, []);

    const handleBackToCollections = useCallback(() => {
        setCurrentCollection(null);
        setSelectedDoc(null);
    }, []);

    const handleCloseEditor = useCallback(() => {
        setSelectedDoc(null);
    }, []);

    // Not configured state
    if (!config) {
        return (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-muted-foreground/25 rounded-xl bg-muted/10">
                <AlertCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-base font-medium text-muted-foreground mb-2">
                    {t('Firebase Not Configured')}
                </h3>
                <p className="text-sm text-muted-foreground/70 text-center max-w-md">
                    {t('Firebase is not configured for this project. Contact your administrator to enable system Firebase.')}
                </p>
            </div>
        );
    }

    // Initialization error state
    if (initError) {
        return (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-destructive/25 rounded-xl bg-destructive/5">
                <AlertCircle className="h-12 w-12 text-destructive/50 mb-4" />
                <h3 className="text-base font-medium text-destructive mb-2">
                    {t('Connection Failed')}
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                    {initError}
                </p>
                <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                        if (config) {
                            try {
                                initFirebase(config);
                                setInitialized(true);
                                setInitError(null);
                            } catch (err) {
                                setInitError(err instanceof Error ? err.message : t('Failed to initialize Firebase'));
                            }
                        }
                    }}
                >
                    {t('Retry Connection')}
                </Button>
            </div>
        );
    }

    // Loading state
    if (!initialized) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Main Content */}
            {currentCollection ? (
                <div className="space-y-4">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleBackToCollections}
                        >
                            <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
                            {t('Back')}
                        </Button>
                        <span className="text-muted-foreground">/</span>
                        <code className="text-sm bg-muted px-2 py-1 rounded">{currentCollection}</code>
                    </div>

                    {/* Document List */}
                    <DocumentList
                        collectionPath={currentCollection}
                        onSelectDocument={handleSelectDocument}
                    />

                    {/* Document Editor */}
                    <DocumentEditor
                        collectionPath={currentCollection}
                        documentId={selectedDoc?.id ?? null}
                        initialData={selectedDoc?.data ?? null}
                        open={selectedDoc !== null}
                        onClose={handleCloseEditor}
                    />
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Auto-fetched collections grid (when Admin SDK configured) */}
                    {adminSdkConfigured && (
                        <CollectionGrid
                            prefix={collectionPrefix}
                            onSelectCollection={handleBrowseCollection}
                            projectId={projectId}
                        />
                    )}

                    {/* Manual input - always shown for sub-collections or as fallback */}
                    <div className="space-y-2">
                        {adminSdkConfigured && (
                            <p className="text-sm text-muted-foreground">
                                {t('Or enter a sub-collection path:')}
                            </p>
                        )}
                        <CollectionInput
                            prefix={collectionPrefix}
                            onBrowse={handleBrowseCollection}
                            usesSystemFirebase={usesSystemFirebase}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
