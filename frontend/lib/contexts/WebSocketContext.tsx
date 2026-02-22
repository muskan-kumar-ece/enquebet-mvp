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
import { WebSocketManager, buildWsUrl } from '@/lib/websocket';

interface WebSocketContextType {
    /** Subscribe to notification events. Returns unsubscribe fn. */
    onNotification: (handler: (data: any) => void) => () => void;
    /** Subscribe to chat messages for the currently connected room. Returns unsubscribe fn. */
    onChatMessage: (handler: (data: any) => void) => () => void;
    /** Connect chat WS to a specific conversation */
    connectChat: (conversationId: string) => void;
    /** Send a chat message to the currently connected conversation */
    sendChatMessage: (content: string) => void;
    /** Total unread notification count (for badge) */
    unreadCount: number;
    /** Call when notifications are viewed to reset badge */
    clearUnread: () => void;
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

    // Connect notification WS on mount (if token is available)
    useEffect(() => {
        if (isWebSocketDisabled()) return;
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const wsUrlBuilder = () => buildWsUrl('ws/notifications/');
        const ws = new WebSocketManager(wsUrlBuilder(), wsUrlBuilder);
        notifWS.current = ws;
        ws.connect();

        // Increment badge on each new notification
        const unsub = ws.on('notification', () => {
            setUnreadCount((c) => c + 1);
        });

        return () => {
            unsub();
            ws.disconnect();
            notifWS.current = null;
        };
    }, []);

    const onNotification = useCallback((handler: (data: any) => void) => {
        if (!notifWS.current) return () => { };
        return notifWS.current.on('notification', handler);
    }, []);

    const connectChat = useCallback((conversationId: string) => {
        if (isWebSocketDisabled()) return;
        // Don't reconnect if same conversation
        if (currentConvoId.current === conversationId && chatWS.current?.isConnected) return;

        // Disconnect previous chat WS
        chatWS.current?.disconnect();
        currentConvoId.current = conversationId;

        const chatUrlBuilder = () => buildWsUrl(`ws/chat/${conversationId}/`);
        const ws = new WebSocketManager(chatUrlBuilder(), chatUrlBuilder);
        chatWS.current = ws;
        ws.connect();
    }, []);

    const onChatMessage = useCallback((handler: (data: any) => void) => {
        if (!chatWS.current) return () => { };
        return chatWS.current.on('chat_message', handler);
    }, []);

    const sendChatMessage = useCallback((content: string) => {
        chatWS.current?.send({ content });
    }, []);

    const clearUnread = useCallback(() => setUnreadCount(0), []);

    return (
        <WebSocketContext.Provider
            value={{
                onNotification,
                onChatMessage,
                connectChat,
                sendChatMessage,
                unreadCount,
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
