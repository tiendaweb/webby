<?php
// Load .env file and set environment variables before Laravel bootstrap
$envPath = '/var/www/html/.env';

// Log that bootstrap is running
error_log('Bootstrap.php is executing for APP_KEY setup');

if (file_exists($envPath)) {
    $content = file_get_contents($envPath);
    if ($content) {
        // Use Dotenv library if available, otherwise parse manually
        try {
            if (class_exists('Dotenv\\Dotenv')) {
                (new Dotenv\Dotenv('/var/www/html'))->load();
            }
        } catch (\Exception $e) {
            // Silently fail and continue with manual loading
        }

        // Always do manual loading to ensure APP_KEY is set properly
        $lines = explode("\n", $content);
        foreach ($lines as $line) {
            $line = trim($line);

            // Skip empty lines and comments
            if (empty($line) || strpos($line, '#') === 0) {
                continue;
            }

            // Parse KEY=VALUE
            if (strpos($line, '=') !== false) {
                [$key, $value] = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);

                // Remove quotes if present
                if ((substr($value, 0, 1) === '"' && substr($value, -1) === '"') ||
                    (substr($value, 0, 1) === "'" && substr($value, -1) === "'")) {
                    $value = substr($value, 1, -1);
                }

                // Set environment variable - use $_ENV which is more reliable in Laravel
                $_ENV[$key] = $value;
                $_SERVER[$key] = $value;

                // Also try putenv for system-level access
                @putenv("$key=$value");

                // Also set in PHP's getenv() via putenv
                // Note: putenv only affects the current PHP process, not child processes
                // But we still try in case it helps
                putenv("$key=$value");
            }
        }
    }
}
