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
import { useNavigationUI } from '@/lib/contexts/NavigationContext';
import toast from 'react-hot-toast';

// In-memory cache to preserve state across page navigations without blank flashes
const messageCache: {
    conversations: any[] | null;
    messagesByConvo: Record<string, any[]>;
    metaByConvo: Record<string, { hasMore: boolean; oldestCursor: string | null }>;
} = {
    conversations: null,
    messagesByConvo: {},
    metaByConvo: {},
};

function MessagesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useRequireAuth();
    const { connectChat, disconnectChat, onChatMessage, onChatTyping, sendChatTyping, sendChatRead } = useWebSocket();

    const [conversations, setConversations] = useState<any[]>(() => messageCache.conversations || []);
    const [selectedConvo, setSelectedConvo] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(!messageCache.conversations);
    const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
    const { setHideMobileNav } = useNavigationUI();

    // Hide mobile bottom nav during active chat sessions
    useEffect(() => {
        setHideMobileNav(mobileView === 'chat');
        return () => { setHideMobileNav(false); };
    }, [mobileView, setHideMobileNav]);

    // Keyset cursor pagination states
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [oldestCursor, setOldestCursor] = useState<string | null>(null);

    // Real-time typing indicators
    const [isCounterpartyTyping, setIsCounterpartyTyping] = useState(false);
    const [typingUsername, setTypingUsername] = useState<string | undefined>(undefined);
    const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Stale fetch request sequence guard
    const fetchRequestIdRef = useRef(0);
    const startingDmRef = useRef<string | null>(null);

    const handleSelectConvo = useCallback(async (convo: any, options: { pushHistory?: boolean } = {}) => {
        if (!convo?.id) return;
        setSelectedConvo(convo);
        setMobileView('chat');
        setIsCounterpartyTyping(false);

        // Save to session storage for seamless restoration when returning to plain /messages
        try {
            sessionStorage.setItem('enquebet_last_active_convo', convo.id);
        } catch {}

        // Push URL state when manually selected so browser Back/Forward navigates history
        if (options.pushHistory) {
            router.push(`/messages?convo=${convo.id}`, { scroll: false });
        }

        // Display cached messages immediately if available to eliminate blank screen flash
        const cached = messageCache.messagesByConvo[convo.id];
        if (cached && cached.length > 0) {
            setMessages(cached);
            const meta = messageCache.metaByConvo[convo.id];
            setHasMore(meta?.hasMore || false);
            setOldestCursor(meta?.oldestCursor || null);
        } else {
            setMessages((prev) => (selectedConvo?.id === convo.id ? prev : []));
            setHasMore(false);
            setOldestCursor(null);
        }

        // Connect WebSocket immediately and send initial read receipt
        connectChat(convo.id);
        sendChatRead();

        // Increment request sequence to guard against race conditions
        const reqId = ++fetchRequestIdRef.current;

        try {
            const response = await api.getMessages(convo.id, { limit: 50 });
            // Discard response if another conversation was selected in the meantime
            if (fetchRequestIdRef.current !== reqId) return;

            const msgs = Array.isArray(response) ? response : (response.results ?? []);
            setMessages(msgs);
            messageCache.messagesByConvo[convo.id] = msgs;

            if (response && !Array.isArray(response)) {
                const hasMoreVal = Boolean(response.has_more);
                const cursorVal = response.oldest_cursor || null;
                setHasMore(hasMoreVal);
                setOldestCursor(cursorVal);
                messageCache.metaByConvo[convo.id] = { hasMore: hasMoreVal, oldestCursor: cursorVal };
            }
        } catch {
            if (fetchRequestIdRef.current === reqId) {
                toast.error('Failed to load messages');
            }
        }
    }, [connectChat, sendChatRead, router, selectedConvo?.id]);

    const fetchConversations = useCallback(async () => {
        if (!messageCache.conversations) {
            setLoading(true);
        }
        try {
            const data = await api.getConversations();
            setConversations(data);
            messageCache.conversations = data;
        } catch (err: any) {
            toast.error(err.message || 'Failed to load conversations');
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        if (!authLoading && user) {
            fetchConversations();
        }
    }, [authLoading, user, fetchConversations]);

    // Handle Deep-Links (?user=, ?project=, ?convo=) and Plain /messages Session Restoration
    useEffect(() => {
        if (loading) return;

        const userParam = searchParams.get('user');
        const projectParam = searchParams.get('project');
        const convoParam = searchParams.get('convo');

        // 1. Handle ?user=UUID (from Profile "Message" button)
        if (userParam) {
            const existing = conversations.find(
                (c) => !c.is_group && Array.isArray(c.members) && c.members.some((m: any) => m.id === userParam)
            );
            if (existing) {
                if (!selectedConvo || selectedConvo.id !== existing.id) {
                    handleSelectConvo(existing);
                }
                router.replace(`/messages?convo=${existing.id}`, { scroll: false });
            } else if (startingDmRef.current !== userParam) {
                startingDmRef.current = userParam;
                api.startDM(userParam)
                    .then(async (res) => {
                        if (res?.conversation_id) {
                            const freshList = await api.getConversations();
                            setConversations(freshList);
                            messageCache.conversations = freshList;
                            const target = freshList.find((c: any) => c.id === res.conversation_id);
                            if (target) {
                                handleSelectConvo(target);
                            }
                            router.replace(`/messages?convo=${res.conversation_id}`, { scroll: false });
                        }
                    })
                    .catch(() => {
                        toast.error('Unable to open direct message with this user.');
                        router.replace('/messages', { scroll: false });
                    })
                    .finally(() => {
                        startingDmRef.current = null;
                    });
            }
            return;
        }

        // 2. Handle ?project=UUID (from Workspace "Team Chat" button)
        if (projectParam) {
            const target = conversations.find((c) => c.project_id === projectParam);
            if (target) {
                if (!selectedConvo || selectedConvo.id !== target.id) {
                    handleSelectConvo(target);
                }
                router.replace(`/messages?convo=${target.id}`, { scroll: false });
            } else if (conversations.length > 0) {
                toast.error('No team chat found for this project or you are not a member.');
                router.replace('/messages', { scroll: false });
            }
            return;
        }

        // 3. Handle ?convo=UUID
        if (convoParam) {
            const target = conversations.find((c) => c.id === convoParam);
            if (target) {
                if (!selectedConvo || selectedConvo.id !== target.id) {
                    handleSelectConvo(target);
                }
            } else if (conversations.length > 0) {
                toast.error('Conversation not found or access denied.');
                router.replace('/messages', { scroll: false });
            }
            return;
        }

        // 4. Plain /messages (no params): Restore from sessionStorage or select first on desktop
        if (!userParam && !projectParam && !convoParam && !selectedConvo) {
            let restored = false;
            try {
                const lastId = sessionStorage.getItem('enquebet_last_active_convo');
                if (lastId) {
                    const savedConvo = conversations.find((c) => c.id === lastId);
                    if (savedConvo) {
                        handleSelectConvo(savedConvo);
                        router.replace(`/messages?convo=${lastId}`, { scroll: false });
                        restored = true;
                    }
                }
            } catch {}

            if (!restored && typeof window !== 'undefined' && window.innerWidth >= 768 && conversations.length > 0) {
                handleSelectConvo(conversations[0]);
                router.replace(`/messages?convo=${conversations[0].id}`, { scroll: false });
            }
        }
    }, [conversations, searchParams, selectedConvo, loading, handleSelectConvo, router]);

    // Clean disconnect on page unmount
    useEffect(() => {
        return () => {
            disconnectChat();
        };
    }, [disconnectChat]);

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
                messageCache.metaByConvo[selectedConvo.id] = {
                    hasMore: Boolean(response.has_more),
                    oldestCursor: response.oldest_cursor || null,
                };
            } else {
                setHasMore(false);
            }

            setMessages((prev) => {
                const existingIds = new Set(prev.map((m) => m.id));
                const filtered = olderMessages.filter((m: any) => !existingIds.has(m.id));
                const updated = [...filtered, ...prev];
                messageCache.messagesByConvo[selectedConvo.id] = updated;
                return updated;
            });
        } catch {
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
                    let updated: any[];
                    // 1. If an optimistic message with matching client_msg_id exists, reconcile it
                    if (incoming.client_msg_id && prev.some((m) => m.client_msg_id === incoming.client_msg_id || m.id === incoming.client_msg_id)) {
                        updated = prev.map((m) =>
                            m.client_msg_id === incoming.client_msg_id || m.id === incoming.client_msg_id
                                ? { ...incoming, is_me: m.is_me ?? (incoming.sender?.id === user?.id), status: 'delivered' }
                                : m
                        );
                    } else if (prev.some((m) => m.id === incoming.id)) {
                        updated = prev;
                    } else {
                        updated = [...prev, { ...incoming, is_me: incoming.sender?.id === user?.id, status: 'delivered' }];
                    }

                    if (selectedConvo?.id) {
                        messageCache.messagesByConvo[selectedConvo.id] = updated;
                    }
                    return updated;
                });

                // Update last message in sidebar
                setConversations((prev) => {
                    const updatedConvos = prev.map((c) => (c.id === selectedConvo.id ? { ...c, last_message: incoming } : c));
                    messageCache.conversations = updatedConvos;
                    return updatedConvos;
                });
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
        setMessages((prev) => {
            const updated = [...prev, optimisticMessage];
            if (selectedConvo?.id) {
                messageCache.messagesByConvo[selectedConvo.id] = updated;
            }
            return updated;
        });

        setConversations((prev) => {
            const updated = prev.map((c) => (c.id === selectedConvo.id ? { ...c, last_message: optimisticMessage } : c));
            messageCache.conversations = updated;
            return updated;
        });

        try {
            const sentMessage = await api.sendMessage(selectedConvo.id, content, attachmentUrl, clientMsgId);
            setMessages((prev) => {
                const updated = prev.map((m) =>
                    m.client_msg_id === clientMsgId || m.id === clientMsgId
                        ? { ...sentMessage, is_me: true, status: 'delivered' }
                        : m
                );
                if (selectedConvo?.id) {
                    messageCache.messagesByConvo[selectedConvo.id] = updated;
                }
                return updated;
            });

            // Update sidebar preview
            setConversations((prev) => {
                const updated = prev.map((c) => (c.id === selectedConvo.id ? { ...c, last_message: sentMessage } : c));
                messageCache.conversations = updated;
                return updated;
            });
        } catch (err: any) {
            // Mark optimistic message as failed
            setMessages((prev) => {
                const updated = prev.map((m) =>
                    m.client_msg_id === clientMsgId ? { ...m, status: 'error' } : m
                );
                if (selectedConvo?.id) {
                    messageCache.messagesByConvo[selectedConvo.id] = updated;
                }
                return updated;
            });
            toast.error(err.message || 'Failed to send message');
            throw err;
        }
    };

    // Retry sending a previously failed message
    const handleRetryMessage = async (failedMsg: any) => {
        if (!selectedConvo) return;
        const trackingId = failedMsg.client_msg_id || failedMsg.id;

        setMessages((prev) =>
            prev.map((m) =>
                m.client_msg_id === trackingId || m.id === trackingId
                    ? { ...m, status: 'sending' }
                    : m
            )
        );

        try {
            const sentMessage = await api.sendMessage(
                selectedConvo.id,
                failedMsg.content,
                failedMsg.attachment_url,
                trackingId
            );

            setMessages((prev) => {
                const updated = prev.map((m) =>
                    m.client_msg_id === trackingId || m.id === trackingId
                        ? { ...sentMessage, is_me: true, status: 'delivered' }
                        : m
                );
                if (selectedConvo?.id) {
                    messageCache.messagesByConvo[selectedConvo.id] = updated;
                }
                return updated;
            });

            setConversations((prev) => {
                const updated = prev.map((c) => (c.id === selectedConvo.id ? { ...c, last_message: sentMessage } : c));
                messageCache.conversations = updated;
                return updated;
            });
            toast.success('Message sent!');
        } catch (err: any) {
            setMessages((prev) =>
                prev.map((m) =>
                    m.client_msg_id === trackingId ? { ...m, status: 'error' } : m
                )
            );
            toast.error(err.message || 'Retry failed');
        }
    };

    // Broadcast typing throttled
    const lastTypingSentRef = useRef<number>(0);
    const handleTyping = () => {
        const now = Date.now();
        if (now - lastTypingSentRef.current > 2000) {
            lastTypingSentRef.current = now;
            sendChatTyping(true);
        }
    };

    return (
        <div className={`flex ${
            mobileView === 'chat'
                ? 'h-[calc(100dvh-3.5rem)]'
                : 'h-[calc(100dvh-7.5rem)]'
        } lg:h-screen max-w-7xl mx-auto overflow-hidden border-x border-white/[0.08] bg-[#07070d]`}>
            {/* Conversations Sidebar Column */}
            <div
                className={`
                    w-full md:w-80 lg:w-96 flex-shrink-0 h-full border-r border-white/[0.08]
                    ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}
                `}
            >
                <ConversationSidebar
                    conversations={conversations}
                    selectedConvoId={selectedConvo?.id || null}
                    onSelectConvo={(convo) => handleSelectConvo(convo, { pushHistory: true })}
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
                            onRetryMessage={handleRetryMessage}
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
