import { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { AdminPageHeader } from '@/components/Admin/AdminPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAdminLoading } from '@/hooks/useAdminLoading';
import { SettingsPageSkeleton } from '@/components/Admin/skeletons';
import { Save, ArrowLeft, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    auth: { user?: { id: number } };
    language: { id: number; code: string; name: string };
    files: string[];
    selectedFile: string | null;
    translations: Record<string, string>;
}

export default function EditFiles({ auth, language, files, selectedFile: initialFile, translations: initialTranslations }: Props) {
    const { t } = useTranslation();
    const { isLoading } = useAdminLoading();

    const [selectedFile, setSelectedFile] = useState(initialFile || '');
    const [translations, setTranslations] = useState<Record<string, string>>(initialTranslations);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const filteredTranslations = useMemo(() => {
        if (!searchTerm) return translations;

        const search = searchTerm.toLowerCase();
        return Object.entries(translations).reduce(
            (acc, [key, value]) => {
                if (key.toLowerCase().includes(search) || value.toLowerCase().includes(search)) {
                    acc[key] = value;
                }
                return acc;
            },
            {} as Record<string, string>
        );
    }, [translations, searchTerm]);

    const handleFileChange = (file: string) => {
        setSelectedFile(file);
        setSearchTerm('');

        // Load the file content
        router.get(route('admin.languages.file.get', [language.id, file]), undefined, {
            preserveScroll: true,
            onSuccess: (page) => {
                const props = page.props as any;
                setTranslations(props.translations || {});
            },
            onError: () => {
                toast.error(t('Failed to load file'));
            },
        });
    };

    const handleTranslationChange = (key: string, value: string) => {
        setTranslations((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleSave = () => {
        setIsSaving(true);

        router.put(
            route('admin.languages.file.save', [language.id, selectedFile]),
            { translations },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(t('Translation file saved successfully.'));
                },
                onError: (errors) => {
                    const message = Object.values(errors)[0] as string;
                    toast.error(message || t('Failed to save file'));
                },
                onFinish: () => setIsSaving(false),
            }
        );
    };

    if (isLoading) {
        return (
            <AdminLayout user={auth.user!} title={`${t('Edit Translations')} - ${language.name}`}>
                <AdminPageHeader
                    title={t('Edit Translations')}
                    subtitle={`${language.name} (${language.code})`}
                />
                <SettingsPageSkeleton sidebarItemCount={0} />
            </AdminLayout>
        );
    }

    return (
        <AdminLayout user={auth.user!} title={`${t('Edit Translations')} - ${language.name}`}>
            <AdminPageHeader
                title={t('Edit Translations')}
                subtitle={`${language.name} (${language.code})`}
                action={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.visit(route('admin.languages'))}
                    >
                        <ArrowLeft className="me-2 h-4 w-4" />
                        {t('Back')}
                    </Button>
                }
            />

            <div className="grid gap-6">
                {files.length === 0 ? (
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-center text-muted-foreground">
                                {t('No language files found for this language.')}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* File Selector */}
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Select File')}</CardTitle>
                                <CardDescription>
                                    {t('Choose which translation file to edit')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs value={selectedFile} onValueChange={handleFileChange}>
                                    <TabsList className="flex flex-wrap justify-start bg-transparent border-b rounded-none">
                                        {files.map((file) => (
                                            <TabsTrigger key={file} value={file} className="rounded-none border-b-2">
                                                {file}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </Tabs>
                            </CardContent>
                        </Card>

                        {/* Translations Editor */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <CardTitle>{selectedFile}.json</CardTitle>
                                        <CardDescription>
                                            {t('Total keys')}: {Object.keys(translations).length} | {t('Filtered')}: {Object.keys(filteredTranslations).length}
                                        </CardDescription>
                                    </div>
                                    <Button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex items-center gap-2"
                                    >
                                        <Save className="h-4 w-4" />
                                        {isSaving ? t('Saving...') : t('Save Changes')}
                                    </Button>
                                </div>
                                {/* Search */}
                                <div className="relative mt-4">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder={t('Search keys or values...')}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-96 border rounded-lg p-4">
                                    <div className="space-y-3 pr-4">
                                        {Object.keys(filteredTranslations).length === 0 ? (
                                            <p className="text-center text-sm text-muted-foreground py-8">
                                                {searchTerm ? t('No results found') : t('No translations')}
                                            </p>
                                        ) : (
                                            Object.entries(filteredTranslations).map(([key, value]) => (
                                                <div key={key} className="grid grid-cols-3 gap-3 items-start">
                                                    <div className="col-span-1">
                                                        <code className="text-xs bg-muted px-2 py-1.5 rounded block break-words">
                                                            {key}
                                                        </code>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <Input
                                                            type="text"
                                                            value={value}
                                                            onChange={(e) => handleTranslationChange(key, e.target.value)}
                                                            placeholder={t('Translation value')}
                                                            className="w-full"
                                                        />
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
