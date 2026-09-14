import { ChangeEvent, useState } from 'react';
import axios from 'axios';
import { Image, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/contexts/LanguageContext';

interface ProjectImageValueEditorProps {
    projectId: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

function looksRenderable(value: string): boolean {
    return /^(https?:\/\/|\/api\/files\/|\/project\/|data:image\/)/i.test(value)
        || /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(value);
}

export function ProjectImageValueEditor({ projectId, value, onChange, disabled = false }: ProjectImageValueEditorProps) {
    const { t } = useTranslation();
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await axios.post(`/project/${projectId}/files`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const serverFile = response.data.file;
            onChange(serverFile.api_url || serverFile.url);
            toast.success(t('Image uploaded'));
        } catch (error) {
            const message = axios.isAxiosError(error)
                ? error.response?.data?.error || error.response?.data?.message
                : null;
            toast.error(message || t('Failed to upload image'));
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <Input value={value} onChange={(event) => onChange(event.target.value)} readOnly={disabled} disabled={disabled} />
                <Button type="button" variant="outline" size="icon" disabled={uploading || disabled} asChild>
                    <Label className="h-10 w-10 cursor-pointer justify-center">
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={disabled} />
                    </Label>
                </Button>
            </div>
            {value && looksRenderable(value) && (
                <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
                    <Image className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <img src={value} alt="" className="max-h-24 max-w-full rounded object-contain" />
                </div>
            )}
        </div>
    );
}
