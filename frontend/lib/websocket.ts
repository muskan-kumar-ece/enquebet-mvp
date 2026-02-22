/**
 * WebSocketManager — manages a single WebSocket connection with:
 * - JWT token auth via query string (?token=...)
 * - Auto-reconnect with exponential backoff
 * - Simple pub/sub event system
 */

type EventHandler = (data: any) => void;

export class WebSocketManager {
    private url: string;
    private urlBuilder: (() => string) | null;
    private ws: WebSocket | null = null;
    private handlers: Map<string, Set<EventHandler>> = new Map();
    private reconnectDelay = 1000;
    private maxReconnectDelay = 30000;
    private shouldReconnect = true;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(url: string, urlBuilder?: () => string) {
        this.url = url;
        this.urlBuilder = urlBuilder || null;
    }

    private _getUrl(): string {
        // On reconnect, rebuild the URL to pick up a fresh token
        if (this.urlBuilder) {
            this.url = this.urlBuilder();
        }
        return this.url;
    }

    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        this.shouldReconnect = true;
        this._createSocket();
    }

    private _createSocket() {
        try {
            this.ws = new WebSocket(this._getUrl());

            this.ws.onopen = () => {
                console.log('[WS] Connected:', this.url);
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
                console.log('[WS] Closed:', event.code, event.reason);
                this._emit('disconnected', { code: event.code });
                if (this.shouldReconnect && event.code !== 4001 && event.code !== 4003) {
                    this._scheduleReconnect();
                }
            };

            this.ws.onerror = () => {
                // WS errors are non-fatal — connection will be retried automatically
                console.warn('[WS] Connection error, will retry...');
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
        console.log(`[WS] Reconnecting in ${this.reconnectDelay}ms...`);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this._createSocket();
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

/** Build WS URL with JWT token in query string */
export function buildWsUrl(path: string): string {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const base = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8000';
    const url = `${base}/${path.replace(/^\//, '')}`;
    return token ? `${url}?token=${encodeURIComponent(token)}` : url;
}
