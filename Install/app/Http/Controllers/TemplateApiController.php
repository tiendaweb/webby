<?php

namespace App\Http\Controllers;

use App\Models\Template;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TemplateApiController extends Controller
{
    /**
     * List all available templates for the builder.
     *
     * @authenticated
     */
    public function index(Request $request): JsonResponse
    {
        $templates = Template::query()
            ->select('id', 'slug', 'name', 'description')
            ->latest()
            ->get();

        return response()->json([
            'templates' => $templates->map(fn ($t) => [
                'id' => (string) $t->id,
                'name' => $t->name,
                'description' => $t->description,
            ]),
        ]);
    }

    /**
     * Get detailed metadata about a specific template.
     *
     * @authenticated
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $template = $this->resolveTemplate($id);

        // If metadata is stored, return it; otherwise return basic info
        $metadata = $template->metadata ?? $this->getDefaultMetadata($template);

        return response()->json($metadata);
    }

    /**
     * Download a template as a zip file.
     *
     * @authenticated
     */
    public function download(Request $request, string $id): BinaryFileResponse|StreamedResponse|JsonResponse
    {
        $template = $this->resolveTemplate($id);

        if (! $template->zip_path) {
            return response()->json([
                'error' => 'Template file not available',
            ], 404);
        }

        if (! file_exists($template->zip_path)) {
            return response()->json([
                'error' => 'Template file not found',
            ], 404);
        }

        return response()->download($template->zip_path, "{$template->slug}-template.zip");
    }

    /**
     * Resolve a template by integer ID or slug.
     */
    protected function resolveTemplate(string $id): Template
    {
        if (ctype_digit($id)) {
            return Template::findOrFail($id);
        }

        return Template::where('slug', $id)->firstOrFail();
    }

    /**
     * Get default metadata structure for templates without stored metadata.
     */
    protected function getDefaultMetadata(Template $template): array
    {
        return [
            'id' => (string) $template->id,
            'name' => $template->name,
            'description' => $template->description ?? '',
            'categories' => ['generic'],
            'file_structure' => [
                'pages_dir' => 'src/pages',
                'components_dir' => 'src/components',
                'routes_file' => 'src/routes.tsx',
            ],
            'available_pages' => [],
            'custom_components' => [],
            'shadcn_components' => [
                'Button', 'Card', 'Input', 'Label', 'Textarea',
                'Dialog', 'Tabs', 'Accordion', 'Alert', 'Avatar',
                'Badge', 'Checkbox', 'Select', 'Separator',
                'Switch', 'Table', 'Tooltip', 'Progress',
            ],
            'styling' => [
                'primary_color' => '#3b82f6',
                'framework' => 'tailwind',
                'icon_set' => 'lucide-react',
            ],
            'routing_pattern' => 'react-router',
            'dependencies' => [
                ['name' => 'react-router-dom', 'version' => '^6.26.2'],
            ],
            'usage_examples' => [
                'adding_page' => 'Create new file in src/pages/, then import and add route in src/routes.tsx',
                'adding_route' => 'Add route to routes array in src/routes.tsx: { path: \'/page\', element: <Page /> }',
            ],
        ];
    }
}
