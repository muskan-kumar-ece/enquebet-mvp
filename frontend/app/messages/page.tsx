"use client";

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { useWebSocket } from '@/lib/contexts/WebSocketContext';
import { ConversationSidebar } from '@/components/chat/ConversationSidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageStream } from '@/components/chat/MessageStream';
import { MessageComposer } from '@/components/chat/MessageComposer';
import { EmptyChatState } from '@/components/chat/EmptyChatState';
import toast from 'react-hot-toast';

function MessagesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useRequireAuth();
    const { connectChat, onChatMessage, onChatTyping, onChatRead, sendChatTyping, sendChatRead } = useWebSocket();

    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedConvo, setSelectedConvo] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

    // Keyset cursor pagination states
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [oldestCursor, setOldestCursor] = useState<string | null>(null);

    // Real-time typing indicators
    const [isCounterpartyTyping, setIsCounterpartyTyping] = useState(false);
    const [typingUsername, setTypingUsername] = useState<string | undefined>(undefined);
    const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Initial fetch
    useEffect(() => {
        if (!authLoading && user) {
            fetchConversations();
        }
    }, [authLoading, user]);

    // Handle deep link / query param `?convo=UUID`
    useEffect(() => {
        const convoId = searchParams.get('convo');
        if (convoId && conversations.length > 0) {
            const target = conversations.find((c) => c.id === convoId);
            if (target && (!selectedConvo || selectedConvo.id !== target.id)) {
                handleSelectConvo(target);
            }
        }
    }, [conversations, searchParams]);

    const fetchConversations = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.getConversations();
            setConversations(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load conversations');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectConvo = async (convo: any) => {
        setSelectedConvo(convo);
        setMobileView('chat');
        setMessages([]);
        setIsCounterpartyTyping(false);
        setHasMore(false);
        setOldestCursor(null);

        try {
            const response = await api.getMessages(convo.id, { limit: 50 });
            const msgs = Array.isArray(response) ? response : (response.results ?? []);
            setMessages(msgs);
            if (response && !Array.isArray(response)) {
                setHasMore(Boolean(response.has_more));
                setOldestCursor(response.oldest_cursor || null);
            }
        } catch {
            toast.error('Failed to load messages');
        }

        // Connect WebSocket and send initial read receipt
        connectChat(convo.id);
        sendChatRead();
    };

    // Load Earlier Messages via Keyset Cursor (Scroll Anchoring)
    const handleLoadEarlier = async () => {
        if (!selectedConvo || !oldestCursor || loadingMore) return;
        setLoadingMore(true);

        try {
            const response = await api.getMessages(selectedConvo.id, {
                before: oldestCursor,
                limit: 50,
            });
            const olderMessages = Array.isArray(response) ? response : (response.results ?? []);

            if (response && !Array.isArray(response)) {
                setHasMore(Boolean(response.has_more));
                setOldestCursor(response.oldest_cursor || null);
            } else {
                setHasMore(false);
            }

            setMessages((prev) => {
                const existingIds = new Set(prev.map((m) => m.id));
                const filtered = olderMessages.filter((m: any) => !existingIds.has(m.id));
                return [...filtered, ...prev];
            });
        } catch (err: any) {
            toast.error('Could not load earlier messages');
        } finally {
            setLoadingMore(false);
        }
    };

    // WebSocket Incoming Messages & Deduplication
    useEffect(() => {
        if (!selectedConvo) return;
        const unsub = onChatMessage((data) => {
            if (data.message) {
                const incoming = data.message;
                setMessages((prev) => {
                    // 1. If an optimistic message with matching client_msg_id exists, reconcile it
                    if (incoming.client_msg_id && prev.some((m) => m.client_msg_id === incoming.client_msg_id || m.id === incoming.client_msg_id)) {
                        return prev.map((m) =>
                            m.client_msg_id === incoming.client_msg_id || m.id === incoming.client_msg_id
                                ? { ...incoming, is_me: m.is_me ?? (incoming.sender?.id === user?.id), status: 'delivered' }
                                : m
                        );
                    }

                    // 2. If message already exists by DB id, do not duplicate
                    if (prev.some((m) => m.id === incoming.id)) {
                        return prev;
                    }

                    return [...prev, { ...incoming, is_me: incoming.sender?.id === user?.id, status: 'delivered' }];
                });

                // Update last message in sidebar
                setConversations((prev) =>
                    prev.map((c) => (c.id === selectedConvo.id ? { ...c, last_message: incoming } : c))
                );
            }
        });
        return unsub;
    }, [selectedConvo, onChatMessage, user?.id]);

    // WebSocket Typing Indicator
    useEffect(() => {
        if (!selectedConvo) return;
        const unsub = onChatTyping((data) => {
            if (data.user_id && data.user_id !== user?.id) {
                setIsCounterpartyTyping(Boolean(data.is_typing));
                setTypingUsername(data.username);

                if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                if (data.is_typing) {
                    typingTimerRef.current = setTimeout(() => {
                        setIsCounterpartyTyping(false);
                    }, 3000);
                }
            }
        });
        return unsub;
    }, [selectedConvo, onChatTyping, user?.id]);

    // Send Message with Optimistic UI & Zero Jitter
    const handleSendMessage = async (content: string, attachmentUrl?: string) => {
        if (!selectedConvo) return;

        // Generate client-side tracking ID
        const clientMsgId = 'client-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
        const optimisticMessage = {
            id: clientMsgId,
            client_msg_id: clientMsgId,
            content,
            attachment_url: attachmentUrl || '',
            sender: {
                id: user?.id,
                username: user?.username,
                full_name: user?.full_name,
            },
            is_me: true,
            created_at: new Date().toISOString(),
            status: 'sending',
        };

        // Render optimistically immediately
        setMessages((prev) => [...prev, optimisticMessage]);
        setConversations((prev) =>
            prev.map((c) => (c.id === selectedConvo.id ? { ...c, last_message: optimisticMessage } : c))
        );

        try {
            const sentMessage = await api.sendMessage(selectedConvo.id, content, attachmentUrl, clientMsgId);
            setMessages((prev) =>
                prev.map((m) =>
                    m.client_msg_id === clientMsgId || m.id === clientMsgId
                        ? { ...sentMessage, is_me: true, status: 'delivered' }
                        : m
                )
            );

            // Update sidebar preview
            setConversations((prev) =>
                prev.map((c) => (c.id === selectedConvo.id ? { ...c, last_message: sentMessage } : c))
            );
        } catch (err: any) {
            // Mark optimistic message as failed
            setMessages((prev) =>
                prev.map((m) =>
                    m.client_msg_id === clientMsgId ? { ...m, status: 'error' } : m
                )
            );
            toast.error(err.message || 'Failed to send message');
        }
    };

    // Typing Event from composer
    const handleTyping = useCallback(
        (isTyping: boolean) => {
            sendChatTyping(isTyping);
        },
        [sendChatTyping]
    );

    if (authLoading || (loading && conversations.length === 0)) {
        return (
            <div className="flex items-center justify-center min-h-[80vh] bg-[#08090e] bg-blueprint-grid">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                    <p className="text-xs text-zinc-400 font-mono tracking-wide">Loading builder channels...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-64px)] flex overflow-hidden bg-[#08090e]">
            {/* Sidebar Column */}
            <div
                className={`
                    w-full md:w-80 lg:w-96 shrink-0 h-full
                    ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}
                `}
            >
                <ConversationSidebar
                    conversations={conversations}
                    selectedConvoId={selectedConvo?.id || null}
                    onSelectConvo={handleSelectConvo}
                    currentUserId={user?.id}
                    loading={loading}
                    onRefresh={fetchConversations}
                />
            </div>

            {/* Chat Column */}
            <div
                className={`
                    flex-1 flex flex-col h-full min-w-0
                    ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}
                `}
            >
                {selectedConvo ? (
                    <>
                        <ChatHeader
                            convo={selectedConvo}
                            currentUserId={user?.id}
                            isTyping={isCounterpartyTyping}
                            typingUsername={typingUsername}
                            onBack={() => setMobileView('list')}
                        />
                        <MessageStream
                            messages={messages}
                            currentUserId={user?.id}
                            isTyping={isCounterpartyTyping}
                            typingUsername={typingUsername}
                            hasMore={hasMore}
                            loadingMore={loadingMore}
                            onLoadEarlier={handleLoadEarlier}
                        />
                        <MessageComposer
                            onSend={handleSendMessage}
                            onTyping={handleTyping}
                            disabled={!selectedConvo}
                        />
                    </>
                ) : (
                    <EmptyChatState
                        type="no_conversation"
                        onNewSearch={() => router.push('/search?type=builders')}
                    />
                )}
            </div>
        </div>
    );
}

export default function MessagesPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center min-h-[80vh] bg-[#07070d]">
                    <div className="text-xs text-zinc-400 font-mono">Loading Messages...</div>
                </div>
            }
        >
            <MessagesContent />
        </Suspense>
    );
}
