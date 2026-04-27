/**
 * Preview Inspector Script
 *
 * This script is injected into preview iframes to enable:
 * - Element inspection with hover highlighting
 * - Element selection with context menu
 * - Inline text/attribute editing
 *
 * Communication with parent window via postMessage.
 */

// Type definitions (inline to avoid bundling issues)
interface InspectorElement {
    id: string;
    tagName: string;
    elementId: string | null;
    classNames: string[];
    textPreview: string;
    xpath: string;
    cssSelector: string;
    boundingRect: {
        top: number;
        left: number;
        width: number;
        height: number;
    };
    attributes: Record<string, string>;
    parentTagName: string | null;
}

interface PendingEdit {
    id: string;
    element: InspectorElement;
    field: 'text' | 'href' | 'src' | 'placeholder' | 'title' | 'alt';
    originalValue: string;
    newValue: string;
    timestamp: Date;
}

type InspectorMode = 'preview' | 'inspect' | 'edit';

// ============================================
// State
// ============================================

let mode: InspectorMode = 'preview';
let highlightOverlay: HTMLDivElement | null = null;
let tagTooltip: HTMLDivElement | null = null;
let currentHoveredElement: HTMLElement | null = null;
let editingElement: HTMLElement | null = null;
let editFloatingButtons: HTMLDivElement | null = null;
let originalTextContent: string = '';
let translations: Record<string, string> = {
    Save: 'Save',
    Cancel: 'Cancel',
};

// ============================================
// Utility Functions
// ============================================

/**
 * Generate a unique ID.
 */
function generateId(): string {
    return `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get XPath for an element.
 */
function getXPath(element: HTMLElement): string {
    if (element.id) {
        return `//*[@id="${element.id}"]`;
    }

    const parts: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
        let index = 1;
        let sibling = current.previousElementSibling;

        while (sibling) {
            if (sibling.nodeName === current.nodeName) {
                index++;
            }
            sibling = sibling.previousElementSibling;
        }

        const tagName = current.nodeName.toLowerCase();
        const part = index > 1 ? `${tagName}[${index}]` : tagName;
        parts.unshift(part);

        current = current.parentElement;
    }

    return '/' + parts.join('/');
}

/**
 * Generate a unique CSS selector for an element.
 */
function getCssSelector(element: HTMLElement): string {
    // If element has ID, use it
    if (element.id) {
        return `#${CSS.escape(element.id)}`;
    }

    const parts: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
        let selector = current.tagName.toLowerCase();

        // Add class if available (use first meaningful class)
        const classes = Array.from(current.classList).filter(c =>
            !c.startsWith('inspector-') && !c.startsWith('preview-inspector-') && c.length < 30
        );
        if (classes.length > 0) {
            selector += `.${CSS.escape(classes[0])}`;
        }

        // Check if selector is unique among siblings
        const siblings = current.parentElement?.querySelectorAll(`:scope > ${selector}`);
        if (siblings && siblings.length > 1) {
            const index = Array.from(siblings).indexOf(current) + 1;
            selector += `:nth-of-type(${index})`;
        }

        parts.unshift(selector);

        // Check if current path is unique in document
        const fullSelector = parts.join(' > ');
        if (document.querySelectorAll(fullSelector).length === 1) {
            return fullSelector;
        }

        current = current.parentElement;
    }

    return parts.join(' > ');
}

/**
 * Get text preview from element (truncated).
 */
function getTextPreview(element: HTMLElement): string {
    const text = element.textContent?.trim() || '';
    return text.length > 50 ? text.substring(0, 50) + '...' : text;
}

/**
 * Get editable attributes for an element.
 */
function getEditableAttributes(element: HTMLElement): Record<string, string> {
    const attrs: Record<string, string> = {};
    const tagName = element.tagName.toLowerCase();

    const attrMap: Record<string, string[]> = {
        a: ['href', 'title'],
        img: ['src', 'alt', 'title'],
        input: ['placeholder', 'title'],
        textarea: ['placeholder', 'title'],
        button: ['title'],
    };

    const editableAttrs = attrMap[tagName] || [];
    for (const attr of editableAttrs) {
        const value = element.getAttribute(attr);
        if (value !== null) {
            attrs[attr] = value;
        }
    }

    return attrs;
}

/**
 * Serialize an element for postMessage.
 */
function serializeElement(element: HTMLElement): InspectorElement {
    const rect = element.getBoundingClientRect();

    return {
        id: generateId(),
        tagName: element.tagName.toLowerCase(),
        elementId: element.id || null,
        classNames: Array.from(element.classList),
        textPreview: getTextPreview(element),
        xpath: getXPath(element),
        cssSelector: getCssSelector(element),
        boundingRect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
        },
        attributes: getEditableAttributes(element),
        parentTagName: element.parentElement?.tagName.toLowerCase() || null,
    };
}

/**
 * Check if element should be ignored.
 */
function shouldIgnoreElement(element: HTMLElement): boolean {
    const ignoredTags = ['script', 'style', 'link', 'meta', 'head', 'html'];
    const tagName = element.tagName.toLowerCase();

    if (ignoredTags.includes(tagName)) return true;
    if (element.id === 'preview-inspector') return true;
    if (element.hasAttribute('data-preview-inspector')) return true;
    if (element.closest('[data-preview-inspector]')) return true;

    return false;
}

/**
 * Check if element has editable text.
 */
function isTextEditable(element: HTMLElement): boolean {
    const editableTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'label', 'li', 'a', 'button', 'td', 'th'];
    return editableTags.includes(element.tagName.toLowerCase());
}

// ============================================
// UI Elements
// ============================================

/**
 * Create highlight overlay element.
 */
function createHighlightOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.setAttribute('data-preview-inspector', 'highlight');
    overlay.style.cssText = `
        position: fixed;
        pointer-events: none;
        border: 2px solid #3b82f6;
        background: rgba(59, 130, 246, 0.1);
        z-index: 999999;
        transition: all 0.1s ease;
        display: none;
    `;
    document.body.appendChild(overlay);
    return overlay;
}

/**
 * Create tag tooltip element.
 */
function createTagTooltip(): HTMLDivElement {
    const tooltip = document.createElement('div');
    tooltip.setAttribute('data-preview-inspector', 'tooltip');
    tooltip.style.cssText = `
        position: fixed;
        background: #1e293b;
        color: #f8fafc;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-family: ui-monospace, monospace;
        z-index: 1000000;
        pointer-events: none;
        display: none;
        white-space: nowrap;
    `;
    document.body.appendChild(tooltip);
    return tooltip;
}

/**
 * Create floating edit buttons.
 */
function createEditFloatingButtons(): HTMLDivElement {
    const container = document.createElement('div');
    container.setAttribute('data-preview-inspector', 'edit-buttons');
    container.style.cssText = `
        position: fixed;
        display: none;
        gap: 4px;
        z-index: 1000001;
        font-family: system-ui, sans-serif;
    `;

    const saveBtn = document.createElement('button');
    saveBtn.textContent = translations.Save;
    saveBtn.style.cssText = `
        padding: 4px 12px;
        background: #22c55e;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
    `;
    saveBtn.onclick = handleSaveEdit;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = translations.Cancel;
    cancelBtn.style.cssText = `
        padding: 4px 12px;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
    `;
    cancelBtn.onclick = handleCancelEdit;

    container.appendChild(saveBtn);
    container.appendChild(cancelBtn);
    document.body.appendChild(container);

    return container;
}

/**
 * Update highlight position.
 */
function updateHighlight(element: HTMLElement | null): void {
    if (!highlightOverlay || !tagTooltip) return;

    if (!element || mode === 'preview') {
        highlightOverlay.style.display = 'none';
        tagTooltip.style.display = 'none';
        return;
    }

    const rect = element.getBoundingClientRect();

    highlightOverlay.style.display = 'block';
    highlightOverlay.style.top = `${rect.top}px`;
    highlightOverlay.style.left = `${rect.left}px`;
    highlightOverlay.style.width = `${rect.width}px`;
    highlightOverlay.style.height = `${rect.height}px`;

    // Update colors based on mode
    if (mode === 'edit' && editingElement === element) {
        highlightOverlay.style.borderColor = '#22c55e';
        highlightOverlay.style.background = 'rgba(34, 197, 94, 0.1)';
    } else if (mode === 'edit') {
        highlightOverlay.style.borderColor = '#22c55e';
        highlightOverlay.style.borderStyle = 'dashed';
        highlightOverlay.style.background = 'transparent';
    } else {
        highlightOverlay.style.borderColor = '#3b82f6';
        highlightOverlay.style.borderStyle = 'solid';
        highlightOverlay.style.background = 'rgba(59, 130, 246, 0.1)';
    }

    // Position tooltip
    const tagName = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const className = element.classList.length > 0 ? `.${element.classList[0]}` : '';
    tagTooltip.textContent = `<${tagName}${id}${className}>`;
    tagTooltip.style.display = 'block';
    tagTooltip.style.top = `${Math.max(0, rect.top - 24)}px`;
    tagTooltip.style.left = `${rect.left}px`;
}

/**
 * Position floating buttons near element.
 */
function positionEditButtons(element: HTMLElement): void {
    if (!editFloatingButtons) return;

    const rect = element.getBoundingClientRect();
    editFloatingButtons.style.display = 'flex';
    editFloatingButtons.style.top = `${rect.bottom + 4}px`;
    editFloatingButtons.style.left = `${rect.left}px`;
}

/**
 * Hide floating buttons.
 */
function hideEditButtons(): void {
    if (editFloatingButtons) {
        editFloatingButtons.style.display = 'none';
    }
}

/**
 * Update button text with current translations.
 */
function updateButtonTranslations(): void {
    if (!editFloatingButtons) return;
    const buttons = editFloatingButtons.querySelectorAll('button');
    if (buttons.length >= 2) {
        buttons[0].textContent = translations.Save;
        buttons[1].textContent = translations.Cancel;
    }
}

// ============================================
// Event Handlers
// ============================================

/**
 * Handle mouse movement for hover highlighting.
 */
function handleMouseMove(e: MouseEvent): void {
    if (mode === 'preview') return;

    const target = e.target as HTMLElement;
    if (shouldIgnoreElement(target)) {
        updateHighlight(null);
        return;
    }

    if (target !== currentHoveredElement) {
        currentHoveredElement = target;
        updateHighlight(target);

        // Send hover event to parent
        const message = {
            type: 'inspector-element-hover',
            element: serializeElement(target),
        };
        window.parent.postMessage(message, '*');
    }
}

/**
 * Handle mouse leave.
 */
function handleMouseLeave(): void {
    currentHoveredElement = null;
    updateHighlight(null);

    const message = {
        type: 'inspector-element-hover',
        element: null,
    };
    window.parent.postMessage(message, '*');
}

/**
 * Handle click for element selection.
 */
function handleClick(e: MouseEvent): void {
    if (mode === 'preview') return;

    const target = e.target as HTMLElement;
    if (shouldIgnoreElement(target)) return;

    // In inspect mode, send click event for context menu
    if (mode === 'inspect') {
        e.preventDefault();
        e.stopPropagation();

        const message = {
            type: 'inspector-element-click',
            element: serializeElement(target),
            position: { x: e.clientX, y: e.clientY },
        };
        window.parent.postMessage(message, '*');
    }
}

/**
 * Handle double-click for inline editing.
 */
function handleDoubleClick(e: MouseEvent): void {
    if (mode !== 'edit') return;

    const target = e.target as HTMLElement;
    if (shouldIgnoreElement(target)) return;
    if (!isTextEditable(target)) return;

    e.preventDefault();
    e.stopPropagation();

    startEditing(target);
}

/**
 * Start inline editing.
 */
function startEditing(element: HTMLElement): void {
    if (editingElement) {
        handleCancelEdit();
    }

    editingElement = element;
    originalTextContent = element.textContent || '';

    element.setAttribute('contenteditable', 'true');
    element.style.outline = '2px solid #22c55e';
    element.style.outlineOffset = '2px';
    element.focus();

    // Select all text
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    positionEditButtons(element);
}

/**
 * Handle save edit.
 */
function handleSaveEdit(): void {
    if (!editingElement) return;

    const newValue = editingElement.textContent || '';
    const elementData = serializeElement(editingElement);

    const edit: PendingEdit = {
        id: generateId(),
        element: elementData,
        field: 'text',
        originalValue: originalTextContent,
        newValue: newValue,
        timestamp: new Date(),
    };

    // Send edit to parent
    const message = {
        type: 'inspector-element-edited',
        edit: edit,
    };
    window.parent.postMessage(message, '*');

    finishEditing();
}

/**
 * Handle cancel edit.
 */
function handleCancelEdit(): void {
    if (!editingElement) return;

    editingElement.textContent = originalTextContent;

    const message = {
        type: 'inspector-edit-cancelled',
        elementId: editingElement.id || getCssSelector(editingElement),
    };
    window.parent.postMessage(message, '*');

    finishEditing();
}

/**
 * Clean up after editing.
 */
function finishEditing(): void {
    if (editingElement) {
        editingElement.removeAttribute('contenteditable');
        editingElement.style.outline = '';
        editingElement.style.outlineOffset = '';
    }

    editingElement = null;
    originalTextContent = '';
    hideEditButtons();
}

/**
 * Handle keydown during editing.
 */
function handleKeyDown(e: KeyboardEvent): void {
    if (!editingElement) return;

    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSaveEdit();
    } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelEdit();
    }
}

/**
 * Handle messages from parent window.
 */
function handleMessage(e: MessageEvent): void {
    const data = e.data;
    if (!data || !data.type || !data.type.startsWith('inspector-')) return;

    switch (data.type) {
        case 'inspector-set-mode':
            setMode(data.mode);
            break;
        case 'inspector-highlight-element':
            highlightBySelector(data.selector);
            break;
        case 'inspector-clear-highlights':
            updateHighlight(null);
            break;
        case 'inspector-edit-element':
            // Start editing a specific element by selector
            if (data.selector) {
                const element = document.querySelector(data.selector) as HTMLElement;
                if (element) {
                    setMode('edit');
                    startEditing(element);
                }
            }
            break;
        case 'inspector-revert-edits':
            // Revert edited elements to their original values
            if (data.edits && Array.isArray(data.edits)) {
                revertEdits(data.edits);
            }
            break;
        case 'inspector-set-translations':
            // Set translations for UI labels
            if (data.translations && typeof data.translations === 'object') {
                translations = { ...translations, ...data.translations };
                // Update existing button text if buttons exist
                updateButtonTranslations();
            }
            break;
    }
}

/**
 * Set inspector mode.
 */
function setMode(newMode: InspectorMode): void {
    mode = newMode;

    if (mode === 'preview') {
        updateHighlight(null);
        hideEditButtons();
        if (editingElement) {
            handleCancelEdit();
        }
    }
}

/**
 * Highlight element by selector.
 */
function highlightBySelector(selector: string): void {
    try {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
            updateHighlight(element);
        }
    } catch {
        console.warn('Invalid selector:', selector);
    }
}

/**
 * Revert edited elements to their original values.
 */
function revertEdits(edits: Array<{ selector: string; field: string; originalValue: string }>): void {
    for (const edit of edits) {
        try {
            const element = document.querySelector(edit.selector) as HTMLElement;
            if (!element) continue;

            if (edit.field === 'text') {
                element.textContent = edit.originalValue;
            } else {
                // For attributes like href, src, alt, placeholder, title
                element.setAttribute(edit.field, edit.originalValue);
            }
        } catch {
            console.warn('Failed to revert edit for selector:', edit.selector);
        }
    }
}

// ============================================
// Initialization
// ============================================

/**
 * Initialize the inspector.
 */
function init(): void {
    // Create UI elements
    highlightOverlay = createHighlightOverlay();
    tagTooltip = createTagTooltip();
    editFloatingButtons = createEditFloatingButtons();

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('dblclick', handleDoubleClick, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('message', handleMessage);

    // Notify parent that inspector is ready
    window.parent.postMessage({ type: 'inspector-ready' }, '*');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for testing (will be stripped in production build)
export {
    serializeElement,
    getXPath,
    getCssSelector,
    getTextPreview,
    shouldIgnoreElement,
    isTextEditable,
};
