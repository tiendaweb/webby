import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    onSnapshot,
    query,
    limit,
    deleteDoc,
    doc,
    addDoc,
    DocumentData,
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Trash2, FileJson, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';

interface DocumentListProps {
    collectionPath: string;
    onSelectDocument: (docId: string, data: DocumentData) => void;
    pageSize?: number;
}

interface DocumentItem {
    id: string;
    data: DocumentData;
}

export function DocumentList({
    collectionPath,
    onSelectDocument,
    pageSize = 50,
}: DocumentListProps) {
    const { t } = useTranslation();
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [adding, setAdding] = useState(false);

    const db = getDb();

    // Subscribe to collection
    useEffect(() => {
        if (!db || !collectionPath) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const collRef = collection(db, collectionPath);
        const q = query(collRef, limit(pageSize));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const docs = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    data: doc.data(),
                }));
                setDocuments(docs);
                setLoading(false);
            },
            (err) => {
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [db, collectionPath, pageSize]);

    const handleDelete = useCallback(async () => {
        if (!db || !deleteDocId) return;

        setDeleting(true);
        try {
            await deleteDoc(doc(db, collectionPath, deleteDocId));
            toast.success(t('Document deleted'));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t('Failed to delete'));
        } finally {
            setDeleting(false);
            setDeleteDocId(null);
        }
    }, [db, collectionPath, deleteDocId, t]);

    const handleAddDocument = useCallback(async () => {
        if (!db) return;

        setAdding(true);
        try {
            const docRef = await addDoc(collection(db, collectionPath), {
                _created: new Date().toISOString(),
            });
            toast.success(t('Document created'));
            // Select the new document for editing
            onSelectDocument(docRef.id, { _created: new Date().toISOString() });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t('Failed to create'));
        } finally {
            setAdding(false);
        }
    }, [db, collectionPath, onSelectDocument, t]);

    const getPreview = (data: DocumentData): string => {
        const keys = Object.keys(data).slice(0, 3);
        if (keys.length === 0) return '(empty)';
        return keys.map(k => `${k}: ${JSON.stringify(data[k]).slice(0, 30)}`).join(', ');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-destructive/50 mb-4" />
                <p className="text-destructive font-medium">Failed to load documents</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Badge variant="outline">{documents.length} documents</Badge>
                    <span className="text-xs text-muted-foreground">(max {pageSize})</span>
                </div>
                <Button
                    size="sm"
                    onClick={handleAddDocument}
                    disabled={adding}
                >
                    {adding ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add Document
                </Button>
            </div>

            {/* Document Table */}
            {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-muted-foreground/25 rounded-xl bg-muted/10">
                    <FileJson className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground font-medium">No documents in this collection</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                        Click "Add Document" to create your first document
                    </p>
                </div>
            ) : (
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">Document ID</TableHead>
                                <TableHead>Preview</TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documents.map((doc) => (
                                <TableRow
                                    key={doc.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => onSelectDocument(doc.id, doc.data)}
                                >
                                    <TableCell className="font-mono text-sm">
                                        {doc.id}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground truncate max-w-[400px]">
                                        {getPreview(doc.data)}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteDocId(doc.id);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDocId !== null} onOpenChange={(open) => !open && setDeleteDocId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the document <code className="bg-muted px-1 py-0.5 rounded">{deleteDocId}</code>.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleting ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
