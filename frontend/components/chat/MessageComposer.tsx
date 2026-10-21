"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Loader2 } from 'lucide-react';

interface MessageComposerProps {
    onSend: (content: string, attachmentUrl?: string) => Promise<void>;
    onTyping?: (isTyping: boolean) => void;
    disabled?: boolean;
}

export function MessageComposer({
    onSend,
    onTyping,
    disabled = false,
}: MessageComposerProps) {
    const [content, setContent] = useState('');
    const [attachmentUrl, setAttachmentUrl] = useState('');
    const [showAttachInput, setShowAttachInput] = useState(false);
    const [sending, setSending] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-adjust height
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [content]);

    // Focus input when composer becomes enabled
    useEffect(() => {
        if (!disabled && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [disabled]);

    // Handle typing indicator debouncing
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setContent(val);

        if (onTyping) {
            onTyping(true);
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
                onTyping(false);
            }, 2000);
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = content.trim();
        const trimmedAttach = attachmentUrl.trim();
        if ((!trimmed && !trimmedAttach) || sending || disabled) return;

        // Clear immediately for responsive optimistic UX and keep focus locked
        setContent('');
        setAttachmentUrl('');
        setShowAttachInput(false);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.focus();
        }

        if (onTyping) {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            onTyping(false);
        }

        setSending(true);
        try {
            await onSend(trimmed, trimmedAttach || undefined);
        } catch {
            // Restore draft if send totally failed
            setContent(trimmed);
            if (trimmedAttach) setAttachmentUrl(trimmedAttach);
            if (textareaRef.current) {
                textareaRef.current.focus();
            }
        } finally {
            setSending(false);
            requestAnimationFrame(() => {
                textareaRef.current?.focus();
            });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="p-3 md:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#0b0d14] border-t border-[#1e2335] shrink-0">
            {/* Attachment input strip */}
            {showAttachInput && (
                <div className="mb-2 p-2 rounded-lg bg-[#0f111a] border border-[#1e2335] flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-brand shrink-0" />
                    <input
                        type="url"
                        placeholder="Paste image or attachment URL..."
                        value={attachmentUrl}
                        onChange={(e) => setAttachmentUrl(e.target.value)}
                        className="flex-1 bg-transparent text-xs text-white placeholder-zinc-400 focus:outline-none"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setAttachmentUrl('');
                            setShowAttachInput(false);
                        }}
                        className="p-1 rounded-md text-zinc-400 hover:text-white active:scale-90 transition-all select-none"
                        aria-label="Remove attachment"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-end gap-2">
                {/* Toggle Attachment Button */}
                <button
                    type="button"
                    onClick={() => setShowAttachInput(!showAttachInput)}
                    className={`p-2.5 rounded-lg border transition-all duration-150 shrink-0 select-none touch-manipulation active:scale-90 ${
                        showAttachInput || attachmentUrl
                            ? 'bg-brand/15 border-brand/40 text-brand-light'
                            : 'bg-[#0f111a] border-[#1e2335] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 active:bg-white/[0.04]'
                    }`}
                    title="Attach file or image URL"
                    aria-label="Attach file or image URL"
                >
                    <Paperclip className="w-4 h-4" />
                </button>

                {/* Textarea */}
                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={content}
                        onChange={handleTextChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message... (Shift+Enter for newline)"
                        disabled={disabled}
                        className="w-full bg-[#0f111a] border border-[#1e2335] text-xs sm:text-sm text-white placeholder-zinc-400 px-4 py-2.5 rounded-lg resize-none focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors leading-relaxed"
                    />
                </div>

                {/* Send Button */}
                <button
                    type="submit"
                    disabled={(!content.trim() && !attachmentUrl.trim()) || disabled || sending}
                    data-loading={sending}
                    aria-label={sending ? "Sending message..." : "Send message"}
                    className="btn-brand p-2.5 sm:px-4 sm:py-2.5 rounded-lg text-white font-medium text-xs flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all shrink-0 select-none touch-manipulation"
                >
                    {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin shrink-0 text-white" />
                    ) : (
                        <Send className="w-4 h-4 shrink-0" />
                    )}
                    <span className="hidden sm:inline">{sending ? 'Sending...' : 'Send'}</span>
                </button>
            </form>
        </div>
    );
}
