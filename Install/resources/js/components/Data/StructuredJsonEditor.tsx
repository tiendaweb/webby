import { useMemo, useState } from 'react';
import { Braces, ListPlus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/contexts/LanguageContext';
import { ProjectImageValueEditor } from './ProjectImageValueEditor';

type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type JsonType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';

interface StructuredJsonEditorProps {
    projectId: string;
    value: JsonValue;
    onChange: (value: JsonValue) => void;
    readOnly?: boolean;
}

interface JsonNodeProps {
    projectId: string;
    label: string;
    fieldName: string;
    value: JsonValue;
    depth: number;
    readOnly: boolean;
    onChange: (value: JsonValue) => void;
    onRemove?: () => void;
}

function typeOfJson(value: JsonValue): JsonType {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    return 'string';
}

function defaultValueFor(type: JsonType): JsonValue {
    switch (type) {
        case 'number':
            return 0;
        case 'boolean':
            return false;
        case 'null':
            return null;
        case 'object':
            return {};
        case 'array':
            return [];
        default:
            return '';
    }
}

function isImageField(fieldName: string, value: string): boolean {
    return /(?:image|img|avatar|logo|thumbnail|thumb|photo|picture|poster|src|url)$/i.test(fieldName)
        || /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(value)
        || /^(https?:\/\/|\/api\/files\/|\/project\/|data:image\/)/i.test(value);
}

function isPlainObject(value: JsonValue): value is { [key: string]: JsonValue } {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function JsonNode({
    projectId,
    label,
    fieldName,
    value,
    depth,
    readOnly,
    onChange,
    onRemove,
}: JsonNodeProps) {
    const { t } = useTranslation();
    const [newKey, setNewKey] = useState('');
    const [newType, setNewType] = useState<JsonType>('string');

    const currentType = typeOfJson(value);
    const entries = useMemo(() => isPlainObject(value) ? Object.entries(value) : [], [value]);

    const addObjectKey = () => {
        if (!isPlainObject(value) || readOnly) return;
        const key = newKey.trim();
        if (!key || Object.prototype.hasOwnProperty.call(value, key)) return;
        onChange({ ...value, [key]: defaultValueFor(newType) });
        setNewKey('');
    };

    const addArrayItem = () => {
        if (!Array.isArray(value) || readOnly) return;
        onChange([...value, defaultValueFor(newType)]);
    };

    const removeObjectKey = (key: string) => {
        if (!isPlainObject(value) || readOnly) return;
        const next = { ...value };
        delete next[key];
        onChange(next);
    };

    const updateObjectKey = (key: string, childValue: JsonValue) => {
        if (!isPlainObject(value)) return;
        onChange({ ...value, [key]: childValue });
    };

    const updateArrayItem = (index: number, childValue: JsonValue) => {
        if (!Array.isArray(value)) return;
        onChange(value.map((item, itemIndex) => itemIndex === index ? childValue : item));
    };

    const removeArrayItem = (index: number) => {
        if (!Array.isArray(value) || readOnly) return;
        onChange(value.filter((_, itemIndex) => itemIndex !== index));
    };

    return (
        <div className="border-b last:border-b-0">
            <div className="flex items-center gap-2 px-3 py-2" style={{ paddingLeft: `${12 + depth * 14}px` }}>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">{currentType}</div>
                </div>
                {!readOnly && (
                    <Select value={currentType} onValueChange={(next) => onChange(defaultValueFor(next as JsonType))}>
                        <SelectTrigger className="h-8 w-28">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="string">{t('Text')}</SelectItem>
                            <SelectItem value="number">{t('Number')}</SelectItem>
                            <SelectItem value="boolean">{t('Boolean')}</SelectItem>
                            <SelectItem value="null">{t('Empty')}</SelectItem>
                            <SelectItem value="object">{t('Object')}</SelectItem>
                            <SelectItem value="array">{t('Array')}</SelectItem>
                        </SelectContent>
                    </Select>
                )}
                {onRemove && !readOnly && (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove} title={t('Delete')}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {currentType === 'string' && (
                <div className="px-3 pb-3" style={{ paddingLeft: `${12 + depth * 14}px` }}>
                    {isImageField(fieldName, value as string) ? (
                        <ProjectImageValueEditor
                            projectId={projectId}
                            value={value as string}
                            onChange={onChange}
                            disabled={readOnly}
                        />
                    ) : (value as string).length > 120 ? (
                        <Textarea
                            value={value as string}
                            readOnly={readOnly}
                            onChange={(event) => onChange(event.target.value)}
                            className="min-h-24 font-mono text-xs"
                        />
                    ) : (
                        <Input
                            value={value as string}
                            readOnly={readOnly}
                            onChange={(event) => onChange(event.target.value)}
                        />
                    )}
                </div>
            )}

            {currentType === 'number' && (
                <div className="px-3 pb-3" style={{ paddingLeft: `${12 + depth * 14}px` }}>
                    <Input
                        type="number"
                        value={Number.isFinite(value as number) ? String(value) : '0'}
                        readOnly={readOnly}
                        onChange={(event) => onChange(Number(event.target.value))}
                    />
                </div>
            )}

            {currentType === 'boolean' && (
                <div className="px-3 pb-3" style={{ paddingLeft: `${12 + depth * 14}px` }}>
                    <Select
                        value={(value as boolean) ? 'true' : 'false'}
                        onValueChange={(next) => onChange(next === 'true')}
                        disabled={readOnly}
                    >
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="true">{t('True')}</SelectItem>
                            <SelectItem value="false">{t('False')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            {currentType === 'object' && (
                <div>
                    {entries.length === 0 && (
                        <div className="px-3 pb-3 text-sm text-muted-foreground" style={{ paddingLeft: `${12 + depth * 14}px` }}>
                            {t('Empty object')}
                        </div>
                    )}
                    {entries.map(([key, childValue]) => (
                        <JsonNode
                            key={key}
                            projectId={projectId}
                            label={key}
                            fieldName={key}
                            value={childValue}
                            depth={depth + 1}
                            readOnly={readOnly}
                            onChange={(next) => updateObjectKey(key, next)}
                            onRemove={() => removeObjectKey(key)}
                        />
                    ))}
                    {!readOnly && (
                        <div className="flex items-end gap-2 px-3 py-3" style={{ paddingLeft: `${12 + depth * 14}px` }}>
                            <div className="min-w-0 flex-1 space-y-1">
                                <Label className="text-xs">{t('New key')}</Label>
                                <Input value={newKey} onChange={(event) => setNewKey(event.target.value)} />
                            </div>
                            <Select value={newType} onValueChange={(next) => setNewType(next as JsonType)}>
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="string">{t('Text')}</SelectItem>
                                    <SelectItem value="number">{t('Number')}</SelectItem>
                                    <SelectItem value="boolean">{t('Boolean')}</SelectItem>
                                    <SelectItem value="null">{t('Empty')}</SelectItem>
                                    <SelectItem value="object">{t('Object')}</SelectItem>
                                    <SelectItem value="array">{t('Array')}</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button type="button" variant="outline" size="icon" onClick={addObjectKey} disabled={newKey.trim() === ''}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {currentType === 'array' && (
                <div>
                    {(value as JsonValue[]).length === 0 && (
                        <div className="px-3 pb-3 text-sm text-muted-foreground" style={{ paddingLeft: `${12 + depth * 14}px` }}>
                            {t('Empty array')}
                        </div>
                    )}
                    {(value as JsonValue[]).map((childValue, index) => (
                        <JsonNode
                            key={index}
                            projectId={projectId}
                            label={`${t('Item')} ${index + 1}`}
                            fieldName={fieldName}
                            value={childValue}
                            depth={depth + 1}
                            readOnly={readOnly}
                            onChange={(next) => updateArrayItem(index, next)}
                            onRemove={() => removeArrayItem(index)}
                        />
                    ))}
                    {!readOnly && (
                        <div className="flex items-center gap-2 px-3 py-3" style={{ paddingLeft: `${12 + depth * 14}px` }}>
                            <Select value={newType} onValueChange={(next) => setNewType(next as JsonType)}>
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="string">{t('Text')}</SelectItem>
                                    <SelectItem value="number">{t('Number')}</SelectItem>
                                    <SelectItem value="boolean">{t('Boolean')}</SelectItem>
                                    <SelectItem value="null">{t('Empty')}</SelectItem>
                                    <SelectItem value="object">{t('Object')}</SelectItem>
                                    <SelectItem value="array">{t('Array')}</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addArrayItem}>
                                <ListPlus className="h-4 w-4" />
                                {t('Add item')}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function StructuredJsonEditor({ projectId, value, onChange, readOnly = false }: StructuredJsonEditorProps) {
    const { t } = useTranslation();

    return (
        <div className="h-full min-h-0 bg-background">
            <div className="flex h-10 items-center gap-2 border-b px-3">
                <Braces className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('Structured JSON')}</span>
            </div>
            <ScrollArea className="h-[calc(100%-2.5rem)]">
                <JsonNode
                    projectId={projectId}
                    label={t('Document')}
                    fieldName="document"
                    value={value}
                    depth={0}
                    readOnly={readOnly}
                    onChange={onChange}
                />
            </ScrollArea>
        </div>
    );
}
