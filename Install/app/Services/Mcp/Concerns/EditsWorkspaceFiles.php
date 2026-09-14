<?php

namespace App\Services\Mcp\Concerns;

/**
 * Argument shapes shared by the admin and project versions of the
 * surgical-edit, download and search tools. The two servers differ only in
 * how they get hold of the project, so keeping the schemas in one place
 * stops the pair from drifting apart as they are tuned.
 */
trait EditsWorkspaceFiles
{
    protected function editsSchema(): array
    {
        return [
            'path' => ['type' => 'string', 'description' => 'File to change, e.g. "index.html" or "src/App.tsx".'],
            'edits' => [
                'type' => 'array',
                'minItems' => 1,
                'description' => 'Applied in order, all-or-nothing: if any "find" matches nothing, the file is left untouched.',
                'items' => [
                    'type' => 'object',
                    'properties' => [
                        'find' => ['type' => 'string', 'description' => 'Exact text to look for (or a regular expression when regex=true). Include enough surrounding text to be unambiguous.'],
                        'replace' => ['type' => 'string', 'description' => 'What to put in its place. Empty string deletes the match.'],
                        'all' => ['type' => 'boolean', 'default' => true, 'description' => 'false replaces only the first match, and fails if there is more than one.'],
                        'regex' => ['type' => 'boolean', 'default' => false, 'description' => 'Treat "find" as a regular expression (no delimiters, unicode mode).'],
                        'expected_occurrences' => ['type' => 'integer', 'description' => 'Fail unless "find" matches exactly this many times. Use it when you know the count.'],
                    ],
                    'required' => ['find', 'replace'],
                ],
            ],
            'dry_run' => ['type' => 'boolean', 'default' => false, 'description' => 'Report what would change without writing.'],
        ];
    }

    protected function downloadSchema(): array
    {
        return [
            'url' => ['type' => 'string', 'description' => 'Public http(s) URL of the image or file to fetch.'],
            'path' => ['type' => 'string', 'description' => 'Where to save it, e.g. "assets/hero.jpg". Defaults to assets/ plus the name from the URL.'],
            'overwrite' => ['type' => 'boolean', 'default' => false],
        ];
    }

    protected function searchSchema(): array
    {
        return [
            'query' => ['type' => 'string', 'description' => 'Text to look for, or a regular expression when regex=true.'],
            'path_prefix' => ['type' => 'string', 'description' => 'Restrict the search to this folder, e.g. "src/".'],
            'regex' => ['type' => 'boolean', 'default' => false],
            'case_sensitive' => ['type' => 'boolean', 'default' => false],
            'limit' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 500, 'default' => 100],
        ];
    }
}
