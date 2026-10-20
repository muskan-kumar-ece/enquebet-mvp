"use client";

import { useEffect, useRef, useCallback, useState } from 'react';
import { resolveSecureWsUrl } from '@/lib/websocket';

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
    const connectRef = useRef<() => Promise<void>>(() => Promise.resolve());
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        onEventRef.current = onEvent;
    }, [onEvent]);

    const connect = useCallback(async () => {
        if (!enabled || !workspaceId || typeof window === 'undefined') return;

        const token = localStorage.getItem('accessToken');
        if (!token) return;

        // Clean up previous socket if any
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }

        try {
            const wsUrl = await resolveSecureWsUrl(`ws/workspace/${workspaceId}/`);
            const ws = new WebSocket(wsUrl);
            socketRef.current = ws;

            ws.onopen = () => {
                retryCountRef.current = 0;
                setIsConnected(true);
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
                setIsConnected(false);
                // If closed due to auth or forbidden, don't retry endlessly
                if (event.code === 4001 || event.code === 4003) {
                    return;
                }

                // Exponential backoff reconnect
                if (retryCountRef.current < 8) {
                    const timeout = Math.min(1000 * Math.pow(1.5, retryCountRef.current), 10000);
                    retryCountRef.current += 1;
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connectRef.current();
                    }, timeout);
                }
            };

            ws.onerror = () => {
                setIsConnected(false);
                ws.close();
            };
        } catch {
            // WebSocket initialization failed
        }
    }, [workspaceId, enabled]);

    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

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
        isConnected,
    };
}
