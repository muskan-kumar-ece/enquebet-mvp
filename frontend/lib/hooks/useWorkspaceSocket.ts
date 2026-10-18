"use client";

import { useEffect, useRef, useCallback } from 'react';

interface UseWorkspaceSocketProps {
    workspaceId: string;
    onEvent?: (eventType: string, data: any, actorId?: string) => void;
    enabled?: boolean;
}

export function useWorkspaceSocket({
    workspaceId,
    onEvent,
    enabled = true
}: UseWorkspaceSocketProps) {
    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const retryCountRef = useRef(0);
    const onEventRef = useRef(onEvent);

    useEffect(() => {
        onEventRef.current = onEvent;
    }, [onEvent]);

    const connect = useCallback(() => {
        if (!enabled || !workspaceId || typeof window === 'undefined') return;

        const token = localStorage.getItem('accessToken');
        if (!token) return;

        // Clean up previous socket if any
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // In local development or staging, connect to backend URL
        const backendHost = process.env.NEXT_PUBLIC_API_URL
            ? process.env.NEXT_PUBLIC_API_URL.replace(/^http(s)?:\/\//, '').replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '')
            : window.location.host;

        const wsUrl = `${protocol}//${backendHost}/ws/workspace/${workspaceId}/?token=${encodeURIComponent(token)}`;

        try {
            const ws = new WebSocket(wsUrl);
            socketRef.current = ws;

            ws.onopen = () => {
                retryCountRef.current = 0;
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.type === 'workspace_event' && onEventRef.current) {
                        onEventRef.current(message.event_type, message.data, message.actor_id);
                    }
                } catch {
                    // Ignore non-json frames
                }
            };

            ws.onclose = (event) => {
                // If closed due to auth or forbidden, don't retry endlessly
                if (event.code === 4001 || event.code === 4003) {
                    return;
                }

                // Exponential backoff reconnect
                if (retryCountRef.current < 8) {
                    const timeout = Math.min(1000 * Math.pow(1.5, retryCountRef.current), 10000);
                    retryCountRef.current += 1;
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, timeout);
                }
            };

            ws.onerror = () => {
                ws.close();
            };
        } catch {
            // WebSocket initialization failed
        }
    }, [workspaceId, enabled]);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }
        };
    }, [connect]);

    return {
        isConnected: socketRef.current?.readyState === WebSocket.OPEN,
    };
}
