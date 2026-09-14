import { PageProps, User } from '@/types';

export interface AttachedFile {
    id: number;
    filename: string;
    mime_type: string;
    size: number;
    human_size: string;
    is_image: boolean;
    url: string;
    api_url?: string;
}

/** Status a connector note moves through. */
export type NoteStatus = 'pending' | 'in_progress' | 'done' | 'failed' | 'cancelled';

export interface ChatMessage {
    id: string;
    /**
     * "note" and "noteResult" are the connector lane: a note is a message
     * the owner addressed to an MCP assistant instead of the AI builder,
     * and a noteResult is that assistant's account of what it did. Neither
     * is ever sent to the builder.
     */
    type: 'user' | 'assistant' | 'system' | 'activity' | 'note' | 'noteResult';
    content: string;
    timestamp: Date;
    activityType?: string;
    thinkingDuration?: number;
    attachedFiles?: AttachedFile[];
    noteId?: string;
    noteStatus?: NoteStatus;
    /** Which connector answered, taken from its token name. */
    noteSource?: string | null;
    noteData?: Record<string, unknown> | null;
}

export interface ChatProps extends PageProps {
    user: User;
}
