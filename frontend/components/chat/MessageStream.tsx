"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { CheckCheck, Clock, Copy, AlertCircle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

interface MessageStreamProps {
    messages: any[];
    currentUserId?: string;
    isTyping?: boolean;
    typingUsername?: string;
    hasMore?: boolean;
    loadingMore?: boolean;
    onLoadEarlier?: () => Promise<void> | void;
    onRetryMessage?: (msg: any) => Promise<void> | void;
}

export function MessageStream({
    messages,
    currentUserId,
    isTyping = false,
    typingUsername,
    hasMore = false,
    loadingMore = false,
    onLoadEarlier,
    onRetryMessage,
}: MessageStreamProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const prevHeightRef = useRef<number>(0);
    const isInitialMount = useRef<boolean>(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Initial mount auto-scroll to bottom
    useEffect(() => {
        if (isInitialMount.current && messages.length > 0) {
            bottomRef.current?.scrollIntoView({ behavior: 'auto' });
            isInitialMount.current = false;
        }
    }, [messages]);

    // When a new outgoing or incoming message arrives at the bottom, auto-scroll smoothly
    useEffect(() => {
        if (!isInitialMount.current && messages.length > 0) {
            const container = containerRef.current;
            if (container) {
                // If user is within 150px of bottom, auto-scroll
                const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 180;
                if (isNearBottom) {
                    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
                }
            }
        }
    }, [messages.length, isTyping]);

    // Handle scroll-anchored loading of earlier messages (Zero Layout Shift)
    const handleLoadEarlier = useCallback(async () => {
        if (!onLoadEarlier || loadingMore) return;
        const container = containerRef.current;
        if (container) {
            prevHeightRef.current = container.scrollHeight;
        }

        await onLoadEarlier();

        // Restore scroll position so content doesn't jump
        requestAnimationFrame(() => {
            const el = containerRef.current;
            if (el && prevHeightRef.current > 0) {
                const diff = el.scrollHeight - prevHeightRef.current;
                el.scrollTop = diff;
            }
        });
    }, [onLoadEarlier, loadingMore]);

    const handleCopyCode = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Snippet copied to clipboard');
    };

    // Group messages by date
    const formatDateDivider = (isoString: string) => {
        const date = new Date(isoString);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Parse simple code blocks in content: ```code```
    const renderMessageContent = (content: string) => {
        if (!content) return null;

        const codeBlockRegex = /```([\s\S]*?)```/g;
        if (codeBlockRegex.test(content)) {
            const parts = [];
            let lastIndex = 0;
            let match;
            const regex = /```([\s\S]*?)```/g;

            while ((match = regex.exec(content)) !== null) {
                if (match.index > lastIndex) {
                    parts.push(
                        <span key={lastIndex} className="whitespace-pre-wrap">
                            {content.substring(lastIndex, match.index)}
                        </span>
                    );
                }
                const codeSnippet = match[1];
                parts.push(
                    <div key={match.index} className="my-2 p-2.5 rounded-lg bg-[#0b0d14] border border-[#1e2335] font-mono text-xs text-brand-light relative group overflow-x-auto">
                        <button
                            type="button"
                            onClick={() => handleCopyCode(codeSnippet)}
                            className="absolute top-2 right-2 p-1 rounded bg-zinc-800/80 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy code"
                        >
                            <Copy className="w-3.5 h-3.5" />
                        </button>
                        <pre className="text-xs leading-relaxed">{codeSnippet}</pre>
                    </div>
                );
                lastIndex = match.index + match[0].length;
            }

            if (lastIndex < content.length) {
                parts.push(
                    <span key={lastIndex} className="whitespace-pre-wrap">
                        {content.substring(lastIndex)}
                    </span>
                );
            }
            return parts;
        }

        return <span className="whitespace-pre-wrap leading-relaxed">{content}</span>;
    };

    return (
        <div ref={containerRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-[#080810]">
            {/* Load Earlier Messages Button */}
            {hasMore && (
                <div className="flex justify-center pb-2">
                    <button
                        type="button"
                        onClick={handleLoadEarlier}
                        disabled={loadingMore}
                        className="text-xs font-mono text-zinc-400 hover:text-white bg-[#10101c] border border-[#1e1e34] px-4 py-1.5 rounded-full transition-all flex items-center gap-2 hover:border-brand/40 shadow-sm"
                    >
                        {loadingMore ? (
                            <>
                                <span className="w-3 h-3 rounded-full border border-brand border-t-transparent animate-spin" />
                                <span>Loading previous messages...</span>
                            </>
                        ) : (
                            <span>Load earlier messages</span>
                        )}
                    </button>
                </div>
            )}

            {messages.map((msg, index) => {
                const isMe = msg.is_me || msg.sender?.id === currentUserId;
                const prevMsg = messages[index - 1];
                const showDateDivider =
                    !prevMsg ||
                    new Date(prevMsg.created_at).toDateString() !== new Date(msg.created_at).toDateString();

                const senderName = msg.sender?.full_name || msg.sender?.username || 'Builder';
                const senderInitial = senderName.slice(0, 2).toUpperCase();
                const isSending = msg.status === 'sending';
                const isError = msg.status === 'error';

                return (
                    <React.Fragment key={msg.client_msg_id || msg.id || index}>
                        {/* Date Divider */}
                        {showDateDivider && (
                            <div className="flex items-center justify-center my-6">
                                <div className="h-px bg-[#1a1a2e] flex-1" />
                                <span className="px-3 py-1 text-[11px] font-mono text-zinc-400 bg-[#10101c] border border-[#1e1e34] rounded-full mx-4 shadow-sm">
                                    {formatDateDivider(msg.created_at)}
                                </span>
                                <div className="h-px bg-[#1a1a2e] flex-1" />
                            </div>
                        )}

                        {/* Message Bubble Row */}
                        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex items-end gap-2.5 max-w-[85%] sm:max-w-[70%] md:max-w-[60%] ${isMe ? 'flex-row-reverse' : ''}`}>
                                {/* Counterparty Avatar */}
                                {!isMe && (
                                    msg.sender?.id ? (
                                        <Link
                                            href={`/profile/${msg.sender.id}`}
                                            className="w-7 h-7 rounded-full bg-[#14192b] border border-brand/20 text-brand-light text-[11px] font-bold flex items-center justify-center shrink-0 mb-1 hover:border-brand/60 hover:opacity-90 transition-all cursor-pointer"
                                            title={`View @${msg.sender.username || senderName}'s profile`}
                                        >
                                            {msg.sender?.profile_image ? (
                                                <img
                                                    src={msg.sender.profile_image}
                                                    alt={senderName}
                                                    className="w-full h-full rounded-full object-cover"
                                                />
                                            ) : (
                                                senderInitial
                                            )}
                                        </Link>
                                    ) : (
                                        <div className="w-7 h-7 rounded-full bg-[#14192b] border border-brand/20 text-brand-light text-[11px] font-bold flex items-center justify-center shrink-0 mb-1">
                                            {msg.sender?.profile_image ? (
                                                <img
                                                    src={msg.sender.profile_image}
                                                    alt={senderName}
                                                    className="w-full h-full rounded-full object-cover"
                                                />
                                            ) : (
                                                senderInitial
                                            )}
                                        </div>
                                    )
                                )}

                                {/* Message Content Container */}
                                <div className="space-y-1">
                                    {/* Sender Name in group chats */}
                                    {!isMe && (
                                        msg.sender?.id ? (
                                            <Link
                                                href={`/profile/${msg.sender.id}`}
                                                className="text-[11px] font-medium text-zinc-400 hover:text-brand-light hover:underline ml-1 inline-block transition-colors cursor-pointer"
                                                title={`View @${msg.sender.username || senderName}'s profile`}
                                            >
                                                {senderName}
                                            </Link>
                                        ) : (
                                            <p className="text-[11px] font-medium text-zinc-400 ml-1">
                                                {senderName}
                                            </p>
                                        )
                                    )}

                                    {/* Main Bubble */}
                                    <div
                                        className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-md transition-all ${
                                            isMe
                                                ? isError
                                                    ? 'bg-rose-950/40 text-white rounded-br-sm border border-rose-500/50 shadow-[inset_0_1px_0_rgba(244,63,94,0.3)]'
                                                    : `bg-brand text-white rounded-br-sm border border-brand/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] ${isSending ? 'opacity-70' : ''}`
                                                : 'bg-[#0f111a] border border-[#1e2335] text-zinc-200 rounded-bl-sm'
                                        }`}
                                    >
                                        {/* Attachment Image Preview */}
                                        {msg.attachment_url && (
                                            <div className="mb-2 rounded-xl overflow-hidden border border-black/20 max-w-sm">
                                                <img
                                                    src={msg.attachment_url}
                                                    alt="Attachment"
                                                    className="w-full max-h-64 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                                    onClick={() => setSelectedImage(msg.attachment_url)}
                                                />
                                            </div>
                                        )}

                                        {renderMessageContent(msg.content)}
                                    </div>

                                    {/* Timestamp & Read Receipt */}
                                    <div className={`flex items-center gap-1.5 text-[10px] text-zinc-400 ${isMe ? 'justify-end mr-1' : 'ml-1'}`}>
                                        <span>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {isMe && (
                                            <>
                                                {isError ? (
                                                    <span className="flex items-center gap-1 text-rose-400 font-mono">
                                                        <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                                                        <span>Failed</span>
                                                        {onRetryMessage && (
                                                            <button
                                                                type="button"
                                                                onClick={() => onRetryMessage(msg)}
                                                                className="ml-1 text-[11px] text-rose-300 hover:text-white font-medium underline inline-flex items-center gap-0.5 transition-colors cursor-pointer"
                                                                title="Retry sending message"
                                                            >
                                                                <RotateCcw className="w-2.5 h-2.5" />
                                                                <span>Retry</span>
                                                            </button>
                                                        )}
                                                    </span>
                                                ) : isSending ? (
                                                    <span title="Sending...">
                                                        <Clock className="w-3.5 h-3.5 text-zinc-400 animate-pulse" />
                                                    </span>
                                                ) : (
                                                    <span title="Delivered">
                                                        <CheckCheck className="w-3.5 h-3.5 text-brand" />
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </React.Fragment>
                );
            })}

            {/* Typing Indicator Bubble */}
            {isTyping && (
                <div className="flex items-end gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs flex items-center justify-center font-bold">
                        ...
                    </div>
                    <div className="bg-[#0f111a] border border-[#1e2335] rounded-xl rounded-bl-sm px-3.5 py-2.5 shadow-sm flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        {typingUsername && (
                            <span className="text-[11px] text-zinc-400 font-mono">
                                {typingUsername} is typing...
                            </span>
                        )}
                    </div>
                </div>
            )}

            <div ref={bottomRef} />

            {/* Image Modal Lightbox */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh]">
                        <img
                            src={selectedImage}
                            alt="Full preview"
                            className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-zinc-800"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
