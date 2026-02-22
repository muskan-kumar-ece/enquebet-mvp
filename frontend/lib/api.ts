// API Configuration
// On Windows, `localhost` may resolve to IPv6 (`::1`) first; if the backend binds only to IPv4
// (127.0.0.1), browser fetches can hang. Default to IPv4 loopback for reliability.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

// API utility functions
class ApiClient {
    private baseUrl: string;
    private token: string | null = null;
    private refreshPromise: Promise<string | null> | null = null;
    private timeoutMs: number;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
        // Avoid infinite hangs when the backend wedges (common in local/dev E2E runs).
        // Keep this reasonably low so the UI can surface an error and recover.
        this.timeoutMs = Number.isFinite(Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS))
            ? Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS)
            : 15_000;
        // Load token from localStorage if available
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('accessToken');
        }
    }

    private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
        const controller = new AbortController();

        // Respect an upstream signal if provided.
        if (options.signal) {
            if (options.signal.aborted) {
                controller.abort();
            } else {
                options.signal.addEventListener('abort', () => controller.abort(), { once: true });
            }
        }

        const timeoutId = setTimeout(() => {
            controller.abort();
        }, this.timeoutMs);

        try {
            return await fetch(url, {
                ...options,
                signal: controller.signal,
            });
        } catch (err: any) {
            if (err?.name === 'AbortError') {
                throw new Error('Request timed out');
            }
            throw err;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    setToken(token: string) {
        this.token = token;
        if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', token);
        }
    }

    clearToken() {
        this.token = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
        }
    }

    private getRefreshToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('refreshToken');
    }

    private async refreshAccessToken(): Promise<string | null> {
        if (this.refreshPromise) return this.refreshPromise;

        const refresh = this.getRefreshToken();
        if (!refresh) return null;

        this.refreshPromise = (async () => {
            try {
                const response = await this.fetchWithTimeout(`${this.baseUrl}/auth/refresh/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh }),
                });

                if (!response.ok) {
                    this.clearToken();
                    return null;
                }

                const data = await response.json();
                if (data?.access) {
                    this.setToken(data.access);
                }
                if (typeof window !== 'undefined' && data?.refresh) {
                    localStorage.setItem('refreshToken', data.refresh);
                }
                return data?.access ?? null;
            } catch {
                this.clearToken();
                return null;
            } finally {
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
    }

    private async request<T>(endpoint: string, options: RequestInit = {}, retry = true): Promise<T> {
        const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

        const headers: Record<string, string> = {
            ...(options.headers as Record<string, string>),
        };

        // Only set JSON Content-Type when we are not sending FormData.
        // For FormData, the browser will set the correct multipart boundary.
        if (!isFormData && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await this.fetchWithTimeout(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
        });

        if (response.status === 401 && retry) {
            const isAuthEndpoint = endpoint.startsWith('/auth/login/') ||
                endpoint.startsWith('/auth/register/') ||
                endpoint.startsWith('/auth/refresh/');

            if (!isAuthEndpoint && this.getRefreshToken()) {
                const newAccess = await this.refreshAccessToken();
                if (newAccess) {
                    return this.request<T>(endpoint, options, false);
                }
            }
        }

        if (!response.ok) {
            let errorMessage = 'API request failed';
            try {
                const error = await response.json();
                if (typeof error === 'string') {
                    errorMessage = error;
                } else if (error.detail) {
                    errorMessage = error.detail;
                } else if (error.message) {
                    errorMessage = error.message;
                } else if (error.error) {
                    errorMessage = error.error;
                } else {
                    // DRF field-level errors: { email: ["already exists"], password: [...] }
                    const fieldErrors = Object.entries(error)
                        .map(([field, msgs]) => {
                            const msg = Array.isArray(msgs) ? msgs[0] : msgs;
                            return `${field}: ${msg}`;
                        })
                        .join(' | ');
                    if (fieldErrors) errorMessage = fieldErrors;
                }
            } catch {
                // response body wasn't JSON
            }
            throw new Error(errorMessage);
        }

        if (response.status === 204) {
            return undefined as T;
        }

        // Some endpoints may return an empty body.
        const text = await response.text();
        if (!text) return undefined as T;
        try {
            return JSON.parse(text);
        } catch {
            return text as unknown as T;
        }
    }

    // Auth endpoints
    async register(data: { email: string; username: string; full_name: string; password: string; password_confirm: string }) {
        return this.request<{ user: any; access: string; refresh: string }>('/auth/register/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async login(data: { email: string; password: string }) {
        return this.request<{ user: any; access: string; refresh: string }>('/auth/login/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getProfile() {
        return this.request<any>('/auth/profile/');
    }

    async logout(refresh: string) {
        return this.request<void>('/auth/logout/', {
            method: 'POST',
            body: JSON.stringify({ refresh }),
        });
    }

    // Posts endpoints
    async createPost(data: {
        title: string;
        description: string;
        category: string;
        view_type: string;
        location?: string;
        requirements?: string[];
        tags?: string[];
        media?: File[];
    }) {
        if (data.media && data.media.length > 0) {
            const formData = new FormData();
            formData.append('title', data.title);
            formData.append('description', data.description);
            formData.append('category', data.category);
            formData.append('view_type', data.view_type);
            if (data.location) formData.append('location', data.location);

            // Send arrays as JSON strings to keep parsing consistent for multipart.
            if (data.requirements?.length) {
                formData.append('requirements', JSON.stringify(data.requirements));
            }
            if (data.tags?.length) {
                formData.append('tags', JSON.stringify(data.tags));
            }

            for (const file of data.media) {
                formData.append('media', file);
            }

            return this.request<any>('/posts/create/', {
                method: 'POST',
                body: formData,
            });
        }

        return this.request<any>('/posts/create/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async toggleLike(postId: string) {
        return this.request<{ liked: boolean }>(`/posts/${postId}/like/`, {
            method: 'POST',
        });
    }

    async followUser(targetUserId: string) {
        return this.request<{ following: boolean; followers_count?: number; following_count?: number }>(`/users/${targetUserId}/follow/`, {
            method: 'POST',
        });
    }

    async unfollowUser(targetUserId: string) {
        // Prefer spec endpoint (POST /users/:id/unfollow/). If it fails for some reason,
        // callers can still fall back to DELETE /users/:id/follow/ (kept on backend).
        return this.request<{ following: boolean; followers_count?: number; following_count?: number }>(`/users/${targetUserId}/unfollow/`, {
            method: 'POST',
        });
    }

    async getFollowStatus(targetUserId: string) {
        return this.request<{ following: boolean; self?: boolean }>(`/users/${targetUserId}/follow-status/`);
    }

    async getFollowers(targetUserId: string) {
        return this.request<{ count: number; results: any[] }>(`/users/${targetUserId}/followers/`);
    }

    async getFollowing(targetUserId: string) {
        return this.request<{ count: number; results: any[] }>(`/users/${targetUserId}/following/`);
    }

    async reportPost(postId: string, reason?: string) {
        return this.request<{ reported: boolean }>(`/posts/${postId}/report/`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    }



    async getPosts(params?: { view_type?: string; category?: string; location?: string; page?: number }) {
        const queryParams = new URLSearchParams();
        // Map view_type to feed filter param
        if (params?.view_type) queryParams.append('filter', params.view_type);
        if (params?.category) queryParams.append('category', params.category);
        if (params?.location) queryParams.append('location', params.location);
        if (params?.page && params.page > 1) queryParams.append('page', String(params.page));

        const query = queryParams.toString();
        return this.request<any>(`/posts/feed/${query ? '?' + query : ''}`);
    }

    async getPost(postId: string) {
        return this.request<any>(`/posts/${postId}/`);
    }

    async updateProfile(data: any) {
        // If data contains a File (resume_file), use FormData for multipart upload
        if (data.resume_file instanceof File) {
            const formData = new FormData();
            for (const [key, value] of Object.entries(data)) {
                if (value === undefined || value === null) continue;
                if (value instanceof File) {
                    formData.append(key, value);
                } else if (Array.isArray(value) || typeof value === 'object') {
                    formData.append(key, JSON.stringify(value));
                } else {
                    formData.append(key, String(value));
                }
            }
            return this.request<any>('/auth/profile/', {
                method: 'PATCH',
                body: formData,
            });
        }
        return this.request<any>('/auth/profile/', {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async updateMe(data: any) {
        return this.request<any>('/users/me/', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteMe() {
        return this.request<void>('/users/me/', {
            method: 'DELETE',
        });
    }

    async changeMyPassword(current_password: string, new_password: string) {
        return this.request<{ message: string }>('/users/me/password/', {
            method: 'PUT',
            body: JSON.stringify({ current_password, new_password }),
        });
    }

    async deleteMyPosts() {
        return this.request<{ deleted: number }>('/users/me/posts/', {
            method: 'DELETE',
        });
    }

    async getUser(userId: string) {
        return this.request<any>(`/users/${userId}/`);
    }

    async getUserPosts(userId: string) {
        const data = await this.request<any>(`/users/${userId}/posts/`);
        return Array.isArray(data) ? data : (data.results ?? []);
    }

    async search(query: string, opts?: { type?: 'all' | 'users' | 'posts' }) {
        const params = new URLSearchParams({ q: query });
        if (opts?.type) params.append('type', opts.type);
        return this.request<{ users: any[]; posts: any[] }>(`/search/?${params}`);
    }

    async getComments(postId: string) {
        const data = await this.request<any>(`/posts/${postId}/comments/`);
        return Array.isArray(data) ? data : (data.results ?? []);
    }

    async addComment(postId: string, content: string) {
        return this.request<any>(`/posts/${postId}/comments/`, {
            method: 'POST',
            body: JSON.stringify({ content }),
        });
    }

    async deleteComment(postId: string, commentId: string) {
        return this.request<any>(`/posts/${postId}/comments/${commentId}/`, {
            method: 'DELETE',
        });
    }

    // Collaboration endpoints
    async sendCollaborationRequest(postId: string, message?: string) {
        return this.request<any>('/collaboration/request/', {
            method: 'POST',
            body: JSON.stringify({ post_id: postId, message }),
        });
    }

    async acceptCollaborationRequest(requestId: string) {
        return this.request<{ message: string; group_chat_id: string }>(`/collaboration/request/${requestId}/accept/`, {
            method: 'POST',
        });
    }

    async declineCollaborationRequest(requestId: string) {
        return this.request<{ message: string }>(`/collaboration/request/${requestId}/decline/`, {
            method: 'POST',
        });
    }

    async getCollaborationRequests() {
        const data = await this.request<any>('/collaboration/my-requests/');
        return Array.isArray(data) ? data : (data.results ?? []);
    }

    // Notifications
    async getNotifications() {
        const data = await this.request<any>('/notifications/');
        return Array.isArray(data) ? data : (data.results ?? []);
    }

    async markAsRead(notificationId: string) {
        return this.request<any>(`/notifications/${notificationId}/mark-read/`, {
            method: 'POST',
        });
    }

    async markAllRead() {
        return this.request<{ message: string; updated: number }>('/notifications/read-all/', {
            method: 'PUT',
        });
    }

    // Save/Bookmark post
    async savePost(postId: string) {
        return this.request<{ saved: boolean }>(`/posts/${postId}/save/`, {
            method: 'POST',
        });
    }

    async getSavedPosts() {
        const data = await this.request<any>('/posts/saved/');
        return Array.isArray(data) ? data : (data.results ?? []);
    }

    // Messages/Chats
    async startDM(targetUserId: string) {
        return this.request<{ conversation_id: string }>('/chats/start-dm/', {
            method: 'POST',
            body: JSON.stringify({ user_id: targetUserId }),
        });
    }

    async getConversations() {
        const data = await this.request<any>('/chats/conversations/');
        return Array.isArray(data) ? data : (data.results ?? []);
    }

    async getMessages(conversationId: string) {
        const data = await this.request<any>(`/chats/conversations/${conversationId}/messages/`);
        return Array.isArray(data) ? data : (data.results ?? []);
    }

    async sendMessage(conversationId: string, content: string) {
        return this.request<any>(`/chats/conversations/${conversationId}/messages/`, {
            method: 'POST',
            body: JSON.stringify({ content }),
        });
    }
}

export const api = new ApiClient(API_BASE_URL);
