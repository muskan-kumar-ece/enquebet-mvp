/**
 * WebSocketManager — manages a single WebSocket connection with:
 * - Ephemeral single-use ticket auth (?ticket=...) or JWT token fallback (?token=...)
 * - Auto-reconnect with exponential backoff & fresh ticket retrieval
 * - Simple pub/sub event system
 */

import { api } from '@/lib/api';

type EventHandler = (data: any) => void;

export class WebSocketManager {
    private url: string;
    private urlBuilder: (() => Promise<string> | string) | null;
    private ws: WebSocket | null = null;
    private handlers: Map<string, Set<EventHandler>> = new Map();
    private reconnectDelay = 1000;
    private maxReconnectDelay = 30000;
    private shouldReconnect = true;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(url: string, urlBuilder?: () => Promise<string> | string) {
        this.url = url;
        this.urlBuilder = urlBuilder || null;
    }

    private async _getUrl(): Promise<string> {
        // On reconnect, rebuild the URL to pick up a fresh single-use ticket
        if (this.urlBuilder) {
            try {
                this.url = await Promise.resolve(this.urlBuilder());
            } catch (err) {
                console.warn('[WS] Error building dynamic URL, using cached url:', err);
            }
        }
        return this.url;
    }

    async connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        this.shouldReconnect = true;
        await this._createSocket();
    }

    private async _createSocket() {
        try {
            const resolvedUrl = await this._getUrl();
            this.ws = new WebSocket(resolvedUrl);

            this.ws.onopen = () => {
                this.reconnectDelay = 1000; // reset backoff
                this._emit('connected', {});
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const type = data.type || 'message';
                    this._emit(type, data);
                    this._emit('*', data); // wildcard listener
                } catch {
                    // Non-JSON message, ignore
                }
            };

            this.ws.onclose = (event) => {
                this._emit('disconnected', { code: event.code });
                if (this.shouldReconnect && event.code !== 4001 && event.code !== 4003) {
                    this._scheduleReconnect();
                }
            };

            this.ws.onerror = () => {
                this._emit('error', {});
            };
        } catch (err) {
            console.error('[WS] Failed to create socket:', err);
            if (this.shouldReconnect) {
                this._scheduleReconnect();
            }
        }
    }

    private _scheduleReconnect() {
        if (this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            await this._createSocket();
        }, this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    }

    send(data: object) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn('[WS] Cannot send — not connected');
        }
    }

    on(event: string, handler: EventHandler): () => void {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event)!.add(handler);
        // Return unsubscribe function
        return () => this.off(event, handler);
    }

    off(event: string, handler: EventHandler) {
        this.handlers.get(event)?.delete(handler);
    }

    private _emit(event: string, data: any) {
        this.handlers.get(event)?.forEach((fn) => fn(data));
    }

    disconnect() {
        this.shouldReconnect = false;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.ws?.close();
        this.ws = null;
    }

    get isConnected() {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

/** Build WS URL with ticket or JWT token fallback */
export function buildWsUrl(path: string, options?: { ticket?: string; token?: string }): string {
    const ticket = options?.ticket;
    const token = options?.token ?? (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);
    const base = (process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8000').replace(/\/+$/, '');
    const cleanPath = path.replace(/^\//, '');
    const url = `${base}/${cleanPath}`;

    if (ticket) {
        return `${url}?ticket=${encodeURIComponent(ticket)}`;
    }
    return token ? `${url}?token=${encodeURIComponent(token)}` : url;
}

/** Resolves an authenticated WS URL using a fresh ephemeral ticket if available, else falling back to token */
export async function resolveSecureWsUrl(path: string): Promise<string> {
    try {
        const ticketRes = await api.getWsTicket();
        if (ticketRes?.ticket) {
            return buildWsUrl(path, { ticket: ticketRes.ticket });
        }
    } catch {
        // Fallback to token
    }
    return buildWsUrl(path);
}
