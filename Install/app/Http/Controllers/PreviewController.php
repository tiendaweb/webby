<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\ProjectWorkspaceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Process\Process;

class PreviewController extends Controller
{
    public function __construct(
        protected ProjectWorkspaceService $workspaceService
    ) {}

    /**
     * Serve preview files for a project.
     */
    public function serve(Request $request, Project $project, string $path = 'index.html'): Response
    {
        // Check authorization
        $this->authorize('view', $project);

        // Clean and validate the path
        $path = ltrim($path, '/');
        if (empty($path)) {
            $path = 'index.html';
        }

        // Prevent directory traversal
        if (str_contains($path, '..')) {
            abort(403, 'Invalid path');
        }

        if ($project->type === 'blank') {
            $phpResponse = $this->servePhpIfNeeded($request, $project, $path, true);
            if ($phpResponse) {
                return $phpResponse;
            }

            $this->regeneratePreviewIfMissing($project);
        }

        $previewPath = "previews/{$project->id}/{$path}";

        // Check if the file exists
        if (! Storage::disk('local')->exists($previewPath)) {
            // Try index.html for directory requests
            if (! str_contains($path, '.')) {
                $indexPath = "previews/{$project->id}/{$path}/index.html";
                if (Storage::disk('local')->exists($indexPath)) {
                    $previewPath = $indexPath;
                } else {
                    // SPA fallback: serve root index.html for client-side routing
                    // This allows React Router to handle routes like /login, /signup, etc.
                    $spaFallbackPath = "previews/{$project->id}/index.html";
                    if (Storage::disk('local')->exists($spaFallbackPath)) {
                        $previewPath = $spaFallbackPath;
                    } else {
                        abort(404, 'Preview file not found');
                    }
                }
            } else {
                abort(404, 'Preview file not found');
            }
        }

        $fullPath = Storage::disk('local')->path($previewPath);
        $mimeType = $this->getMimeType($path);

        // For HTML files, inject inspector script on-the-fly
        if (str_ends_with($path, '.html') || str_ends_with($path, '.htm')) {
            $html = file_get_contents($fullPath);
            $html = $this->injectInspectorScript($html);

            return response($html, 200, [
                'Content-Type' => $mimeType,
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0',
            ]);
        }

        return response()->file($fullPath, [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }

    /**
     * Self-heal blank projects whose preview directory was never generated
     * (e.g. legacy projects created before previews were synced on creation).
     */
    protected function regeneratePreviewIfMissing(Project $project): void
    {
        $previewPath = "previews/{$project->id}";

        if (Storage::disk('local')->exists($previewPath)) {
            return;
        }

        if (! Storage::disk('local')->exists($this->workspaceService->root($project))) {
            return;
        }

        try {
            $this->workspaceService->syncPreview($project);
        } catch (\Throwable) {
            // Serving will fall through to a 404 when the build cannot run.
        }
    }

    protected function servePhpIfNeeded(Request $request, Project $project, string $path, bool $withInspector): ?Response
    {
        $root = $this->workspaceService->root($project);
        $entry = $path === '' || $path === 'index.html' ? 'index.php' : $path;

        try {
            $entry = $this->workspaceService->normalizePath($entry);
        } catch (\Throwable) {
            abort(403, 'Invalid path');
        }

        if (! str_ends_with(strtolower($entry), '.php')) {
            if (($path === '' || $path === 'index.html' || ! str_contains($path, '.')) && Storage::disk('local')->exists("{$root}/index.php")) {
                $entry = 'index.php';
            } else {
                return null;
            }
        }

        $storagePath = "{$root}/{$entry}";
        if (! Storage::disk('local')->exists($storagePath)) {
            return null;
        }

        if (! $project->user?->getCurrentPlan()?->phpRuntimeEnabled()) {
            abort(403, 'PHP runtime is not enabled for this project plan.');
        }

        $scriptPath = Storage::disk('local')->path($storagePath);
        $projectRoot = $this->workspaceService->rootPath($project);

        if (! str_starts_with(realpath($scriptPath) ?: '', realpath($projectRoot) ?: '')) {
            abort(403, 'Invalid script path');
        }

        $bootstrapPath = $this->createPhpRequestBootstrap();
        $process = new Process(['php', '-d', 'auto_prepend_file='.$bootstrapPath, $scriptPath], $projectRoot, [
            'DOCUMENT_ROOT' => $projectRoot,
            'SCRIPT_FILENAME' => $scriptPath,
            'SCRIPT_NAME' => '/'.$entry,
            'PHP_SELF' => '/'.$entry,
            'REQUEST_URI' => $request->getRequestUri(),
            'REQUEST_METHOD' => $request->method(),
            'QUERY_STRING' => $request->getQueryString() ?? '',
            'CONTENT_TYPE' => $request->headers->get('content-type', ''),
            'CONTENT_LENGTH' => (string) strlen($request->getContent()),
            'HTTP_COOKIE' => $request->headers->get('cookie', ''),
            'HTTP_HOST' => $request->getHost(),
            'HTTPS' => $request->isSecure() ? 'on' : 'off',
        ]);
        $process->setInput($request->getContent());
        $process->setTimeout(5);
        $process->run();
        @unlink($bootstrapPath);

        if (! $process->isSuccessful()) {
            return response($process->getErrorOutput() ?: 'PHP preview failed', 500, [
                'Content-Type' => 'text/plain; charset=UTF-8',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
            ]);
        }

        $output = $process->getOutput();
        if ($withInspector && str_contains(strtolower($output), '</body>')) {
            $output = $this->injectInspectorScript($output);
        }

        return response($output, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }

    private function createPhpRequestBootstrap(): string
    {
        $path = tempnam(sys_get_temp_dir(), 'webby_php_request_');
        $server = [
            'DOCUMENT_ROOT', 'SCRIPT_FILENAME', 'SCRIPT_NAME', 'PHP_SELF', 'REQUEST_URI',
            'REQUEST_METHOD', 'QUERY_STRING', 'CONTENT_TYPE', 'CONTENT_LENGTH',
            'HTTP_COOKIE', 'HTTP_HOST', 'HTTPS',
        ];

        $code = "<?php\n";
        $code .= 'foreach ('.var_export($server, true).' as $key) { $value = getenv($key); if ($value !== false) { $_SERVER[$key] = $value; } }'."\n";
        $code .= 'parse_str($_SERVER["QUERY_STRING"] ?? "", $_GET);'."\n";
        $code .= 'if (!empty($_SERVER["HTTP_COOKIE"])) { foreach (explode(";", $_SERVER["HTTP_COOKIE"]) as $cookie) { $parts = explode("=", trim($cookie), 2); if (count($parts) === 2) { $_COOKIE[$parts[0]] = urldecode($parts[1]); } } }'."\n";
        $code .= '$body = stream_get_contents(STDIN); $contentType = $_SERVER["CONTENT_TYPE"] ?? ""; if (stripos($contentType, "application/x-www-form-urlencoded") !== false) { parse_str($body, $_POST); } $_REQUEST = array_merge($_GET, $_POST, $_COOKIE);'."\n";
        file_put_contents($path, $code);

        return $path;
    }

    /**
     * Get MIME type based on file extension.
     */
    protected function getMimeType(string $path): string
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        $mimeTypes = [
            'html' => 'text/html',
            'htm' => 'text/html',
            'css' => 'text/css',
            'js' => 'application/javascript',
            'mjs' => 'application/javascript',
            'json' => 'application/json',
            'map' => 'application/json',
            'webmanifest' => 'application/manifest+json',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'svg' => 'image/svg+xml',
            'ico' => 'image/x-icon',
            'webp' => 'image/webp',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf',
            'eot' => 'application/vnd.ms-fontobject',
            'otf' => 'font/otf',
            'txt' => 'text/plain',
            'xml' => 'application/xml',
            'pdf' => 'application/pdf',
            'wasm' => 'application/wasm',
        ];

        return $mimeTypes[$extension] ?? 'application/octet-stream';
    }

    /**
     * Inject the inspector script into HTML content.
     */
    protected function injectInspectorScript(string $html): string
    {
        $script = $this->getInspectorScript();

        return str_replace('</body>', "<script id=\"preview-inspector\">{$script}</script>\n</body>", $html);
    }

    /**
     * Get the preview inspector script for element selection, inline editing, and theme sync.
     */
    protected function getInspectorScript(): string
    {
        return <<<'JS'
(function(){
'use strict';
var mode='preview',highlightOverlay=null,tagTooltip=null,currentHoveredElement=null,editingElement=null,editFloatingButtons=null,originalTextContent='',translations={Save:'Save',Cancel:'Cancel'};
function generateId(){return'el-'+Date.now()+'-'+Math.random().toString(36).substr(2,9)}
function getXPath(element){if(element.id)return'//*[@id="'+element.id+'"]';var parts=[],current=element;while(current&&current.nodeType===Node.ELEMENT_NODE){var index=1,sibling=current.previousElementSibling;while(sibling){if(sibling.nodeName===current.nodeName)index++;sibling=sibling.previousElementSibling}var tagName=current.nodeName.toLowerCase(),part=index>1?tagName+'['+index+']':tagName;parts.unshift(part);current=current.parentElement}return'/'+parts.join('/')}
function getCssSelector(element){if(element.id)return'#'+CSS.escape(element.id);var parts=[],current=element;while(current&&current.nodeType===Node.ELEMENT_NODE&&current!==document.body){var selector=current.tagName.toLowerCase(),classes=Array.from(current.classList).filter(function(c){return!c.startsWith('preview-inspector-')&&c.length<30});if(classes.length>0)selector+='.'+CSS.escape(classes[0]);var siblings=current.parentElement?current.parentElement.querySelectorAll(':scope > '+selector):null;if(siblings&&siblings.length>1){var index=Array.from(siblings).indexOf(current)+1;selector+=':nth-of-type('+index+')'}parts.unshift(selector);var fullSelector=parts.join(' > ');if(document.querySelectorAll(fullSelector).length===1)return fullSelector;current=current.parentElement}return parts.join(' > ')}
function getTextPreview(element){var text=(element.textContent||'').trim();return text.length>50?text.substring(0,50)+'...':text}
function getEditableAttributes(element){var attrs={},tagName=element.tagName.toLowerCase(),attrMap={a:['href','title'],img:['src','alt','title'],input:['placeholder','title'],textarea:['placeholder','title'],button:['title']},editableAttrs=attrMap[tagName]||[];for(var i=0;i<editableAttrs.length;i++){var attr=editableAttrs[i],value=element.getAttribute(attr);if(value!==null)attrs[attr]=value}return attrs}
function getContainedImages(element){var images=element.tagName.toLowerCase()==='img'?[element]:Array.from(element.querySelectorAll('img'));return images.map(function(image,index){var selector=getCssSelector(image);return{id:selector+'-'+index,cssSelector:selector,src:image.getAttribute('src')||'',currentSrc:image.currentSrc||image.src||'',alt:image.getAttribute('alt')||'',title:image.getAttribute('title')||''}}).filter(function(image){return image.src!==''||image.currentSrc!==''}).slice(0,20)}
function getSourceRef(element){var node=element.closest?element.closest('[data-webby-source]'):null;if(!node)return null;var val=node.getAttribute('data-webby-source')||'';var idx=val.lastIndexOf(':');if(idx<1)return{path:val,line:null,exact:node===element};return{path:val.substring(0,idx),line:parseInt(val.substring(idx+1),10)||null,exact:node===element}}
function getPreviewPath(){var match=window.location.pathname.match(/^\/(?:preview|app)\/[0-9a-f-]+\/(.*)$/i);if(!match)return null;return match[1]||'index.html'}
function serializeElement(element){var rect=element.getBoundingClientRect();var ref=getSourceRef(element);return{id:generateId(),tagName:element.tagName.toLowerCase(),elementId:element.id||null,classNames:Array.from(element.classList),textPreview:getTextPreview(element),xpath:getXPath(element),cssSelector:getCssSelector(element),boundingRect:{top:rect.top,left:rect.left,width:rect.width,height:rect.height},attributes:getEditableAttributes(element),parentTagName:element.parentElement?element.parentElement.tagName.toLowerCase():null,images:getContainedImages(element),sourcePath:ref?ref.path:null,sourceLine:ref?ref.line:null,sourceExact:ref?ref.exact:false,previewPath:getPreviewPath()}}
function shouldIgnoreElement(element){var ignoredTags=['script','style','link','meta','head','html'],tagName=element.tagName.toLowerCase();if(ignoredTags.indexOf(tagName)!==-1)return true;if(element.id==='preview-inspector')return true;if(element.hasAttribute('data-preview-inspector'))return true;if(element.closest('[data-preview-inspector]'))return true;return false}
function isTextEditable(element){var editableTags=['div','section','h1','h2','h3','h4','h5','h6','p','span','label','li','a','button','td','th'];return editableTags.indexOf(element.tagName.toLowerCase())!==-1}
function createHighlightOverlay(){var overlay=document.createElement('div');overlay.setAttribute('data-preview-inspector','highlight');overlay.style.cssText='position:fixed;pointer-events:none;border:2px solid hsl(221.2 83.2% 53.3%);background:hsla(221.2,83.2%,53.3%,0.1);z-index:999999;transition:all 0.1s ease;display:none;border-radius:4px;';document.body.appendChild(overlay);return overlay}
function createTagTooltip(){var tooltip=document.createElement('div');tooltip.setAttribute('data-preview-inspector','tooltip');tooltip.style.cssText='position:fixed;background:hsl(240 5.9% 10%);color:hsl(0 0% 98%);padding:4px 10px;border-radius:6px;font-size:11px;font-family:ui-monospace,SFMono-Regular,monospace;z-index:1000000;pointer-events:none;display:none;white-space:nowrap;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);';document.body.appendChild(tooltip);return tooltip}
function createEditFloatingButtons(){var container=document.createElement('div');container.setAttribute('data-preview-inspector','edit-buttons');container.style.cssText='position:fixed;display:none;gap:6px;z-index:1000001;font-family:system-ui,-apple-system,sans-serif;background:hsl(0 0% 100%);border:1px solid hsl(240 5.9% 90%);border-radius:8px;padding:6px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1);';var saveBtn=document.createElement('button');saveBtn.textContent=translations.Save;saveBtn.style.cssText='padding:6px 12px;background:hsl(240 5.9% 10%);color:hsl(0 0% 98%);border:none;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;transition:opacity 0.15s;';saveBtn.onmouseenter=function(){this.style.opacity='0.9'};saveBtn.onmouseleave=function(){this.style.opacity='1'};saveBtn.onclick=handleSaveEdit;var cancelBtn=document.createElement('button');cancelBtn.textContent=translations.Cancel;cancelBtn.style.cssText='padding:6px 12px;background:transparent;color:hsl(240 5.9% 10%);border:1px solid hsl(240 5.9% 90%);border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;transition:background 0.15s;';cancelBtn.onmouseenter=function(){this.style.background='hsl(240 5.9% 96%)'};cancelBtn.onmouseleave=function(){this.style.background='transparent'};cancelBtn.onclick=handleCancelEdit;container.appendChild(saveBtn);container.appendChild(cancelBtn);document.body.appendChild(container);return container}
function updateHighlight(element){if(!highlightOverlay||!tagTooltip)return;if(!element||mode==='preview'){highlightOverlay.style.display='none';tagTooltip.style.display='none';return}var rect=element.getBoundingClientRect();highlightOverlay.style.display='block';highlightOverlay.style.top=rect.top+'px';highlightOverlay.style.left=rect.left+'px';highlightOverlay.style.width=rect.width+'px';highlightOverlay.style.height=rect.height+'px';if(mode==='edit'&&editingElement===element){highlightOverlay.style.borderColor='#22c55e';highlightOverlay.style.background='rgba(34,197,94,0.1)'}else if(mode==='edit'){highlightOverlay.style.borderColor='#22c55e';highlightOverlay.style.borderStyle='dashed';highlightOverlay.style.background='transparent'}else{highlightOverlay.style.borderColor='#3b82f6';highlightOverlay.style.borderStyle='solid';highlightOverlay.style.background='rgba(59,130,246,0.1)'}var tagName=element.tagName.toLowerCase(),id=element.id?'#'+element.id:'',className=element.classList.length>0?'.'+element.classList[0]:'';tagTooltip.textContent='<'+tagName+id+className+'>';tagTooltip.style.display='block';tagTooltip.style.top=Math.max(0,rect.top-24)+'px';tagTooltip.style.left=rect.left+'px'}
function positionEditButtons(element){if(!editFloatingButtons)return;var rect=element.getBoundingClientRect();editFloatingButtons.style.display='flex';editFloatingButtons.style.top=(rect.bottom+4)+'px';editFloatingButtons.style.left=rect.left+'px'}
function hideEditButtons(){if(editFloatingButtons)editFloatingButtons.style.display='none'}
function updateButtonTranslations(){if(!editFloatingButtons)return;var buttons=editFloatingButtons.querySelectorAll('button');if(buttons.length>=2){buttons[0].textContent=translations.Save;buttons[1].textContent=translations.Cancel}}
function handleMouseMove(e){if(mode==='preview')return;var target=e.target;if(shouldIgnoreElement(target)){updateHighlight(null);return}if(target!==currentHoveredElement){currentHoveredElement=target;updateHighlight(target);window.parent.postMessage({type:'inspector-element-hover',element:serializeElement(target)},'*')}}
function handleMouseLeave(){currentHoveredElement=null;updateHighlight(null);window.parent.postMessage({type:'inspector-element-hover',element:null},'*')}
function handleClick(e){if(mode==='preview')return;var target=e.target;if(shouldIgnoreElement(target))return;if(mode==='inspect'){e.preventDefault();e.stopPropagation();window.parent.postMessage({type:'inspector-element-click',element:serializeElement(target),position:{x:e.clientX,y:e.clientY}},'*')}}
function handleDoubleClick(e){if(mode!=='edit')return;var target=e.target;if(shouldIgnoreElement(target))return;if(!isTextEditable(target))return;e.preventDefault();e.stopPropagation();startEditing(target)}
function startEditing(element){if(editingElement)handleCancelEdit();editingElement=element;originalTextContent=element.textContent||'';element.setAttribute('contenteditable','true');element.style.outline='2px solid #22c55e';element.style.outlineOffset='2px';element.focus();var range=document.createRange();range.selectNodeContents(element);var selection=window.getSelection();if(selection){selection.removeAllRanges();selection.addRange(range)}positionEditButtons(element)}
function handleSaveEdit(){if(!editingElement)return;var newValue=editingElement.textContent||'',elementData=serializeElement(editingElement),edit={id:generateId(),element:elementData,field:'text',originalValue:originalTextContent,newValue:newValue,timestamp:new Date()};window.parent.postMessage({type:'inspector-element-edited',edit:edit},'*');finishEditing()}
function handleCancelEdit(){if(!editingElement)return;editingElement.textContent=originalTextContent;window.parent.postMessage({type:'inspector-edit-cancelled',elementId:editingElement.id||getCssSelector(editingElement)},'*');finishEditing()}
function finishEditing(){if(editingElement){editingElement.removeAttribute('contenteditable');editingElement.style.outline='';editingElement.style.outlineOffset=''}editingElement=null;originalTextContent='';hideEditButtons()}
function handleKeyDown(e){if(!editingElement)return;if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSaveEdit()}else if(e.key==='Escape'){e.preventDefault();handleCancelEdit()}}
function handleMessage(e){var data=e.data;if(!data||!data.type||data.type.indexOf('inspector-')!==0)return;if(data.type==='inspector-set-mode')setMode(data.mode);else if(data.type==='inspector-highlight-element')highlightBySelector(data.selector);else if(data.type==='inspector-clear-highlights')updateHighlight(null);else if(data.type==='inspector-edit-element'){var el=document.querySelector(data.selector);if(el){setMode('edit');startEditing(el)}}else if(data.type==='inspector-revert-edits'&&data.edits&&Array.isArray(data.edits)){revertEdits(data.edits)}else if(data.type==='inspector-set-theme'){if(data.theme==='dark'){document.documentElement.classList.add('dark');if(window.__THEME_DARK__)applyThemeVars(window.__THEME_DARK__)}else{document.documentElement.classList.remove('dark');if(window.__THEME_LIGHT__)applyThemeVars(window.__THEME_LIGHT__)}}else if(data.type==='inspector-apply-theme'){window.__THEME_LIGHT__=data.light;window.__THEME_DARK__=data.dark;var isDark=document.documentElement.classList.contains('dark');applyThemeVars(isDark?data.dark:data.light)}else if(data.type==='inspector-set-translations'&&data.translations){translations=Object.assign({},translations,data.translations);updateButtonTranslations()}}
function setMode(newMode){mode=newMode;if(mode==='preview'){updateHighlight(null);hideEditButtons();if(editingElement)handleCancelEdit()}}
function highlightBySelector(selector){try{var element=document.querySelector(selector);if(element)updateHighlight(element)}catch(e){console.warn('Invalid selector:',selector)}}
function revertEdits(edits){for(var i=0;i<edits.length;i++){try{var edit=edits[i],el=document.querySelector(edit.selector);if(!el)continue;if(edit.field==='text')el.textContent=edit.originalValue;else el.setAttribute(edit.field,edit.originalValue)}catch(e){console.warn('Failed to revert edit for selector:',edit.selector)}}}
function applyThemeVars(vars){var root=document.documentElement;for(var key in vars){if(vars.hasOwnProperty(key))root.style.setProperty('--'+key,vars[key])}}
function init(){highlightOverlay=createHighlightOverlay();tagTooltip=createTagTooltip();editFloatingButtons=createEditFloatingButtons();document.addEventListener('mousemove',handleMouseMove,{passive:true});document.addEventListener('mouseleave',handleMouseLeave);document.addEventListener('click',handleClick,true);document.addEventListener('dblclick',handleDoubleClick,true);document.addEventListener('keydown',handleKeyDown);window.addEventListener('message',handleMessage);window.parent.postMessage({type:'inspector-ready'},'*')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
JS;
    }

    /**
     * Check if preview exists for a project.
     */
    public function exists(Request $request, Project $project): Response
    {
        $this->authorize('view', $project);

        $previewPath = "previews/{$project->id}";
        $exists = Storage::disk('local')->exists($previewPath);

        return response()->json([
            'exists' => $exists,
            'url' => $exists ? url("/preview/{$project->id}/") : null,
        ]);
    }
}
