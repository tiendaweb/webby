import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/contexts/LanguageContext';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Save, SearchCheck } from 'lucide-react';

interface SeoPage {
    page_path: string;
    title: string | null;
    description: string | null;
    slug: string | null;
    canonical_url: string | null;
    social_image: string | null;
    favicon: string | null;
    indexable: boolean;
}

interface SeoIssue {
    severity: 'error' | 'warning';
    page_path: string;
    code: string;
    message: string;
}

interface SeoAudit {
    issues: SeoIssue[];
    summary: {
        errors: number;
        warnings: number;
        passed: boolean;
    };
}

interface ProjectSeoPanelProps {
    projectId: string;
}

export function ProjectSeoPanel({ projectId }: ProjectSeoPanelProps) {
    const { t } = useTranslation();
    const [pages, setPages] = useState<SeoPage[]>([]);
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [audit, setAudit] = useState<SeoAudit | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [auditing, setAuditing] = useState(false);

    const selectedPage = useMemo(
        () => pages.find((page) => page.page_path === selectedPath) || pages[0] || null,
        [pages, selectedPath]
    );

    const fetchSeo = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/project/${projectId}/seo`);
            const nextPages = response.data.pages || [];
            setPages(nextPages);
            setAudit(response.data.audit || null);
            setSelectedPath((current) => current && nextPages.some((page: SeoPage) => page.page_path === current)
                ? current
                : nextPages[0]?.page_path || null);
        } catch {
            toast.error(t('Failed to load SEO settings'));
        } finally {
            setLoading(false);
        }
    }, [projectId, t]);

    useEffect(() => {
        fetchSeo();
    }, [fetchSeo]);

    const updateSelectedPage = (patch: Partial<SeoPage>) => {
        if (!selectedPage) return;
        setPages((current) => current.map((page) => (
            page.page_path === selectedPage.page_path ? { ...page, ...patch } : page
        )));
    };

    const save = async () => {
        if (!selectedPage) return;

        setSaving(true);
        try {
            const response = await axios.put(`/project/${projectId}/seo`, selectedPage);
            setPages((current) => current.map((page) => (
                page.page_path === selectedPage.page_path ? response.data.page : page
            )));
            setAudit(response.data.audit || null);
            toast.success(t('SEO settings saved'));
        } catch (err) {
            const message = axios.isAxiosError(err) ? err.response?.data?.error : null;
            toast.error(message || t('Failed to save SEO settings'));
        } finally {
            setSaving(false);
        }
    };

    const runAudit = async () => {
        setAuditing(true);
        try {
            const response = await axios.post(`/project/${projectId}/publish-audit`);
            setAudit(response.data);
            toast.success(t('Audit updated'));
        } catch {
            toast.error(t('Failed to run audit'));
        } finally {
            setAuditing(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        );
    }

    if (!selectedPage) {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                {t('No editable pages found for SEO settings')}
            </div>
        );
    }

    return (
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <div className="rounded-lg border bg-card overflow-hidden">
                <div className="h-10 px-3 border-b flex items-center justify-between">
                    <span className="text-sm font-medium">{t('Pages')}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchSeo}>
                        <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                </div>
                <ScrollArea className="h-64">
                    <div className="p-2 space-y-1">
                        {pages.map((page) => (
                            <button
                                key={page.page_path}
                                type="button"
                                onClick={() => setSelectedPath(page.page_path)}
                                className={`w-full text-left rounded-md px-2 py-2 text-sm transition-colors ${
                                    page.page_path === selectedPage.page_path
                                        ? 'bg-primary text-primary-foreground'
                                        : 'hover:bg-muted'
                                }`}
                            >
                                <span className="block truncate">{page.title || page.page_path}</span>
                                <span className="block text-[11px] opacity-75 truncate">{page.page_path}</span>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            <div className="space-y-4">
                <div className="rounded-lg border bg-card p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-semibold">{t('SEO Page Settings')}</h3>
                            <p className="text-xs text-muted-foreground">{selectedPage.page_path}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={runAudit} disabled={auditing} className="h-9">
                                {auditing ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchCheck className="h-4 w-4" />}
                                <span className="ms-2">{t('Audit')}</span>
                            </Button>
                            <Button onClick={save} disabled={saving} className="h-9">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                <span className="ms-2">{t('Save')}</span>
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>{t('Title')}</Label>
                            <Input
                                value={selectedPage.title || ''}
                                onChange={(event) => updateSelectedPage({ title: event.target.value })}
                                maxLength={255}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Slug')}</Label>
                            <Input
                                value={selectedPage.slug || ''}
                                onChange={(event) => updateSelectedPage({ slug: event.target.value })}
                                placeholder="/"
                                maxLength={180}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>{t('Description')}</Label>
                            <span className="text-xs text-muted-foreground">{(selectedPage.description || '').length}/180</span>
                        </div>
                        <Textarea
                            value={selectedPage.description || ''}
                            onChange={(event) => updateSelectedPage({ description: event.target.value.slice(0, 180) })}
                            rows={3}
                            maxLength={180}
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>{t('Canonical URL')}</Label>
                            <Input
                                value={selectedPage.canonical_url || ''}
                                onChange={(event) => updateSelectedPage({ canonical_url: event.target.value })}
                                placeholder="https://example.com/page"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Social Image URL')}</Label>
                            <Input
                                value={selectedPage.social_image || ''}
                                onChange={(event) => updateSelectedPage({ social_image: event.target.value })}
                                placeholder="https://example.com/og.png"
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>{t('Favicon URL')}</Label>
                            <Input
                                value={selectedPage.favicon || ''}
                                onChange={(event) => updateSelectedPage({ favicon: event.target.value })}
                                placeholder="/favicon.ico"
                            />
                        </div>
                        <div className="flex items-center justify-between rounded-md border px-3 py-2">
                            <div>
                                <Label>{t('Indexable')}</Label>
                                <p className="text-xs text-muted-foreground">{t('Allow search engines to index this page')}</p>
                            </div>
                            <Switch
                                checked={selectedPage.indexable}
                                onCheckedChange={(checked) => updateSelectedPage({ indexable: checked })}
                            />
                        </div>
                    </div>
                </div>

                {audit && (
                    <Alert className={audit.summary.errors > 0 ? 'border-destructive/50' : 'border-success/40'}>
                        {audit.summary.errors > 0 ? (
                            <AlertTriangle className="h-4 w-4" />
                        ) : (
                            <CheckCircle2 className="h-4 w-4" />
                        )}
                        <AlertTitle className="flex items-center gap-2">
                            {audit.summary.passed ? t('Publish audit passed') : t('Publish audit needs attention')}
                            <Badge variant={audit.summary.errors > 0 ? 'destructive' : 'secondary'}>
                                {audit.summary.errors} {t('errors')}
                            </Badge>
                            <Badge variant="outline">{audit.summary.warnings} {t('warnings')}</Badge>
                        </AlertTitle>
                        {audit.issues.length > 0 && (
                            <AlertDescription>
                                <div className="mt-3 space-y-2">
                                    {audit.issues.slice(0, 8).map((issue) => (
                                        <div key={`${issue.page_path}-${issue.code}-${issue.message}`} className="flex items-start gap-2 text-xs">
                                            <Badge variant={issue.severity === 'error' ? 'destructive' : 'secondary'} className="mt-0.5">
                                                {issue.severity}
                                            </Badge>
                                            <span>
                                                <strong>{issue.page_path}:</strong> {issue.message}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </AlertDescription>
                        )}
                    </Alert>
                )}
            </div>
        </div>
    );
}
