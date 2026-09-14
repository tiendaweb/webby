<?php

use App\Http\Controllers\Api\BuilderFirestoreController;
use App\Http\Controllers\Api\Mcp\McpAdminController;
use App\Http\Controllers\Oauth\RegistrationController as OAuthRegistrationController;
use App\Http\Controllers\Oauth\TokenController as OAuthTokenController;
use App\Http\Controllers\Api\Mcp\McpProjectController;
use App\Http\Controllers\BuilderWebhookController;
use App\Http\Controllers\ProjectFileController;
use App\Http\Controllers\TemplateApiController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group.
|
*/

// Builder webhook - receives events from Go builder service
// Authenticated via X-Server-Key header (validated against builders table)
Route::post('/builder/webhook', [BuilderWebhookController::class, 'handle'])
    ->middleware('verify.server.key')
    ->name('builder.webhook');

// Template API - for builder Go service
// These endpoints require X-Server-Key header authentication
Route::middleware('verify.server.key')->group(function () {
    Route::get('/templates', [TemplateApiController::class, 'index'])->name('api.templates.index');
    Route::get('/templates/{id}', [TemplateApiController::class, 'show'])->name('api.templates.show');
    Route::get('/templates/{id}/download', [TemplateApiController::class, 'download'])->name('api.templates.download');

    // Firestore collections for builder AI agent
    Route::get('/builder/projects/{project}/firestore/collections', [BuilderFirestoreController::class, 'collections']);
});
// Public file serving - no auth required
// Filenames are UUIDs so they are unguessable, safe to serve publicly.
// Used by AI-generated code to embed project files (images, etc.) in <img> tags.
Route::get('/files/{projectId}/{filename}', [ProjectFileController::class, 'publicServe'])
    ->name('api.files.public');

// Generated app file API - authenticated via project API token
// Used by generated apps to upload/retrieve files
Route::middleware('verify.project.token')->group(function () {
    Route::post('/app/{projectId}/files', [ProjectFileController::class, 'appUpload'])
        ->name('api.app.files.upload');
    Route::get('/app/{projectId}/files/{path}', [ProjectFileController::class, 'appServe'])
        ->where('path', '.*')
        ->name('api.app.files.serve');
    Route::get('/app/{projectId}/files', [ProjectFileController::class, 'appIndex'])
        ->name('api.app.files.index');
    Route::delete('/app/{projectId}/files/{fileId}', [ProjectFileController::class, 'appDestroy'])
        ->name('api.app.files.destroy');
});

// MCP connectors (JSON-RPC 2.0, Streamable HTTP transport, single POST per call).
//
// Every server is exposed twice, on purpose:
//   1. header auth  — POST /api/mcp/{server}            + Authorization: Bearer <token>
//   2. URL auth     — POST /api/mcp/{server}/k/{token}
// Form (1) is what CLI/desktop clients use (Claude Code, Claude Desktop via
// mcp-remote, the MCP Inspector, curl). Form (2) exists because the in-app
// connector directories of Claude, ChatGPT and Grok accept a remote MCP URL
// but give you nowhere to type a header — without it those three products
// cannot authenticate at all. Both forms carry the same credential, so a
// form-(2) URL is a password and the Connect screen says so.
//
// GET answers 405 (this server never pushes), DELETE answers 204, and
// OPTIONS answers the CORS preflight browser-hosted clients send first.
Route::middleware('mcp.cors')->group(function () {

    // --- Admin server: full-platform tools, Sanctum token on a role=admin user.
    Route::post('/mcp/admin', [McpAdminController::class, 'handle'])
        ->middleware(['auth:sanctum', 'throttle:mcp-admin'])
        ->name('api.mcp.admin');
    Route::get('/mcp/admin', [McpAdminController::class, 'stream']);
    Route::delete('/mcp/admin', [McpAdminController::class, 'terminate']);
    Route::options('/mcp/admin', [McpAdminController::class, 'preflight']);

    Route::post('/mcp/admin/k/{connector_token}', [McpAdminController::class, 'handle'])
        ->middleware(['verify.mcp.url.token', 'throttle:mcp-admin'])
        ->name('api.mcp.admin.url');
    Route::get('/mcp/admin/k/{connector_token}', [McpAdminController::class, 'stream']);
    Route::delete('/mcp/admin/k/{connector_token}', [McpAdminController::class, 'terminate']);
    Route::options('/mcp/admin/k/{connector_token}', [McpAdminController::class, 'preflight']);

    // --- Project server: read/write tools scoped to exactly one project, via a
    // dedicated hashed connector token (see VerifyConnectorToken) — never the
    // same credential as the generated-app api_token above.
    Route::post('/mcp/project/{project}', [McpProjectController::class, 'handle'])
        ->middleware(['verify.connector.token', 'throttle:mcp-project'])
        ->name('api.mcp.project');
    Route::get('/mcp/project/{project}', [McpProjectController::class, 'stream']);
    Route::delete('/mcp/project/{project}', [McpProjectController::class, 'terminate']);
    Route::options('/mcp/project/{project}', [McpProjectController::class, 'preflight']);

    Route::post('/mcp/project/{project}/k/{connector_token}', [McpProjectController::class, 'handle'])
        ->middleware(['verify.connector.token', 'throttle:mcp-project'])
        ->name('api.mcp.project.url');
    Route::get('/mcp/project/{project}/k/{connector_token}', [McpProjectController::class, 'stream']);
    Route::delete('/mcp/project/{project}/k/{connector_token}', [McpProjectController::class, 'terminate']);
    Route::options('/mcp/project/{project}/k/{connector_token}', [McpProjectController::class, 'preflight']);
});

// OAuth 2.1 machine endpoints for the MCP connectors. They live under /api
// rather than /oauth so they inherit the API middleware group: no session,
// no CSRF token — neither of which a client exchanging a code has.
// The public metadata that advertises these URLs is in routes/web.php.
Route::middleware('mcp.cors')->group(function () {
    // Open dynamic client registration (RFC 7591). A client row grants
    // nothing on its own; the access decision happens on the consent screen.
    Route::post('/oauth/register', [OAuthRegistrationController::class, 'register'])
        ->middleware('throttle:20,1')
        ->name('api.oauth.register');
    Route::options('/oauth/register', fn () => response('', 204));

    Route::post('/oauth/token', [OAuthTokenController::class, 'issue'])
        ->middleware('throttle:60,1')
        ->name('api.oauth.token');
    Route::options('/oauth/token', fn () => response('', 204));

    Route::post('/oauth/revoke', [OAuthTokenController::class, 'revoke'])
        ->middleware('throttle:60,1')
        ->name('api.oauth.revoke');
    Route::options('/oauth/revoke', fn () => response('', 204));
});
