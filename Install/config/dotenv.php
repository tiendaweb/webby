<?php
// Ensure .env variables are loaded into PHP environment
// This file is loaded early in the application bootstrap

if (file_exists(base_path('.env'))) {
    try {
        if (class_exists('Dotenv\\Dotenv')) {
            Dotenv\Dotenv::createImmutable(base_path())->load();
        }
    } catch (\Exception $e) {
        // Silently fail
    }
}

// Also try manual loading if Dotenv not available
if (!getenv('APP_KEY')) {
    $envPath = base_path('.env');
    if (file_exists($envPath)) {
        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) {
                continue;
            }
            if (strpos($line, '=') !== false) {
                [$key, $value] = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                if ((substr($value, 0, 1) === '"' && substr($value, -1) === '"') ||
                    (substr($value, 0, 1) === "'" && substr($value, -1) === "'")) {
                    $value = substr($value, 1, -1);
                }
                putenv("$key=$value");
                $_ENV[$key] = $_SERVER[$key] = $value;
            }
        }
    }
}
