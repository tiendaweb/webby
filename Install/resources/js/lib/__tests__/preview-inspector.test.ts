/**
 * Tests for preview-inspector utility functions.
 * These functions are used to serialize elements for postMessage communication.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Since preview-inspector.ts is designed to run in an iframe context,
// we'll test the exported utility functions directly.
import {
    serializeElement,
    getXPath,
    getCssSelector,
    getTextPreview,
    shouldIgnoreElement,
    isTextEditable,
} from '../preview-inspector';

describe('preview-inspector utilities', () => {
    // Create a mock DOM environment for testing
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement('div');
        container.id = 'test-container';
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
    });

    describe('getXPath', () => {
        it('returns id-based xpath for elements with id', () => {
            const element = document.createElement('div');
            element.id = 'my-element';
            container.appendChild(element);

            const xpath = getXPath(element);
            expect(xpath).toBe('//*[@id="my-element"]');
        });

        it('returns path-based xpath for elements without id', () => {
            const parent = document.createElement('div');
            const child = document.createElement('span');
            parent.appendChild(child);
            container.appendChild(parent);

            const xpath = getXPath(child);
            expect(xpath).toMatch(/span$/);
        });

        it('includes index for sibling elements', () => {
            const parent = document.createElement('div');
            const span1 = document.createElement('span');
            const span2 = document.createElement('span');
            parent.appendChild(span1);
            parent.appendChild(span2);
            container.appendChild(parent);

            const xpath1 = getXPath(span1);
            const xpath2 = getXPath(span2);

            // First span should not have index, second should have [2]
            expect(xpath1).toMatch(/span$/);
            expect(xpath2).toMatch(/span\[2\]$/);
        });
    });

    describe('getCssSelector', () => {
        it('returns id selector for elements with id', () => {
            const element = document.createElement('div');
            element.id = 'unique-id';
            container.appendChild(element);

            const selector = getCssSelector(element);
            expect(selector).toBe('#unique-id');
        });

        it('returns class-based selector when available', () => {
            const element = document.createElement('button');
            element.className = 'btn-primary';
            container.appendChild(element);

            const selector = getCssSelector(element);
            expect(selector).toContain('button');
            expect(selector).toContain('.btn-primary');
        });

        it('ignores preview-inspector- prefixed classes', () => {
            const element = document.createElement('div');
            element.className = 'preview-inspector-highlight real-class';
            container.appendChild(element);

            const selector = getCssSelector(element);
            expect(selector).not.toContain('preview-inspector-highlight');
        });

        it('adds nth-of-type for non-unique selectors', () => {
            const parent = document.createElement('div');
            const child1 = document.createElement('p');
            const child2 = document.createElement('p');
            child1.className = 'text';
            child2.className = 'text';
            parent.appendChild(child1);
            parent.appendChild(child2);
            container.appendChild(parent);

            const selector2 = getCssSelector(child2);
            expect(selector2).toContain(':nth-of-type(2)');
        });
    });

    describe('getTextPreview', () => {
        it('returns trimmed text content', () => {
            const element = document.createElement('p');
            element.textContent = '  Hello World  ';
            container.appendChild(element);

            expect(getTextPreview(element)).toBe('Hello World');
        });

        it('truncates long text with ellipsis', () => {
            const element = document.createElement('p');
            element.textContent = 'A'.repeat(60);
            container.appendChild(element);

            const preview = getTextPreview(element);
            expect(preview.length).toBe(53); // 50 chars + '...'
            expect(preview.endsWith('...')).toBe(true);
        });

        it('returns empty string for elements with no text', () => {
            const element = document.createElement('div');
            container.appendChild(element);

            expect(getTextPreview(element)).toBe('');
        });
    });

    describe('shouldIgnoreElement', () => {
        it('returns true for script elements', () => {
            const element = document.createElement('script');
            expect(shouldIgnoreElement(element)).toBe(true);
        });

        it('returns true for style elements', () => {
            const element = document.createElement('style');
            expect(shouldIgnoreElement(element)).toBe(true);
        });

        it('returns true for elements with preview-inspector id', () => {
            const element = document.createElement('div');
            element.id = 'preview-inspector';
            expect(shouldIgnoreElement(element)).toBe(true);
        });

        it('returns true for elements with data-preview-inspector attribute', () => {
            const element = document.createElement('div');
            element.setAttribute('data-preview-inspector', 'true');
            expect(shouldIgnoreElement(element)).toBe(true);
        });

        it('returns true for children of inspector elements', () => {
            const parent = document.createElement('div');
            parent.setAttribute('data-preview-inspector', 'highlight');
            const child = document.createElement('span');
            parent.appendChild(child);
            container.appendChild(parent);

            expect(shouldIgnoreElement(child)).toBe(true);
        });

        it('returns false for regular elements', () => {
            const element = document.createElement('button');
            element.className = 'btn';
            container.appendChild(element);

            expect(shouldIgnoreElement(element)).toBe(false);
        });
    });

    describe('isTextEditable', () => {
        it.each([
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'span', 'label', 'li', 'a', 'button', 'td', 'th'
        ])('returns true for %s elements', (tag) => {
            const element = document.createElement(tag);
            expect(isTextEditable(element)).toBe(true);
        });

        it.each(['div', 'section', 'article', 'nav', 'header', 'footer'])('returns false for %s elements', (tag) => {
            const element = document.createElement(tag);
            expect(isTextEditable(element)).toBe(false);
        });
    });

    describe('serializeElement', () => {
        it('serializes element with all required properties', () => {
            const element = document.createElement('button');
            element.id = 'submit-btn';
            element.className = 'btn primary';
            element.textContent = 'Submit';
            element.title = 'Click to submit';
            container.appendChild(element);

            const serialized = serializeElement(element);

            expect(serialized).toHaveProperty('id');
            expect(serialized.tagName).toBe('button');
            expect(serialized.elementId).toBe('submit-btn');
            expect(serialized.classNames).toContain('btn');
            expect(serialized.classNames).toContain('primary');
            expect(serialized.textPreview).toBe('Submit');
            expect(serialized.cssSelector).toBe('#submit-btn');
            expect(serialized.xpath).toBe('//*[@id="submit-btn"]');
            expect(serialized.boundingRect).toHaveProperty('top');
            expect(serialized.boundingRect).toHaveProperty('left');
            expect(serialized.boundingRect).toHaveProperty('width');
            expect(serialized.boundingRect).toHaveProperty('height');
            expect(serialized.attributes).toHaveProperty('title', 'Click to submit');
        });

        it('includes href for anchor elements', () => {
            const element = document.createElement('a');
            element.href = 'https://example.com';
            element.textContent = 'Link';
            container.appendChild(element);

            const serialized = serializeElement(element);
            expect(serialized.attributes).toHaveProperty('href');
        });

        it('includes src and alt for images', () => {
            const element = document.createElement('img');
            element.src = 'image.png';
            element.alt = 'Test image';
            container.appendChild(element);

            const serialized = serializeElement(element);
            expect(serialized.attributes).toHaveProperty('src');
            expect(serialized.attributes).toHaveProperty('alt', 'Test image');
        });

        it('returns null parentTagName for body children', () => {
            // Container is a direct child of body
            const serialized = serializeElement(container);
            expect(serialized.parentTagName).toBe('body');
        });
    });
});
