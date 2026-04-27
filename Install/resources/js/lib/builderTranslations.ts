/**
 * Builder phrase translation utilities.
 * Translates action messages from Go builder while preserving file paths.
 */

// All known builder phrases - ORDER MATTERS (longer phrases first to avoid partial matches)
const BUILDER_PHRASES = [
    // Create phrases (from Go builder createPhrases)
    'Laying the bricks for',
    'Bringing to life',
    'Whipping up',
    'Conjuring',
    'Cooking up',
    'Crafting',
    'Building',
    'Weaving',
    // Edit phrases (from Go builder editPhrases)
    'Sprinkling magic on',
    'Adding sparkle to',
    'Fine-tuning',
    'Touching up',
    'Polishing',
    'Seasoning',
    // Read phrases (from Go builder readPhrases)
    'Checking the blueprints in',
    'Peeking at',
    'Consulting',
    'Studying',
    'Scanning',
    // Explore phrases (from Go builder explorePhrases)
    'Getting the lay of the land',
    'Scouting the project',
    'Surveying the land',
    'Mapping things out',
    // Tool-specific phrases
    'Learning about',
    'Verifying',
    'Checking',
    'Planning',
    'Browsing',
    'Working on',
    // Status messages
    'Summarizing conversation...',
];

/**
 * Translates builder action messages while preserving file paths/targets.
 * Example: "Checking the blueprints in src/App.tsx" → "فحص المخططات في src/App.tsx"
 */
export function translateBuilderMessage(
    message: string,
    t: (key: string) => string
): string {
    for (const phrase of BUILDER_PHRASES) {
        if (message.startsWith(phrase)) {
            const target = message.slice(phrase.length).trim();
            const translatedPhrase = t(phrase);
            return target ? `${translatedPhrase} ${target}` : translatedPhrase;
        }
    }
    return message; // Return as-is if no known phrase matches
}
