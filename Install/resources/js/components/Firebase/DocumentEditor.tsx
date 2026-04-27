import { useState, useCallback, useEffect } from 'react';
import { doc, setDoc, DocumentData } from 'firebase/firestore';
import { getDb } from '@/lib/firebase-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';

interface DocumentEditorProps {
    collectionPath: string;
    documentId: string | null;
    initialData: DocumentData | null;
    open: boolean;
    onClose: () => void;
}

export function DocumentEditor({
    collectionPath,
    documentId,
    initialData,
    open,
    onClose,
}: DocumentEditorProps) {
    const { t } = useTranslation();
    const [jsonValue, setJsonValue] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const db = getDb();

    // Format initial data as JSON
    useEffect(() => {
        if (initialData) {
            try {
                setJsonValue(JSON.stringify(initialData, null, 2));
                setError(null);
            } catch {
                setJsonValue('{}');
            }
        } else {
            setJsonValue('{}');
        }
    }, [initialData]);

    const validateJson = useCallback((value: string): DocumentData | null => {
        try {
            const parsed = JSON.parse(value);
            if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
                setError(t('Document must be a JSON object'));
                return null;
            }
            setError(null);
            return parsed;
        } catch (e) {
            setError(e instanceof Error ? e.message : t('Invalid JSON'));
            return null;
        }
    }, [t]);

    const handleJsonChange = useCallback((value: string) => {
        setJsonValue(value);
        validateJson(value);
    }, [validateJson]);

    const handleSave = useCallback(async () => {
        if (!db || !documentId) return;

        const data = validateJson(jsonValue);
        if (!data) return;

        setSaving(true);
        try {
            await setDoc(doc(db, collectionPath, documentId), data);
            toast.success(t('Document saved'));
            onClose();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t('Failed to save'));
        } finally {
            setSaving(false);
        }
    }, [db, collectionPath, documentId, jsonValue, validateJson, onClose, t]);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(jsonValue);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [jsonValue]);

    const handleFormat = useCallback(() => {
        try {
            const parsed = JSON.parse(jsonValue);
            setJsonValue(JSON.stringify(parsed, null, 2));
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Invalid JSON');
        }
    }, [jsonValue]);

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle>Edit Document</DialogTitle>
                        <Badge variant="outline" className="font-mono text-xs">
                            {documentId}
                        </Badge>
                    </div>
                    <DialogDescription>
                        Path: <code className="bg-muted px-1 py-0.5 rounded text-xs">{collectionPath}/{documentId}</code>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleFormat}
                        >
                            Format JSON
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopy}
                        >
                            {copied ? (
                                <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy
                                </>
                            )}
                        </Button>
                    </div>

                    {/* JSON Editor */}
                    <Textarea
                        value={jsonValue}
                        onChange={(e) => handleJsonChange(e.target.value)}
                        className="font-mono text-sm min-h-[300px] resize-y"
                        placeholder="{}"
                    />

                    {/* Error */}
                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !!error}
                    >
                        {saving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
