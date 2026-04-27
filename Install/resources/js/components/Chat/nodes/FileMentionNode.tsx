import {
    DecoratorNode,
    type LexicalNode,
    type NodeKey,
    type SerializedLexicalNode,
    type Spread,
    $applyNodeReplacement,
} from 'lexical';
import { Image, FileText } from 'lucide-react';

export type SerializedFileMentionNode = Spread<
    {
        fileId: number;
        fileName: string;
        mimeType: string;
        isImage: boolean;
    },
    SerializedLexicalNode
>;

function FileMentionChip({ fileName, isImage }: { fileName: string; isImage: boolean }) {
    return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border-transparent bg-secondary text-secondary-foreground rounded-md text-xs font-medium mx-0.5 align-baseline">
            {isImage ? <Image className="h-3 w-3 shrink-0" /> : <FileText className="h-3 w-3 shrink-0" />}
            <span className="max-w-[120px] truncate">{fileName}</span>
        </span>
    );
}

export class FileMentionNode extends DecoratorNode<JSX.Element> {
    __fileId: number;
    __fileName: string;
    __mimeType: string;
    __isImage: boolean;

    static getType(): string {
        return 'file-mention';
    }

    static clone(node: FileMentionNode): FileMentionNode {
        return new FileMentionNode(node.__fileId, node.__fileName, node.__mimeType, node.__isImage, node.__key);
    }

    constructor(fileId: number, fileName: string, mimeType: string, isImage: boolean, key?: NodeKey) {
        super(key);
        this.__fileId = fileId;
        this.__fileName = fileName;
        this.__mimeType = mimeType;
        this.__isImage = isImage;
    }

    createDOM(): HTMLElement {
        const span = document.createElement('span');
        span.style.display = 'inline';
        return span;
    }

    updateDOM(): false {
        return false;
    }

    decorate(): JSX.Element {
        return <FileMentionChip fileName={this.__fileName} isImage={this.__isImage} />;
    }

    getTextContent(): string {
        return `@${this.__fileName}`;
    }

    isInline(): boolean {
        return true;
    }

    exportJSON(): SerializedFileMentionNode {
        return {
            ...super.exportJSON(),
            type: 'file-mention',
            version: 1,
            fileId: this.__fileId,
            fileName: this.__fileName,
            mimeType: this.__mimeType,
            isImage: this.__isImage,
        };
    }

    static importJSON(serializedNode: SerializedFileMentionNode): FileMentionNode {
        return $createFileMentionNode(
            serializedNode.fileId,
            serializedNode.fileName,
            serializedNode.mimeType,
            serializedNode.isImage,
        );
    }

    getFileId(): number {
        return this.__fileId;
    }

    getFileName(): string {
        return this.__fileName;
    }

    getMimeType(): string {
        return this.__mimeType;
    }

    getIsImage(): boolean {
        return this.__isImage;
    }
}

export function $createFileMentionNode(
    fileId: number,
    fileName: string,
    mimeType: string,
    isImage: boolean,
): FileMentionNode {
    return $applyNodeReplacement(new FileMentionNode(fileId, fileName, mimeType, isImage));
}

export function $isFileMentionNode(node: LexicalNode | null | undefined): node is FileMentionNode {
    return node instanceof FileMentionNode;
}
