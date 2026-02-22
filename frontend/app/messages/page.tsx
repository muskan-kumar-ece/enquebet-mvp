"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, Search, ArrowLeft, Users, MessageSquare } from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { useWebSocket } from '@/lib/contexts/WebSocketContext';
import toast from 'react-hot-toast';

function MessagesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useRequireAuth();
    const { connectChat, onChatMessage } = useWebSocket();

    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedConvo, setSelectedConvo] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchConversations();
        }
    }, [authLoading, user]);

    // If redirected here from post page with ?convo=UUID, auto-open that conversation
    useEffect(() => {
        const convoId = searchParams.get('convo');
        if (convoId && conversations.length > 0) {
            const target = conversations.find((c) => c.id === convoId);
            if (target) {
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

        try {
            const msgs = await api.getMessages(convo.id);
            setMessages(msgs);
        } catch (err: any) {
            toast.error('Failed to load messages');
        }

        connectChat(convo.id);
    };

    // Real-time WS incoming messages
    useEffect(() => {
        if (!selectedConvo) return;
        const unsub = onChatMessage((data) => {
            if (data.message) {
                setMessages((prev) => {
                    const exists = prev.some((m) => m.id === data.message.id);
                    return exists ? prev : [...prev, data.message];
                });
            }
        });
        return unsub;
    }, [selectedConvo, onChatMessage]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConvo) return;

        setSending(true);
        try {
            const sentMessage = await api.sendMessage(selectedConvo.id, newMessage);
            setMessages((prev) => [...prev, sentMessage]);
            setNewMessage('');
        } catch (err: any) {
            toast.error(err.message || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    // Helper: get a display name for a conversation
    const getConvoName = (convo: any) => {
        if (convo.name) return convo.name;
        // For 1-on-1 DMs, show the other person's name
        const otherMember = convo.members?.find((m: any) => m.id !== user?.id);
        return otherMember?.full_name || otherMember?.username || 'Direct Message';
    };

    const getConvoInitial = (convo: any) => getConvoName(convo)[0]?.toUpperCase() || 'C';

    const filteredConvos = conversations.filter((c) =>
        getConvoName(c).toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-text-secondary animate-pulse">Loading messages...</div>
            </div>
        );
    }

    return (
        <div className="h-screen flex overflow-hidden">
            {/* ── Sidebar: Conversation List ── */}
            <div
                className={`
                    w-full md:w-80 border-r border-border-default bg-bg-primary flex flex-col
                    ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}
                `}
            >
                {/* Header */}
                <div className="p-4 border-b border-border-default shrink-0">
                    <h1 className="text-2xl font-bold mb-4">Messages</h1>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search conversations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input w-full pl-10"
                        />
                    </div>
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto">
                    {error ? (
                        <div className="p-4 text-center">
                            <p className="text-red-500 mb-2">{error}</p>
                            <button onClick={fetchConversations} className="btn-primary text-sm">Retry</button>
                        </div>
                    ) : filteredConvos.length === 0 ? (
                        <div className="p-8 text-center text-text-secondary">
                            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium mb-1">No conversations yet</p>
                            <p className="text-sm">
                                Message someone by clicking "Message" on their post
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border-default">
                            {filteredConvos.map((convo) => (
                                <button
                                    key={convo.id}
                                    onClick={() => handleSelectConvo(convo)}
                                    className={`w-full p-4 text-left hover:bg-bg-hover transition-colors ${selectedConvo?.id === convo.id ? 'bg-bg-hover border-l-2 border-purple' : ''
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Avatar */}
                                        <div className="w-12 h-12 rounded-full bg-purple shrink-0 flex items-center justify-center font-bold">
                                            {getConvoInitial(convo)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <h3 className="font-semibold truncate text-sm">{getConvoName(convo)}</h3>
                                                <span className="text-text-muted text-xs shrink-0 ml-2">
                                                    {convo.last_message
                                                        ? new Date(convo.last_message.created_at).toLocaleDateString()
                                                        : new Date(convo.updated_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-text-secondary text-xs truncate">
                                                {convo.last_message
                                                    ? `${convo.last_message.sender}: ${convo.last_message.content}`
                                                    : 'No messages yet'}
                                            </p>
                                            {convo.is_group && (
                                                <p className="text-text-muted text-xs mt-0.5 flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {convo.member_count} members
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Chat Area ── */}
            <div className={`
                flex-1 flex flex-col min-w-0
                ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}
            `}>
                {selectedConvo ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-border-default bg-bg-primary flex items-center gap-3 shrink-0">
                            {/* Back button (mobile) */}
                            <button
                                onClick={() => setMobileView('list')}
                                className="md:hidden text-text-secondary hover:text-primary transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="w-10 h-10 rounded-full bg-purple flex items-center justify-center font-bold shrink-0">
                                {getConvoInitial(selectedConvo)}
                            </div>
                            <div>
                                <h2 className="font-bold">{getConvoName(selectedConvo)}</h2>
                                {selectedConvo.is_group && (
                                    <p className="text-text-secondary text-sm">{selectedConvo.member_count} members</p>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.length === 0 && (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-text-secondary text-center">
                                        No messages yet. Say hello! 👋
                                    </p>
                                </div>
                            )}
                            {messages.map((msg) => {
                                const isMe = msg.sender?.id === user?.id || msg.is_me;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex items-end gap-2 max-w-xs sm:max-w-md lg:max-w-lg ${isMe ? 'flex-row-reverse' : ''}`}>
                                            {/* Avatar (for other side) */}
                                            {!isMe && (
                                                <div className="w-8 h-8 rounded-full bg-purple shrink-0 flex items-center justify-center text-sm font-bold mb-4">
                                                    {(msg.sender?.full_name || msg.sender?.username || 'A')[0].toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                {!isMe && (
                                                    <p className="text-text-muted text-xs mb-1 ml-1">
                                                        {msg.sender?.full_name || msg.sender?.username}
                                                    </p>
                                                )}
                                                <div className={`rounded-2xl px-4 py-2.5 ${isMe
                                                        ? 'bg-purple text-white rounded-br-sm'
                                                        : 'bg-bg-card border border-border-default rounded-bl-sm'
                                                    }`}>
                                                    <p className="text-sm leading-relaxed">{msg.content || msg.text}</p>
                                                </div>
                                                <p className={`text-text-muted text-xs mt-1 ${isMe ? 'text-right' : 'ml-1'}`}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <div className="p-4 border-t border-border-default bg-bg-primary shrink-0">
                            <form onSubmit={handleSendMessage} className="flex gap-3">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="input flex-1"
                                    disabled={sending}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(e as any);
                                        }
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || sending}
                                    className="btn-primary px-5 flex items-center gap-2 shrink-0"
                                >
                                    <Send className="w-4 h-4" />
                                    <span className="hidden sm:inline">{sending ? '...' : 'Send'}</span>
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    /* Empty state */
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center px-8">
                            <div className="w-24 h-24 bg-bg-card rounded-full flex items-center justify-center mx-auto mb-4 border border-border-default">
                                <MessageSquare className="w-12 h-12 text-text-secondary" />
                            </div>
                            <h3 className="font-bold text-xl mb-2">Your Messages</h3>
                            <p className="text-text-secondary text-sm max-w-xs">
                                Select a conversation on the left, or go to a post and click <strong>Message</strong> to start a new DM.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function MessagesPage() {
    return (
        <Suspense>
            <MessagesContent />
        </Suspense>
    );
}
