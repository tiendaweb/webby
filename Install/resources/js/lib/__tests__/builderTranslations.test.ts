import { describe, it, expect } from 'vitest';
import { translateBuilderMessage } from '../builderTranslations';

describe('translateBuilderMessage', () => {
    const mockT = (key: string) => {
        const translations: Record<string, string> = {
            'Checking the blueprints in': 'فحص المخططات في',
            'Peeking at': 'إلقاء نظرة على',
            'Building': 'بناء',
            'Working on': 'العمل على',
            'Summarizing conversation...': 'تلخيص المحادثة...',
        };
        return translations[key] ?? key;
    };

    it('translates action phrases with file path targets', () => {
        const result = translateBuilderMessage('Checking the blueprints in src/App.tsx', mockT);
        expect(result).toBe('فحص المخططات في src/App.tsx');
    });

    it('translates phrases without targets', () => {
        const result = translateBuilderMessage('Building', mockT);
        expect(result).toBe('بناء');
    });

    it('returns original message if no phrase matches', () => {
        const result = translateBuilderMessage('Unknown action happening', mockT);
        expect(result).toBe('Unknown action happening');
    });

    it('matches longer phrases first to avoid partial matches', () => {
        // "Checking the blueprints in" should match before "Checking"
        const result = translateBuilderMessage('Checking the blueprints in file.ts', mockT);
        expect(result).toBe('فحص المخططات في file.ts');
    });

    it('preserves target path exactly as received', () => {
        const result = translateBuilderMessage('Working on src/components/Header.tsx', mockT);
        expect(result).toBe('العمل على src/components/Header.tsx');
    });

    it('translates status messages without targets', () => {
        const result = translateBuilderMessage('Summarizing conversation...', mockT);
        expect(result).toBe('تلخيص المحادثة...');
    });
});
