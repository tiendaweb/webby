import { useForm } from '@inertiajs/react';
import { FormEventHandler, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Save, Check, Loader2, Sparkles, Radio, Wifi, Flame, ClipboardPaste, Shield, Eye, EyeOff } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import type { IntegrationSettings, PusherCluster, BroadcastDriver, ReverbScheme, AiProvider } from './types';
import { FirebaseAdminUpload } from '@/components/Admin/FirebaseAdminUpload';
import { useTranslation } from '@/contexts/LanguageContext';

interface Props {
    settings: IntegrationSettings;
    aiProviders: AiProvider[];
}

const PUSHER_CLUSTERS: { value: PusherCluster; label: string }[] = [
    { value: 'mt1', label: 'US East (N. Virginia) - mt1' },
    { value: 'us2', label: 'US East (Ohio) - us2' },
    { value: 'us3', label: 'US West (Oregon) - us3' },
    { value: 'eu', label: 'Europe (Ireland) - eu' },
    { value: 'ap1', label: 'Asia Pacific (Singapore) - ap1' },
    { value: 'ap2', label: 'Asia Pacific (Mumbai) - ap2' },
    { value: 'ap3', label: 'Asia Pacific (Tokyo) - ap3' },
    { value: 'ap4', label: 'Asia Pacific (Sydney) - ap4' },
];

const RECOMMENDED_MODELS: Record<string, { value: string; label: string }[]> = {
    openai: [
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Recommended)' },
        { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
        { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    ],
    anthropic: [
        { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (Recommended)' },
    ],
    grok: [
        { value: 'grok-4-1-fast-non-reasoning', label: 'Grok 4.1 Fast (Recommended)' },
    ],
    deepseek: [
        { value: 'deepseek-chat', label: 'DeepSeek Chat (Recommended)' },
    ],
    zhipu: [
        { value: 'glm-4.5-air', label: 'GLM-4.5 Air (Recommended)' },
    ],
};

export default function IntegrationSettingsTab({ settings, aiProviders }: Props) {
    const { t } = useTranslation();
    const [testing, setTesting] = useState(false);
    const [testingFirebase, setTestingFirebase] = useState(false);
    const [showPusherKey, setShowPusherKey] = useState(false);
    const [showPusherSecret, setShowPusherSecret] = useState(false);
    const [showReverbKey, setShowReverbKey] = useState(false);
    const [showReverbSecret, setShowReverbSecret] = useState(false);
    const [showFirebaseApiKey, setShowFirebaseApiKey] = useState(false);
    const [firebasePasteValue, setFirebasePasteValue] = useState('');
    const [firebasePasteError, setFirebasePasteError] = useState<string | null>(null);
    const [firebasePasteOpen, setFirebasePasteOpen] = useState(false);

    const { data, setData, put, processing, errors } = useForm({
        broadcast_driver: settings.broadcast_driver || 'pusher',
        pusher_app_id: settings.pusher_app_id || '',
        pusher_key: '',
        pusher_secret: '',
        pusher_cluster: settings.pusher_cluster || 'mt1',
        reverb_host: settings.reverb_host || '',
        reverb_port: (settings.reverb_port || 8080).toString(),
        reverb_scheme: settings.reverb_scheme || 'https',
        reverb_app_id: settings.reverb_app_id || '',
        reverb_key: '',
        reverb_secret: '',
        internal_ai_provider_id: settings.internal_ai_provider_id?.toString() || '',
        internal_ai_model: settings.internal_ai_model || '',
        // Firebase fields
        firebase_system_api_key: '',
        firebase_system_project_id: settings.firebase_system_project_id || '',
        firebase_system_auth_domain: settings.firebase_system_auth_domain || '',
        firebase_system_storage_bucket: settings.firebase_system_storage_bucket || '',
        firebase_system_messaging_sender_id: settings.firebase_system_messaging_sender_id || '',
        firebase_system_app_id: settings.firebase_system_app_id || '',
    });

    const selectedProvider = useMemo(() => {
        if (!data.internal_ai_provider_id) return null;
        return aiProviders.find(p => p.id.toString() === data.internal_ai_provider_id) || null;
    }, [data.internal_ai_provider_id, aiProviders]);

    const availableModels = useMemo(() => {
        if (!selectedProvider) return [];
        return RECOMMENDED_MODELS[selectedProvider.type] || [];
    }, [selectedProvider]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('admin.settings.integrations'), {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Integration settings updated')),
            onError: () => toast.error(t('Failed to update settings')),
        });
    };

    const handleProviderChange = (value: string) => {
        const providerId = value === 'none' ? '' : value;
        const provider = aiProviders.find(p => p.id.toString() === providerId);
        const models = provider ? (RECOMMENDED_MODELS[provider.type] || []) : [];

        setData(prev => ({
            ...prev,
            internal_ai_provider_id: providerId,
            internal_ai_model: models[0]?.value || '',
        }));
    };

    const testConnection = async () => {
        setTesting(true);
        try {
            const payload = data.broadcast_driver === 'reverb'
                ? {
                    driver: 'reverb',
                    app_id: data.reverb_app_id,
                    key: data.reverb_key || '[existing]',
                    secret: data.reverb_secret || '[existing]',
                    host: data.reverb_host,
                    port: parseInt(data.reverb_port),
                    scheme: data.reverb_scheme,
                }
                : {
                    driver: 'pusher',
                    app_id: data.pusher_app_id,
                    key: data.pusher_key || '[existing]',
                    secret: data.pusher_secret || '[existing]',
                    cluster: data.pusher_cluster,
                };

            await axios.post(route('admin.settings.broadcast.test'), payload);
            toast.success(t('Connection successful!'));
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { error?: string } } };
            toast.error(t('Connection failed') + ': ' + (axiosError.response?.data?.error || t('Unknown error')));
        } finally {
            setTesting(false);
        }
    };

    const parseFirebaseConfig = (input: string): Record<string, string> | null => {
        try {
            // Extract the firebaseConfig object from various formats:
            // 1. Full Firebase snippet with imports, comments, initializeApp
            // 2. const firebaseConfig = {...};
            // 3. Plain JSON {...}

            // First, try to find firebaseConfig = {...} pattern in the full snippet
            const configMatch = input.match(/(?:const|let|var)\s+firebaseConfig\s*=\s*(\{[\s\S]*?\});/);
            let jsonStr: string;

            if (configMatch) {
                jsonStr = configMatch[1];
            } else {
                // Try to find any object literal
                const objectMatch = input.match(/\{[\s\S]*?apiKey[\s\S]*?\}/);
                if (objectMatch) {
                    jsonStr = objectMatch[0];
                } else {
                    jsonStr = input.trim();
                }
            }

            // Convert JS object notation to valid JSON
            // Replace unquoted keys with quoted keys
            jsonStr = jsonStr.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
            // Replace single quotes with double quotes
            jsonStr = jsonStr.replace(/'/g, '"');
            // Remove trailing commas
            jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

            const config = JSON.parse(jsonStr);
            return config;
        } catch {
            return null;
        }
    };

    const handleFirebasePasteChange = (value: string) => {
        setFirebasePasteValue(value);
        setFirebasePasteError(null);
    };

    const handleFirebasePasteApply = () => {
        if (!firebasePasteValue.trim()) {
            setFirebasePasteError(t('Please paste Firebase configuration'));
            return;
        }

        const config = parseFirebaseConfig(firebasePasteValue);
        if (!config) {
            setFirebasePasteError(t('Invalid JSON format'));
            return;
        }

        // Validate required fields
        if (!config.apiKey || !config.projectId) {
            setFirebasePasteError(t('Missing required fields (apiKey, projectId)'));
            return;
        }

        // Populate form fields
        setData(prev => ({
            ...prev,
            firebase_system_api_key: config.apiKey || '',
            firebase_system_project_id: config.projectId || '',
            firebase_system_auth_domain: config.authDomain || '',
            firebase_system_storage_bucket: config.storageBucket || '',
            firebase_system_messaging_sender_id: config.messagingSenderId || '',
            firebase_system_app_id: config.appId || '',
        }));

        // Close dialog, clear paste field, and show success
        setFirebasePasteOpen(false);
        setFirebasePasteValue('');
        setFirebasePasteError(null);
        toast.success(t('Firebase config parsed successfully'));
    };

    const testFirebaseConnection = async () => {
        if (!data.firebase_system_project_id) {
            toast.error(t('Project ID is required'));
            return;
        }

        setTestingFirebase(true);
        try {
            await axios.post(route('admin.settings.firebase.test'), {
                api_key: data.firebase_system_api_key || '[existing]',
                project_id: data.firebase_system_project_id,
            });
            toast.success(t('Firebase connection successful!'));
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { error?: string } } };
            toast.error(t('Connection failed') + ': ' + (axiosError.response?.data?.error || t('Unknown error')));
        } finally {
            setTestingFirebase(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('Integrations')}</CardTitle>
                <CardDescription>{t('Configure external services and API integrations')}</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="space-y-6">
                    {/* WebSocket / Real-time */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Radio className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-medium">{t('Real-time & WebSocket')}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {t('Configure real-time communication for build progress streaming')}
                        </p>

                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="broadcast_driver">{t('Broadcast Driver')}</Label>
                                <Select
                                    value={data.broadcast_driver}
                                    onValueChange={(value: BroadcastDriver) => setData('broadcast_driver', value)}
                                >
                                    <SelectTrigger className="max-w-md">
                                        <SelectValue placeholder={t('Select driver')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pusher">{t('Pusher (Cloud)')}</SelectItem>
                                        <SelectItem value="reverb">{t('Reverb (Self-hosted)')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.broadcast_driver && (
                                    <p className="text-sm text-destructive">{errors.broadcast_driver}</p>
                                )}
                            </div>

                            {data.broadcast_driver === 'pusher' && (
                                <>
                                    <p className="text-xs text-muted-foreground">
                                        <a
                                            href="https://dashboard.pusher.com"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline"
                                        >
                                            {t('Get credentials from Pusher Dashboard')}
                                        </a>
                                    </p>

                                    <div className="space-y-2">
                                        <Label htmlFor="pusher_app_id">{t('App ID')}</Label>
                                        <Input
                                            id="pusher_app_id"
                                            value={data.pusher_app_id}
                                            onChange={(e) => setData('pusher_app_id', e.target.value)}
                                            placeholder="123456"
                                            className="max-w-md"
                                        />
                                        {errors.pusher_app_id && (
                                            <p className="text-sm text-destructive">{errors.pusher_app_id}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="pusher_key">{t('App Key')}</Label>
                                            {settings.pusher_has_key && (
                                                <Badge variant="success" className="text-xs">
                                                    <Check className="h-3 w-3 me-1" />
                                                    {t('Configured')}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="relative max-w-md">
                                            <Input
                                                id="pusher_key"
                                                type={showPusherKey ? 'text' : 'password'}
                                                value={data.pusher_key}
                                                onChange={(e) => setData('pusher_key', e.target.value)}
                                                placeholder={settings.pusher_has_key ? t('Leave blank to keep existing') : t('Enter app key')}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute end-2 top-1/2 -translate-y-1/2"
                                                onClick={() => setShowPusherKey(!showPusherKey)}
                                            >
                                                {showPusherKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                        {errors.pusher_key && (
                                            <p className="text-sm text-destructive">{errors.pusher_key}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="pusher_secret">{t('App Secret')}</Label>
                                            {settings.pusher_has_secret && (
                                                <Badge variant="success" className="text-xs">
                                                    <Check className="h-3 w-3 me-1" />
                                                    {t('Configured')}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="relative max-w-md">
                                            <Input
                                                id="pusher_secret"
                                                type={showPusherSecret ? 'text' : 'password'}
                                                value={data.pusher_secret}
                                                onChange={(e) => setData('pusher_secret', e.target.value)}
                                                placeholder={settings.pusher_has_secret ? t('Leave blank to keep existing') : t('Enter app secret')}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute end-2 top-1/2 -translate-y-1/2"
                                                onClick={() => setShowPusherSecret(!showPusherSecret)}
                                            >
                                                {showPusherSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                        {errors.pusher_secret && (
                                            <p className="text-sm text-destructive">{errors.pusher_secret}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="pusher_cluster">{t('Cluster')}</Label>
                                        <Select
                                            value={data.pusher_cluster}
                                            onValueChange={(value: PusherCluster) => setData('pusher_cluster', value)}
                                        >
                                            <SelectTrigger className="max-w-md">
                                                <SelectValue placeholder={t('Select cluster')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PUSHER_CLUSTERS.map((cluster) => (
                                                    <SelectItem key={cluster.value} value={cluster.value}>
                                                        {cluster.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.pusher_cluster && (
                                            <p className="text-sm text-destructive">{errors.pusher_cluster}</p>
                                        )}
                                    </div>
                                </>
                            )}

                            {data.broadcast_driver === 'reverb' && (
                                <>
                                    <p className="text-xs text-muted-foreground">
                                        {t('Self-hosted Laravel Reverb WebSocket server')}
                                    </p>

                                    <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
                                        <div className="space-y-2">
                                            <Label htmlFor="reverb_host">{t('Host')}</Label>
                                            <Input
                                                id="reverb_host"
                                                value={data.reverb_host}
                                                onChange={(e) => setData('reverb_host', e.target.value)}
                                                placeholder="ws.example.com"
                                            />
                                            {errors.reverb_host && (
                                                <p className="text-sm text-destructive">{errors.reverb_host}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="reverb_port">{t('Port')}</Label>
                                            <Input
                                                id="reverb_port"
                                                type="number"
                                                value={data.reverb_port}
                                                onChange={(e) => setData('reverb_port', e.target.value)}
                                                placeholder="8080"
                                            />
                                            {errors.reverb_port && (
                                                <p className="text-sm text-destructive">{errors.reverb_port}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="reverb_scheme">{t('Scheme')}</Label>
                                        <Select
                                            value={data.reverb_scheme}
                                            onValueChange={(value: ReverbScheme) => setData('reverb_scheme', value)}
                                        >
                                            <SelectTrigger className="max-w-md">
                                                <SelectValue placeholder={t('Select scheme')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="https">{t('HTTPS (Recommended)')}</SelectItem>
                                                <SelectItem value="http">HTTP</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.reverb_scheme && (
                                            <p className="text-sm text-destructive">{errors.reverb_scheme}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="reverb_app_id">{t('App ID')}</Label>
                                        <Input
                                            id="reverb_app_id"
                                            value={data.reverb_app_id}
                                            onChange={(e) => setData('reverb_app_id', e.target.value)}
                                            placeholder="my-app-id"
                                            className="max-w-md"
                                        />
                                        {errors.reverb_app_id && (
                                            <p className="text-sm text-destructive">{errors.reverb_app_id}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="reverb_key">{t('App Key')}</Label>
                                            {settings.reverb_has_key && (
                                                <Badge variant="success" className="text-xs">
                                                    <Check className="h-3 w-3 me-1" />
                                                    {t('Configured')}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="relative max-w-md">
                                            <Input
                                                id="reverb_key"
                                                type={showReverbKey ? 'text' : 'password'}
                                                value={data.reverb_key}
                                                onChange={(e) => setData('reverb_key', e.target.value)}
                                                placeholder={settings.reverb_has_key ? t('Leave blank to keep existing') : t('Enter app key')}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute end-2 top-1/2 -translate-y-1/2"
                                                onClick={() => setShowReverbKey(!showReverbKey)}
                                            >
                                                {showReverbKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                        {errors.reverb_key && (
                                            <p className="text-sm text-destructive">{errors.reverb_key}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="reverb_secret">{t('App Secret')}</Label>
                                            {settings.reverb_has_secret && (
                                                <Badge variant="success" className="text-xs">
                                                    <Check className="h-3 w-3 me-1" />
                                                    {t('Configured')}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="relative max-w-md">
                                            <Input
                                                id="reverb_secret"
                                                type={showReverbSecret ? 'text' : 'password'}
                                                value={data.reverb_secret}
                                                onChange={(e) => setData('reverb_secret', e.target.value)}
                                                placeholder={settings.reverb_has_secret ? t('Leave blank to keep existing') : t('Enter app secret')}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute end-2 top-1/2 -translate-y-1/2"
                                                onClick={() => setShowReverbSecret(!showReverbSecret)}
                                            >
                                                {showReverbSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                        {errors.reverb_secret && (
                                            <p className="text-sm text-destructive">{errors.reverb_secret}</p>
                                        )}
                                    </div>
                                </>
                            )}

                            <div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={testConnection}
                                    disabled={testing}
                                >
                                    {testing ? (
                                        <Loader2 className="h-4 w-4 me-2 animate-spin" />
                                    ) : (
                                        <Wifi className="h-4 w-4 me-2" />
                                    )}
                                    {t('Test Connection')}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* System Firebase */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Flame className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-medium">{t('System Firebase')}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {t('Configure Firebase for projects using the system Firebase config.')}{' '}
                            <a
                                href="https://console.firebase.google.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                            >
                                {t('Firebase Console')}
                            </a>
                        </p>

                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firebase_system_project_id">{t('Project ID')}</Label>
                                <Input
                                    id="firebase_system_project_id"
                                    value={data.firebase_system_project_id}
                                    onChange={(e) => setData('firebase_system_project_id', e.target.value)}
                                    placeholder="my-project-id"
                                    className="max-w-md"
                                />
                                {errors.firebase_system_project_id && (
                                    <p className="text-sm text-destructive">{errors.firebase_system_project_id}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="firebase_system_api_key">{t('API Key')}</Label>
                                    {settings.firebase_has_api_key && (
                                        <Badge variant="success" className="text-xs">
                                            <Check className="h-3 w-3 me-1" />
                                            {t('Configured')}
                                        </Badge>
                                    )}
                                </div>
                                <div className="relative max-w-md">
                                    <Input
                                        id="firebase_system_api_key"
                                        type={showFirebaseApiKey ? 'text' : 'password'}
                                        value={data.firebase_system_api_key}
                                        onChange={(e) => setData('firebase_system_api_key', e.target.value)}
                                        placeholder={settings.firebase_has_api_key ? t('Leave blank to keep existing') : t('Enter API key')}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute end-2 top-1/2 -translate-y-1/2"
                                        onClick={() => setShowFirebaseApiKey(!showFirebaseApiKey)}
                                    >
                                        {showFirebaseApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                                {errors.firebase_system_api_key && (
                                    <p className="text-sm text-destructive">{errors.firebase_system_api_key}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="firebase_system_auth_domain">{t('Auth Domain')}</Label>
                                <Input
                                    id="firebase_system_auth_domain"
                                    value={data.firebase_system_auth_domain}
                                    onChange={(e) => setData('firebase_system_auth_domain', e.target.value)}
                                    placeholder="my-project.firebaseapp.com"
                                    className="max-w-md"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="firebase_system_storage_bucket">{t('Storage Bucket')}</Label>
                                <Input
                                    id="firebase_system_storage_bucket"
                                    value={data.firebase_system_storage_bucket}
                                    onChange={(e) => setData('firebase_system_storage_bucket', e.target.value)}
                                    placeholder="my-project.appspot.com"
                                    className="max-w-md"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="firebase_system_messaging_sender_id">{t('Messaging Sender ID')}</Label>
                                <Input
                                    id="firebase_system_messaging_sender_id"
                                    value={data.firebase_system_messaging_sender_id}
                                    onChange={(e) => setData('firebase_system_messaging_sender_id', e.target.value)}
                                    placeholder="123456789"
                                    className="max-w-md"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="firebase_system_app_id">{t('App ID')}</Label>
                                <Input
                                    id="firebase_system_app_id"
                                    value={data.firebase_system_app_id}
                                    onChange={(e) => setData('firebase_system_app_id', e.target.value)}
                                    placeholder="1:123456789:web:abc123"
                                    className="max-w-md"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={testFirebaseConnection}
                                    disabled={testingFirebase || !data.firebase_system_project_id}
                                >
                                    {testingFirebase ? (
                                        <Loader2 className="h-4 w-4 me-2 animate-spin" />
                                    ) : (
                                        <Wifi className="h-4 w-4 me-2" />
                                    )}
                                    {t('Test Connection')}
                                </Button>
                                <Dialog open={firebasePasteOpen} onOpenChange={setFirebasePasteOpen}>
                                    <DialogTrigger asChild>
                                        <Button type="button" variant="outline" size="sm">
                                            <ClipboardPaste className="h-4 w-4 me-2" />
                                            {t('Paste Config')}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>{t('Paste Firebase Configuration')}</DialogTitle>
                                            <DialogDescription>
                                                {t('Paste your Firebase config from the Firebase Console')}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <Textarea
                                                value={firebasePasteValue}
                                                onChange={(e) => handleFirebasePasteChange(e.target.value)}
                                                placeholder={t('Paste firebaseConfig = {...} or just the config object')}
                                                rows={12}
                                                className="font-mono text-sm"
                                            />
                                            {firebasePasteError && (
                                                <p className="text-sm text-destructive">{firebasePasteError}</p>
                                            )}
                                        </div>
                                        <DialogFooter>
                                            <Button type="button" variant="outline" onClick={() => setFirebasePasteOpen(false)}>
                                                {t('Cancel')}
                                            </Button>
                                            <Button type="button" onClick={handleFirebasePasteApply}>
                                                {t('Apply Config')}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Firebase Admin SDK */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-medium">{t('Firebase Admin SDK')}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {t('Upload service account key for server-side Firestore operations.')}{' '}
                            <a
                                href="https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                            >
                                {t('Get Service Account Key')}
                            </a>
                        </p>

                        <FirebaseAdminUpload
                            configured={settings.firebase_admin_configured}
                            projectId={settings.firebase_admin_project_id}
                            clientEmail={settings.firebase_admin_client_email}
                        />
                    </div>

                    <Separator />

                    {/* Internal AI Provider */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-medium">{t('Internal AI Provider')}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {t('AI provider for internal features like suggestions and greetings')}
                        </p>

                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="internal_ai_provider">{t('AI Provider')}</Label>
                                <Select
                                    value={data.internal_ai_provider_id || 'none'}
                                    onValueChange={handleProviderChange}
                                >
                                    <SelectTrigger className="max-w-md">
                                        <SelectValue placeholder={t('Select provider')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">{t('Not Configured')}</SelectItem>
                                        {aiProviders.map((provider) => (
                                            <SelectItem key={provider.id} value={provider.id.toString()}>
                                                {provider.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    {t('Select from AI Providers configured in the system')}
                                </p>
                                {errors.internal_ai_provider_id && (
                                    <p className="text-sm text-destructive">{errors.internal_ai_provider_id}</p>
                                )}
                            </div>

                            {availableModels.length > 0 && (
                                <div className="space-y-2">
                                    <Label htmlFor="internal_ai_model">{t('Model')}</Label>
                                    <Select
                                        value={data.internal_ai_model || availableModels[0]?.value || ''}
                                        onValueChange={(value) => setData('internal_ai_model', value)}
                                    >
                                        <SelectTrigger className="max-w-md">
                                            <SelectValue placeholder={t('Select model')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableModels.map((model) => (
                                                <SelectItem key={model.value} value={model.value}>
                                                    {model.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        {t('Use a fast, cost-effective model for internal features')}
                                    </p>
                                    {errors.internal_ai_model && (
                                        <p className="text-sm text-destructive">{errors.internal_ai_model}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex items-center gap-4">
                        <Button type="submit" disabled={processing}>
                            {processing ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
                            {t('Save Changes')}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
