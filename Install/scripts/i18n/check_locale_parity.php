#!/usr/bin/env php
<?php

declare(strict_types=1);

$baseDir = dirname(__DIR__, 2);
$enDir = $baseDir . '/lang/en';
$targetDir = $baseDir . '/lang/es_AR';

$nonTranslatableValues = [
    'PayPal',
    'SMTP',
    'TLS',
    'SSL',
    'URL',
    'ID',
    'RTL',
    'LTR',
    'Logo',
    'Favicon',
    'MRR',
    'Sendmail',
    'Manual',
    'General',
    'Plan',
    'Total',
    'Color',
    'tokens',
    'Tokens',
    'noreply@example.com',
    'Error',
    'Slug',
    'Host',
    'Avatar',
    'Admin SDK',
    'Subtotal',
    'smtp.example.com',
    'admin@example.com',
    'Sarah Chen',
    'Marcus Rodriguez',
    'Emily Thompson',
    'Retro',
    'Coral',
    'Unlimited',
    'Next',
    'Previous',
];

$allowedExtraKeys = [
    'es_AR' => [
        // 'navigation.json' => ['example.key'],
    ],
];

$errors = [];
$enFiles = glob($enDir . '/*.json') ?: [];

foreach ($enFiles as $enFile) {
    $fileName = basename($enFile);
    $targetFile = $targetDir . '/' . $fileName;

    if (!file_exists($targetFile)) {
        $errors[] = "Missing locale file: es_AR/{$fileName}";
        continue;
    }

    $enJson = json_decode((string) file_get_contents($enFile), true);
    $targetJson = json_decode((string) file_get_contents($targetFile), true);

    if (!is_array($enJson) || !is_array($targetJson)) {
        $errors[] = "Invalid JSON in {$fileName}";
        continue;
    }

    $missingKeys = array_diff_key($enJson, $targetJson);
    foreach (array_keys($missingKeys) as $key) {
        $errors[] = "es_AR/{$fileName} missing key: {$key}";
    }

    $extraKeys = array_diff_key($targetJson, $enJson);
    $allowedFileExtras = $allowedExtraKeys['es_AR'][$fileName] ?? [];
    foreach (array_keys($extraKeys) as $key) {
        if (!in_array($key, $allowedFileExtras, true)) {
            $errors[] = "es_AR/{$fileName} has extra key not allowed: {$key}";
        }
    }

    foreach ($enJson as $key => $enValue) {
        if (!array_key_exists($key, $targetJson)) {
            continue;
        }

        $targetValue = $targetJson[$key];

        if (!is_string($enValue) || !is_string($targetValue)) {
            continue;
        }

        if ($enValue !== $targetValue) {
            continue;
        }

        if (in_array($enValue, $nonTranslatableValues, true)) {
            continue;
        }

        $errors[] = "es_AR/{$fileName} key '{$key}' has untranslated value identical to en: '{$enValue}'";
    }
}

if ($errors !== []) {
    fwrite(STDERR, "Locale parity check failed:\n");
    foreach ($errors as $error) {
        fwrite(STDERR, " - {$error}\n");
    }
    exit(1);
}

echo "Locale parity check passed for es_AR against en.\n";
