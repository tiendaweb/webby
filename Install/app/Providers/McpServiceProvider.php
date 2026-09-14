<?php

namespace App\Providers;

use App\Services\Mcp\McpToolRegistry;
use App\Services\Mcp\Tools\Admin\AdminAiProvidersUpsertTool;
use App\Services\Mcp\Tools\Admin\AdminCapabilitiesTool;
use App\Services\Mcp\Tools\Admin\AdminConnectorActivationsListTool;
use App\Services\Mcp\Tools\Admin\AdminConnectorActivationsReviewTool;
use App\Services\Mcp\Tools\Admin\AdminConnectorModulesListTool;
use App\Services\Mcp\Tools\Admin\AdminConnectorModulesUpsertTool;
use App\Services\Mcp\Tools\Admin\AdminDatabaseQueryTool;
use App\Services\Mcp\Tools\Admin\AdminDbConnectionsListTool;
use App\Services\Mcp\Tools\Admin\AdminDbRowsListTool;
use App\Services\Mcp\Tools\Admin\AdminDbRowsWriteTool;
use App\Services\Mcp\Tools\Admin\AdminDbSchemaTool;
use App\Services\Mcp\Tools\Admin\AdminDbTablesListTool;
use App\Services\Mcp\Tools\Admin\AdminFetchTool;
use App\Services\Mcp\Tools\Admin\AdminFirebaseCredentialsGetTool;
use App\Services\Mcp\Tools\Admin\AdminFirebaseCredentialsSetTool;
use App\Services\Mcp\Tools\Admin\AdminFirestoreCollectionsListTool;
use App\Services\Mcp\Tools\Admin\AdminFirestoreDocumentGetTool;
use App\Services\Mcp\Tools\Admin\AdminFirestoreDocumentWriteTool;
use App\Services\Mcp\Tools\Admin\AdminFirestoreDocumentsListTool;
use App\Services\Mcp\Tools\Admin\AdminFilesDeleteTool;
use App\Services\Mcp\Tools\Admin\AdminFilesDownloadTool;
use App\Services\Mcp\Tools\Admin\AdminFilesEditTool;
use App\Services\Mcp\Tools\Admin\AdminFilesListTool;
use App\Services\Mcp\Tools\Admin\AdminFilesMkdirTool;
use App\Services\Mcp\Tools\Admin\AdminFilesReadTool;
use App\Services\Mcp\Tools\Admin\AdminFilesRenameTool;
use App\Services\Mcp\Tools\Admin\AdminFilesSearchTool;
use App\Services\Mcp\Tools\Admin\AdminFilesWriteTool;
use App\Services\Mcp\Tools\Admin\AdminNotesListTool;
use App\Services\Mcp\Tools\Admin\AdminNotesRespondTool;
use App\Services\Mcp\Tools\Admin\AdminPlansListTool;
use App\Services\Mcp\Tools\Admin\AdminPlansUpdateTool;
use App\Services\Mcp\Tools\Admin\AdminProjectsCreateTool;
use App\Services\Mcp\Tools\Admin\AdminProjectsDeleteTool;
use App\Services\Mcp\Tools\Admin\AdminProjectsGetFilesTool;
use App\Services\Mcp\Tools\Admin\AdminProjectsImportTool;
use App\Services\Mcp\Tools\Admin\AdminProjectsPreviewBuildTool;
use App\Services\Mcp\Tools\Admin\AdminProjectsPublishTool;
use App\Services\Mcp\Tools\Admin\AdminProjectsUpdateTool;
use App\Services\Mcp\Tools\Admin\AdminProjectsListTool;
use App\Services\Mcp\Tools\Admin\AdminProjectsUpdateFileTool;
use App\Services\Mcp\Tools\Admin\AdminSearchTool;
use App\Services\Mcp\Tools\Admin\AdminSettingsGetTool;
use App\Services\Mcp\Tools\Admin\AdminSettingsSetTool;
use App\Services\Mcp\Tools\Admin\AdminSubscriptionsListTool;
use App\Services\Mcp\Tools\Admin\AdminSubscriptionsManageTool;
use App\Services\Mcp\Tools\Admin\AdminTransactionsListTool;
use App\Services\Mcp\Tools\Admin\AdminTransactionsReviewTool;
use App\Services\Mcp\Tools\Admin\AdminUsersCreateTool;
use App\Services\Mcp\Tools\Admin\AdminUsersImpersonateTool;
use App\Services\Mcp\Tools\Admin\AdminUsersListTool;
use App\Services\Mcp\Tools\Admin\AdminUsersUpdateTool;
use App\Services\Mcp\Tools\Admin\AdminRevisionsListTool;
use App\Services\Mcp\Tools\Admin\AdminRevisionsGetTool;
use App\Services\Mcp\Tools\Admin\AdminRevisionsCreateTool;
use App\Services\Mcp\Tools\Admin\AdminRevisionsRestoreTool;
use App\Services\Mcp\Tools\Admin\AdminProjectsGetTool;
use App\Services\Mcp\Tools\Admin\AdminProjectsDuplicateTool;
use App\Services\Mcp\Tools\Admin\AdminProjectsExportTool;
use App\Services\Mcp\Tools\Admin\AdminFilesUploadTool;
use App\Services\Mcp\Tools\Admin\AdminSeoGetTool;
use App\Services\Mcp\Tools\Admin\AdminSeoSetTool;
use App\Services\Mcp\Tools\Admin\AdminSeoAuditTool;
use App\Services\Mcp\Tools\Admin\AdminStructureGetTool;
use App\Services\Mcp\Tools\Admin\AdminColorsScanTool;
use App\Services\Mcp\Tools\Admin\AdminColorsReplaceTool;
use App\Services\Mcp\Tools\Admin\AdminDomainsGetTool;
use App\Services\Mcp\Tools\Admin\AdminDomainsSetTool;
use App\Services\Mcp\Tools\Admin\AdminDomainsVerifyTool;
use App\Services\Mcp\Tools\Admin\AdminStatsOverviewTool;
use App\Services\Mcp\Tools\Admin\AdminAuditLogListTool;
use App\Services\Mcp\Tools\Admin\AdminMcpCallsListTool;
use App\Services\Mcp\Tools\Project\ProjectRevisionsListTool;
use App\Services\Mcp\Tools\Project\ProjectRevisionsRestoreTool;
use App\Services\Mcp\Tools\Project\ProjectFilesUploadTool;
use App\Services\Mcp\Tools\Project\ProjectPreviewBuildTool;
use App\Services\Mcp\Tools\Project\ProjectDirectoryCreateTool;
use App\Services\Mcp\Tools\Project\ProjectFileDeleteTool;
use App\Services\Mcp\Tools\Project\ProjectFileReadTool;
use App\Services\Mcp\Tools\Project\ProjectFileRenameTool;
use App\Services\Mcp\Tools\Project\ProjectFilesListTool;
use App\Services\Mcp\Tools\Project\ProjectFileWriteTool;
use App\Services\Mcp\Tools\Project\ProjectFilesDownloadTool;
use App\Services\Mcp\Tools\Project\ProjectFilesEditTool;
use App\Services\Mcp\Tools\Project\ProjectFilesSearchTool;
use App\Services\Mcp\Tools\Project\ProjectFirebaseGetConfigTool;
use App\Services\Mcp\Tools\Project\ProjectFirebaseTestConnectionTool;
use App\Services\Mcp\Tools\Project\ProjectFirebaseUpdateConfigTool;
use App\Services\Mcp\Tools\Project\ProjectFirestoreCollectionsListTool;
use App\Services\Mcp\Tools\Project\ProjectFirestoreDocumentGetTool;
use App\Services\Mcp\Tools\Project\ProjectFirestoreDocumentWriteTool;
use App\Services\Mcp\Tools\Project\ProjectFirestoreDocumentsListTool;
use App\Services\Mcp\Tools\Project\ProjectNotesListTool;
use App\Services\Mcp\Tools\Project\ProjectNotesRespondTool;
use App\Services\Mcp\Tools\Project\ProjectPublishTool;
use App\Services\Mcp\Tools\Project\ProjectSettingsGetTool;
use App\Services\Mcp\Tools\Project\ProjectSettingsUpdateGeneralTool;
use App\Services\Mcp\Tools\Project\ProjectUnpublishTool;
use Illuminate\Support\ServiceProvider;

/**
 * Registers every MCP tool with McpToolRegistry so the dispatcher
 * controllers never need to change when tool coverage grows. To add a new
 * tool: create the class under app/Services/Mcp/Tools/{Admin,Project}/ and
 * add one register() call below.
 */
class McpServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(McpToolRegistry::class);
    }

    public function boot(): void
    {
        $registry = $this->app->make(McpToolRegistry::class);

        // --- Admin server tools ---
        $adminTools = [
            // Discovery — no ability required, meant to be called first.
            AdminCapabilitiesTool::class,
            // ChatGPT's connector contract expects exactly "search" + "fetch";
            // they double as a generic "find me that site" entry point.
            AdminSearchTool::class,
            AdminFetchTool::class,

            // Accounts
            AdminUsersListTool::class,
            AdminUsersCreateTool::class,
            AdminUsersUpdateTool::class,
            AdminUsersImpersonateTool::class,

            // Projects / sites
            AdminProjectsListTool::class,
            AdminProjectsCreateTool::class,
            AdminProjectsUpdateTool::class,
            AdminProjectsDeleteTool::class,
            AdminProjectsPublishTool::class,
            AdminProjectsPreviewBuildTool::class,
            AdminProjectsImportTool::class,
            AdminProjectsGetFilesTool::class,
            AdminProjectsUpdateFileTool::class,
            AdminProjectsGetTool::class,
            AdminProjectsDuplicateTool::class,
            AdminProjectsExportTool::class,

            // Deshacer. Va junto a los proyectos a propósito: escribir sin
            // esto es lo que dejaba a un asistente sin marcha atrás.
            AdminRevisionsListTool::class,
            AdminRevisionsGetTool::class,
            AdminRevisionsCreateTool::class,
            AdminRevisionsRestoreTool::class,

            // File manager, across every project
            AdminFilesListTool::class,
            AdminFilesSearchTool::class,
            AdminFilesReadTool::class,
            AdminFilesEditTool::class,
            AdminFilesWriteTool::class,
            AdminFilesDownloadTool::class,
            AdminFilesDeleteTool::class,
            AdminFilesRenameTool::class,
            AdminFilesMkdirTool::class,
            AdminFilesUploadTool::class,

            // Publicar de verdad: dominio, SEO, estructura y color, no sólo
            // el contenido de los ficheros.
            AdminDomainsGetTool::class,
            AdminDomainsSetTool::class,
            AdminDomainsVerifyTool::class,
            AdminSeoGetTool::class,
            AdminSeoSetTool::class,
            AdminSeoAuditTool::class,
            AdminStructureGetTool::class,
            AdminColorsScanTool::class,
            AdminColorsReplaceTool::class,

            // Ver qué pasó: el panel entero, quién cambió qué y qué pidieron
            // los propios conectores.
            AdminStatsOverviewTool::class,
            AdminAuditLogListTool::class,
            AdminMcpCallsListTool::class,

            // Notes left in a project chat for the connectors to act on
            AdminNotesListTool::class,
            AdminNotesRespondTool::class,

            // Each customer site's own database (Firebase / Firestore)
            AdminFirebaseCredentialsGetTool::class,
            AdminFirebaseCredentialsSetTool::class,
            AdminFirestoreCollectionsListTool::class,
            AdminFirestoreDocumentsListTool::class,
            AdminFirestoreDocumentGetTool::class,
            AdminFirestoreDocumentWriteTool::class,

            // The platform's own SQL database
            AdminDbConnectionsListTool::class,
            AdminDbTablesListTool::class,
            AdminDbRowsListTool::class,
            AdminDbRowsWriteTool::class,
            AdminDbSchemaTool::class,
            AdminDatabaseQueryTool::class,

            // Platform configuration
            AdminSettingsGetTool::class,
            AdminSettingsSetTool::class,

            // Billing / plans
            AdminPlansListTool::class,
            AdminPlansUpdateTool::class,
            AdminTransactionsListTool::class,
            AdminTransactionsReviewTool::class,
            AdminSubscriptionsListTool::class,
            AdminSubscriptionsManageTool::class,

            // AI providers + the client-facing connector module itself
            AdminAiProvidersUpsertTool::class,
            AdminConnectorModulesListTool::class,
            AdminConnectorModulesUpsertTool::class,
            AdminConnectorActivationsListTool::class,
            AdminConnectorActivationsReviewTool::class,
        ];
        foreach ($adminTools as $toolClass) {
            $registry->register('admin', $this->app->make($toolClass));
        }

        // --- Project server tools ---
        $projectTools = [
            ProjectFilesListTool::class,
            ProjectFileReadTool::class,
            ProjectFilesSearchTool::class,
            ProjectFilesEditTool::class,
            ProjectFileWriteTool::class,
            ProjectFilesDownloadTool::class,
            ProjectFileDeleteTool::class,
            ProjectFileRenameTool::class,
            ProjectDirectoryCreateTool::class,
            ProjectFirebaseGetConfigTool::class,
            ProjectFirebaseUpdateConfigTool::class,
            ProjectFirebaseTestConnectionTool::class,
            ProjectFirestoreCollectionsListTool::class,
            ProjectFirestoreDocumentsListTool::class,
            ProjectFirestoreDocumentGetTool::class,
            ProjectFirestoreDocumentWriteTool::class,
            ProjectNotesListTool::class,
            ProjectNotesRespondTool::class,
            ProjectSettingsGetTool::class,
            ProjectSettingsUpdateGeneralTool::class,
            ProjectFilesUploadTool::class,
            ProjectPreviewBuildTool::class,
            ProjectRevisionsListTool::class,
            ProjectRevisionsRestoreTool::class,
            ProjectPublishTool::class,
            ProjectUnpublishTool::class,
        ];
        foreach ($projectTools as $toolClass) {
            $registry->register('project', $this->app->make($toolClass));
        }
    }
}
