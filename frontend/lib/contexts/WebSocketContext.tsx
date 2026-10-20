"use client";

import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    ReactNode,
    useCallback,
} from 'react';
import { WebSocketManager, resolveSecureWsUrl } from '@/lib/websocket';
import { api } from '@/lib/api';

interface WebSocketContextType {
    /** Subscribe to notification events. Returns unsubscribe fn. */
    onNotification: (handler: (data: any) => void) => () => void;
    /** Subscribe to chat messages for the currently connected room. Returns unsubscribe fn. */
    onChatMessage: (handler: (data: any) => void) => () => void;
    /** Subscribe to typing events in the current room */
    onChatTyping: (handler: (data: any) => void) => () => void;
    /** Subscribe to read receipt events in the current room */
    onChatRead: (handler: (data: any) => void) => () => void;
    /** Connect chat WS to a specific conversation */
    connectChat: (conversationId: string) => void;
    /** Send a chat message to the currently connected conversation */
    sendChatMessage: (content: string, attachment_url?: string, client_msg_id?: string) => void;
    /** Broadcast typing indicator */
    sendChatTyping: (isTyping: boolean) => void;
    /** Send read receipt */
    sendChatRead: () => void;
    /** Total unread notification count (for badge) */
    unreadCount: number;
    /** High-priority action-required notification count */
    actionCount: number;
    /** Mark all notifications as read in database and broadcast across all tabs */
    clearUnread: () => Promise<void>;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

function isWebSocketDisabled(): boolean {
    try {
        return typeof window !== 'undefined' && localStorage.getItem('disableWS') === '1';
    } catch {
        return false;
    }
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
    const notifWS = useRef<WebSocketManager | null>(null);
    const chatWS = useRef<WebSocketManager | null>(null);
    const currentConvoId = useRef<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [actionCount, setActionCount] = useState(0);

    // Initial fetch of unread count on mount
    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        if (!token) return;

        api.getUnreadNotificationCount()
            .then((res) => {
                if (res) {
                    setUnreadCount(Number(res.unread_count ?? 0));
                    setActionCount(Number(res.action_count ?? 0));
                }
            })
            .catch(() => { });
    }, []);

    // Connect notification WS on mount (if token is available)
    useEffect(() => {
        if (isWebSocketDisabled()) return;
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        if (!token) return;

        const wsUrlBuilder = () => resolveSecureWsUrl('ws/notifications/');
        const ws = new WebSocketManager('', wsUrlBuilder);
        notifWS.current = ws;
        ws.connect();

        // Increment badge or refresh count on new notification
        const unsubNew = ws.on('notification', () => {
            api.getUnreadNotificationCount()
                .then((res) => {
                    if (res) {
                        setUnreadCount(Number(res.unread_count ?? 0));
                        setActionCount(Number(res.action_count ?? 0));
                    }
                })
                .catch(() => setUnreadCount((c) => c + 1));
        });

        // Listen for server canonical count broadcasts
        const unsubCount = ws.on('unread_count_updated', (data: any) => {
            if (data) {
                setUnreadCount(Number(data.unread_count ?? 0));
                if (data.action_count !== undefined) {
                    setActionCount(Number(data.action_count ?? 0));
                }
            }
        });

        // Cross-tab mark-all-read synchronization
        const unsubAllRead = ws.on('all_read', () => {
            setUnreadCount(0);
            setActionCount(0);
        });

        // Read or removed events
        const unsubRead = ws.on('notification_read', () => {
            setUnreadCount((c) => Math.max(0, c - 1));
        });

        const unsubRemoved = ws.on('notification_removed', () => {
            setUnreadCount((c) => Math.max(0, c - 1));
        });

        return () => {
            unsubNew();
            unsubCount();
            unsubAllRead();
            unsubRead();
            unsubRemoved();
            ws.disconnect();
            notifWS.current = null;
        };
    }, []);

    const onNotification = useCallback((handler: (data: any) => void) => {
        if (!notifWS.current) return () => { };
        const unsubNew = notifWS.current.on('notification', handler);
        const unsubUpd = notifWS.current.on('notification_updated', handler);
        return () => {
            unsubNew();
            unsubUpd();
        };
    }, []);

    const connectChat = useCallback((conversationId: string) => {
        if (isWebSocketDisabled()) return;
        if (currentConvoId.current === conversationId && chatWS.current?.isConnected) return;

        chatWS.current?.disconnect();
        currentConvoId.current = conversationId;

        const chatUrlBuilder = () => resolveSecureWsUrl(`ws/chat/${conversationId}/`);
        const ws = new WebSocketManager('', chatUrlBuilder);
        chatWS.current = ws;
        ws.connect();
    }, []);

    const onChatMessage = useCallback((handler: (data: any) => void) => {
        if (!chatWS.current) return () => { };
        return chatWS.current.on('chat_message', handler);
    }, []);

    const onChatTyping = useCallback((handler: (data: any) => void) => {
        if (!chatWS.current) return () => { };
        return chatWS.current.on('chat_typing', handler);
    }, []);

    const onChatRead = useCallback((handler: (data: any) => void) => {
        if (!chatWS.current) return () => { };
        return chatWS.current.on('chat_read', handler);
    }, []);

    const sendChatMessage = useCallback((content: string, attachment_url?: string, client_msg_id?: string) => {
        chatWS.current?.send({ content, attachment_url, client_msg_id });
    }, []);

    const sendChatTyping = useCallback((isTyping: boolean) => {
        chatWS.current?.send({ type: 'typing', is_typing: isTyping });
    }, []);

    const sendChatRead = useCallback(() => {
        chatWS.current?.send({ type: 'read' });
    }, []);

    const clearUnread = useCallback(async () => {
        setUnreadCount(0);
        setActionCount(0);
        try {
            await api.markAllRead();
        } catch (err) {
            console.error('Failed to mark all notifications read:', err);
        }
    }, []);

    return (
        <WebSocketContext.Provider
            value={{
                onNotification,
                onChatMessage,
                onChatTyping,
                onChatRead,
                connectChat,
                sendChatMessage,
                sendChatTyping,
                sendChatRead,
                unreadCount,
                actionCount,
                clearUnread,
            }}
        >
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocket() {
    const ctx = useContext(WebSocketContext);
    if (!ctx) throw new Error('useWebSocket must be used within WebSocketProvider');
    return ctx;
}
