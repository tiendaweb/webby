<?php

use App\Http\Controllers\Api\BuilderFirestoreController;
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
