import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Check, X, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

export interface PlanFeature {
    name: string;
    included: boolean;
}

interface FeatureManagerProps {
    features: PlanFeature[];
    onChange: (features: PlanFeature[]) => void;
    error?: string;
}

export default function FeatureManager({ features, onChange, error }: FeatureManagerProps) {
    const { t } = useTranslation();
    const [newFeatureName, setNewFeatureName] = useState('');
    const [newFeatureIncluded, setNewFeatureIncluded] = useState<'true' | 'false'>('true');

    const handleAddFeature = () => {
        if (!newFeatureName.trim()) return;

        const newFeature: PlanFeature = {
            name: newFeatureName.trim(),
            included: newFeatureIncluded === 'true',
        };

        onChange([...features, newFeature]);
        setNewFeatureName('');
        setNewFeatureIncluded('true');
    };

    const handleRemoveFeature = (index: number) => {
        const updated = features.filter((_, i) => i !== index);
        onChange(updated);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddFeature();
        }
    };

    return (
        <div className="space-y-4">
            <Label>{t('Custom Features')}</Label>

            {/* Add Feature Form */}
            <div className="flex gap-2">
                <Input
                    placeholder={t('Feature name')}
                    value={newFeatureName}
                    onChange={(e) => setNewFeatureName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1"
                />
                <Select
                    value={newFeatureIncluded}
                    onValueChange={(value: 'true' | 'false') => setNewFeatureIncluded(value)}
                >
                    <SelectTrigger className="w-[140px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="true">
                            <span className="flex items-center gap-2">
                                <Check className="h-3 w-3 text-success" />
                                {t('Included')}
                            </span>
                        </SelectItem>
                        <SelectItem value="false">
                            <span className="flex items-center gap-2">
                                <X className="h-3 w-3 text-destructive" />
                                {t('Not Included')}
                            </span>
                        </SelectItem>
                    </SelectContent>
                </Select>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddFeature}
                    disabled={!newFeatureName.trim()}
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* Features List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
                {features.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
                        {t('No custom features added yet')}
                    </p>
                ) : (
                    features.map((feature, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-2 p-2 bg-muted/50 rounded-md group"
                        >
                            {feature.included ? (
                                <Check className="h-4 w-4 text-success flex-shrink-0" />
                            ) : (
                                <X className="h-4 w-4 text-destructive flex-shrink-0" />
                            )}
                            <span className="flex-1 text-sm">{feature.name}</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveFeature(index)}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
