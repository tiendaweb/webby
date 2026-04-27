import { $getRoot, type EditorState, type LexicalNode } from 'lexical';
import { $isFileMentionNode, type FileMentionNode } from '../nodes/FileMentionNode';
import type { AttachedFile } from '@/types/chat';

export interface ExtractedFileMentions {
    fileIds: number[];
    attachedFiles: AttachedFile[];
}

/**
 * Extract all FileMentionNode instances from a Lexical EditorState.
 * Resolves full file metadata from projectFiles when available.
 */
export function extractFileMentions(editorState: EditorState, projectFiles?: AttachedFile[]): ExtractedFileMentions {
    const fileIds: number[] = [];
    const attachedFiles: AttachedFile[] = [];
    const seenIds = new Set<number>();

    // Build lookup map for full metadata
    const fileMap = new Map<number, AttachedFile>();
    if (projectFiles) {
        for (const f of projectFiles) {
            fileMap.set(f.id, f);
        }
    }

    editorState.read(() => {
        const root = $getRoot();
        walkNodes(root.getChildren());
    });

    function walkNodes(nodes: LexicalNode[]) {
        for (const node of nodes) {
            if ($isFileMentionNode(node)) {
                const mention = node as FileMentionNode;
                const fileId = mention.getFileId();
                if (!seenIds.has(fileId)) {
                    seenIds.add(fileId);
                    fileIds.push(fileId);
                    // Use full metadata from projectFiles if available
                    const full = fileMap.get(fileId);
                    attachedFiles.push(full ?? {
                        id: fileId,
                        filename: mention.getFileName(),
                        mime_type: mention.getMimeType(),
                        is_image: mention.getIsImage(),
                        size: 0,
                        human_size: '',
                        url: '',
                    });
                }
            }
            // Recurse into child nodes (e.g. ParagraphNode, ElementNode)
            if ('getChildren' in node && typeof (node as { getChildren?: () => LexicalNode[] }).getChildren === 'function') {
                walkNodes((node as { getChildren: () => LexicalNode[] }).getChildren());
            }
        }
    }

    return { fileIds, attachedFiles };
}
