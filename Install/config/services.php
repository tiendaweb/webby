<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Social Login Providers
    |--------------------------------------------------------------------------
    |
    | These are placeholder configs. The actual values are loaded dynamically
    | from SystemSettings in AppServiceProvider::configureSocialiteProviders()
    |
    */

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', '/auth/google/callback'),
    ],

    'facebook' => [
        'client_id' => env('FACEBOOK_CLIENT_ID'),
        'client_secret' => env('FACEBOOK_CLIENT_SECRET'),
        'redirect' => env('FACEBOOK_REDIRECT_URI', '/auth/facebook/callback'),
    ],

    'github' => [
        'client_id' => env('GITHUB_CLIENT_ID'),
        'client_secret' => env('GITHUB_CLIENT_SECRET'),
        'redirect' => env('GITHUB_REDIRECT_URI', '/auth/github/callback'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Firebase Service
    |--------------------------------------------------------------------------
    |
    | System Firebase configuration for plans that use system-provided Firebase.
    |
    */

    'firebase' => [
        'system_api_key' => env('FIREBASE_SYSTEM_API_KEY'),
        'system_auth_domain' => env('FIREBASE_SYSTEM_AUTH_DOMAIN'),
        'system_project_id' => env('FIREBASE_SYSTEM_PROJECT_ID'),
        'system_storage_bucket' => env('FIREBASE_SYSTEM_STORAGE_BUCKET'),
        'system_messaging_sender_id' => env('FIREBASE_SYSTEM_MESSAGING_SENDER_ID'),
        'system_app_id' => env('FIREBASE_SYSTEM_APP_ID'),
    ],

    'sentry' => [
        'endpoint' => env('APP_SENTRY', 'https://sentry.titansys.dev'),
    ],

];
