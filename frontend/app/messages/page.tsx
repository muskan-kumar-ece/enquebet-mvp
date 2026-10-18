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

        try {
            const msgs = await api.getMessages(convo.id);
            setMessages(msgs);
        } catch {
            toast.error('Failed to load messages');
        }

        // Connect WebSocket and send initial read receipt
        connectChat(convo.id);
        sendChatRead();
    };

    // WebSocket Incoming Messages
    useEffect(() => {
        if (!selectedConvo) return;
        const unsub = onChatMessage((data) => {
            if (data.message) {
                setMessages((prev) => {
                    const exists = prev.some((m) => m.id === data.message.id);
                    return exists ? prev : [...prev, data.message];
                });
                // Update last message in sidebar
                setConversations((prev) =>
                    prev.map((c) => (c.id === selectedConvo.id ? { ...c, last_message: data.message } : c))
                );
            }
        });
        return unsub;
    }, [selectedConvo, onChatMessage]);

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

    // Send Message
    const handleSendMessage = async (content: string, attachmentUrl?: string) => {
        if (!selectedConvo) return;
        try {
            const sentMessage = await api.sendMessage(selectedConvo.id, content, attachmentUrl);
            setMessages((prev) => {
                const exists = prev.some((m) => m.id === sentMessage.id);
                return exists ? prev : [...prev, sentMessage];
            });

            // Update sidebar preview
            setConversations((prev) =>
                prev.map((c) => (c.id === selectedConvo.id ? { ...c, last_message: sentMessage } : c))
            );
        } catch (err: any) {
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
