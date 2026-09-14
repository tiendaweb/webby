<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class CreateBlankProject extends Command
{
    protected $signature = 'project:create-blank
                            {user-id : The ID of the user who owns the project}
                            {name : Project name}
                            {--description= : Project description}';

    protected $description = 'Create a blank project for static HTML/CSS/JS hosting';

    public function handle()
    {
        $userId = $this->argument('user-id');
        $name = $this->argument('name');
        $description = $this->option('description');

        $user = User::find($userId);
        if (!$user) {
            $this->error("User with ID {$userId} not found");
            return 1;
        }

        $project = Project::create([
            'user_id' => $user->id,
            'type' => 'blank',
            'name' => $name,
            'description' => $description,
            'initial_prompt' => '[Blank Project - Manual Setup]',
            'build_status' => 'completed',
            'published_at' => now(),
            'api_token' => Str::random(32),
        ]);

        // Create default index.html
        $this->createDefaultIndexHtml($project);

        $this->info("✅ Blank project created successfully!");
        $this->line("Project ID: {$project->id}");
        $this->line("Name: {$project->name}");
        $this->line("URL: https://aapp.pro/project/{$project->id}");
        $this->line("");
        $this->line("Next steps:");
        $this->line("1. Upload your HTML/CSS/JS files via the UI");
        $this->line("2. Or use the ZIP upload feature");
        $this->line("3. Click 'Generate Preview' to see changes");
        $this->line("4. Click 'Publish' to make it live");

        return 0;
    }

    private function createDefaultIndexHtml(Project $project): void
    {
        $html = <<<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{PROJECT_NAME}}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            padding: 40px;
            text-align: center;
            max-width: 600px;
        }

        h1 {
            color: #333;
            margin-bottom: 10px;
        }

        p {
            color: #666;
            margin-bottom: 20px;
            font-size: 16px;
        }

        .info {
            background: #f0f4ff;
            border-left: 4px solid #667eea;
            padding: 15px;
            border-radius: 5px;
            text-align: left;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 {{PROJECT_NAME}}</h1>
        <p>Your blank project is ready!</p>

        <div class="info">
            <p><strong>📝 To customize this site:</strong></p>
            <ol style="text-align: left; padding-left: 20px;">
                <li>Upload your HTML, CSS, and JS files</li>
                <li>Or edit files directly in the file manager</li>
                <li>Click "Generate Preview" to see changes</li>
                <li>Click "Publish" to make it live</li>
            </ol>
        </div>

        <p style="margin-top: 30px; font-size: 14px; color: #999;">
            Built with <strong>aapp.pro</strong> • Static Site Hosting
        </p>
    </div>
</body>
</html>
HTML;

        $html = str_replace('{{PROJECT_NAME}}', $project->name, $html);

        $filename = Str::uuid().'.html';
        $path = "project-files/{$project->id}/index.html";

        \Illuminate\Support\Facades\Storage::disk('local')->put($path, $html);

        \App\Models\ProjectFile::create([
            'project_id' => $project->id,
            'filename' => $filename,
            'original_filename' => 'index.html',
            'path' => $path,
            'mime_type' => 'text/html',
            'size' => strlen($html),
            'source' => 'system',
        ]);
    }
}
