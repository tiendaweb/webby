import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    $getSelection,
    $isRangeSelection,
    $isTextNode,
    $createTextNode,
    KEY_DOWN_COMMAND,
    COMMAND_PRIORITY_HIGH,
} from 'lexical';
import { $createFileMentionNode } from '../nodes/FileMentionNode';
import { FileMentionDropdown } from '../FileMentionDropdown';
import type { AttachedFile } from '@/types/chat';

const MAX_RESULTS = 6;

interface FileMentionPluginProps {
    files: AttachedFile[];
    disabled?: boolean;
}

export function FileMentionPlugin({ files, disabled }: FileMentionPluginProps) {
    const [editor] = useLexicalComposerContext();
    const [queryString, setQueryString] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [anchorPosition, setAnchorPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    // Filter files by query
    const filteredFiles = useMemo(() => {
        if (queryString === null) return [];
        if (queryString === '') return files.slice(0, MAX_RESULTS);
        const lower = queryString.toLowerCase();
        return files.filter(f => f.filename.toLowerCase().includes(lower)).slice(0, MAX_RESULTS);
    }, [queryString, files]);

    // Clamp selection index when results change
    const clampedSelectedIndex = useMemo(
        () => (filteredFiles.length > 0 ? Math.min(selectedIndex, filteredFiles.length - 1) : 0),
        [selectedIndex, filteredFiles.length],
    );

    // Listen for text changes to detect @ trigger
    useEffect(() => {
        if (disabled) return;
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const selection = $getSelection();
                if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
                    setQueryString(null);
                    return;
                }

                const anchor = selection.anchor;
                const node = anchor.getNode();
                const textContent = node.getTextContent();
                const offset = anchor.offset;

                // Get text up to cursor
                const textBeforeCursor = textContent.slice(0, offset);

                // Find the last @ that's preceded by whitespace or is at start
                const atMatch = textBeforeCursor.match(/(^|[\s])@([^\s]*)$/);
                if (atMatch) {
                    const query = atMatch[2]; // text after @
                    setQueryString(query);

                    // Calculate position from DOM selection
                    const domSelection = window.getSelection();
                    if (domSelection && domSelection.rangeCount > 0) {
                        const range = domSelection.getRangeAt(0);
                        const rect = range.getBoundingClientRect();
                        setAnchorPosition({
                            top: rect.bottom + 4,
                            left: rect.left,
                        });
                    }
                } else {
                    setQueryString(null);
                }
            });
        });
    }, [editor, disabled]);

    // Insert a file mention node replacing the @query text
    const insertMention = useCallback((file: AttachedFile) => {
        editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;

            const anchor = selection.anchor;
            const node = anchor.getNode();

            if (!$isTextNode(node)) return;

            const textContent = node.getTextContent();
            const offset = anchor.offset;
            const textBeforeCursor = textContent.slice(0, offset);

            // Find the @ position
            const atMatch = textBeforeCursor.match(/(^|[\s])@([^\s]*)$/);
            if (!atMatch) return;

            // Calculate the start offset of @ (skip the leading space if present)
            const atStartOffset = offset - atMatch[0].length + atMatch[1].length;

            const mentionNode = $createFileMentionNode(
                file.id,
                file.filename,
                file.mime_type,
                file.is_image,
            );
            const spaceNode = $createTextNode(' ');

            // Split the text node to isolate the @query portion, then replace it
            const splitNodes = node.splitText(atStartOffset, offset);
            // splitText returns: [before, @query, after] — the @query part is at index 1
            const queryNode = splitNodes.length > 1 ? splitNodes[1] : splitNodes[0];
            if (queryNode) {
                queryNode.replace(mentionNode);
                mentionNode.insertAfter(spaceNode);
            }

            // Move selection after the space
            spaceNode.select();
        });

        setQueryString(null);
    }, [editor]);

    // Keyboard navigation when dropdown is open
    useEffect(() => {
        if (queryString === null || filteredFiles.length === 0) return;

        return editor.registerCommand(
            KEY_DOWN_COMMAND,
            (event: KeyboardEvent) => {
                switch (event.key) {
                    case 'ArrowDown':
                        event.preventDefault();
                        setSelectedIndex(prev => Math.min(prev + 1, filteredFiles.length - 1));
                        return true;
                    case 'ArrowUp':
                        event.preventDefault();
                        setSelectedIndex(prev => Math.max(prev - 1, 0));
                        return true;
                    case 'Tab':
                    case 'Enter':
                        event.preventDefault();
                        if (filteredFiles[clampedSelectedIndex]) {
                            insertMention(filteredFiles[clampedSelectedIndex]);
                        }
                        return true;
                    case 'Escape':
                        event.preventDefault();
                        setQueryString(null);
                        return true;
                }
                return false;
            },
            COMMAND_PRIORITY_HIGH,
        );
    }, [editor, queryString, filteredFiles, clampedSelectedIndex, insertMention]);

    // Don't render if no query or disabled
    if (queryString === null || disabled) return null;

    return createPortal(
        <FileMentionDropdown
            files={filteredFiles}
            selectedIndex={clampedSelectedIndex}
            onSelect={insertMention}
            position={anchorPosition}
        />,
        document.body,
    );
}
