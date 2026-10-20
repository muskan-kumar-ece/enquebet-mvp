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
        this.baseUrl = baseUrl.replace(/\/+$/, '');
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

        const isAuthEndpoint = endpoint.startsWith('/auth/login/') ||
            endpoint.startsWith('/auth/register/') ||
            endpoint.startsWith('/auth/refresh/');

        if (this.token && !isAuthEndpoint) {
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
        this.clearToken();
        return this.request<{ user: any; access: string; refresh: string }>('/auth/register/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async login(data: { email: string; password: string }) {
        this.clearToken();
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

    async getWsTicket(): Promise<{ ticket: string; expires_in: number }> {
        return this.request<{ ticket: string; expires_in: number }>('/auth/ws-ticket/', {
            method: 'POST',
        });
    }

    // Posts endpoints
    async createPost(data: {
        title: string;
        description: string;
        category: string;
        view_type: string;
        location?: string;
        college?: string;
        city?: string;
        latitude?: number;
        longitude?: number;
        is_remote?: boolean;
        requirements?: string[];
        tags?: string[];
        media?: File[];
        client_post_id?: string;
    }) {
        const headers: Record<string, string> = {};
        if (data.client_post_id) {
            headers['Idempotency-Key'] = data.client_post_id;
        }

        if (data.media && data.media.length > 0) {
            const formData = new FormData();
            formData.append('title', data.title);
            formData.append('description', data.description);
            formData.append('category', data.category);
            formData.append('view_type', data.view_type);
            if (data.location) formData.append('location', data.location);
            if (data.college) formData.append('college', data.college);
            if (data.city) formData.append('city', data.city);
            if (data.latitude !== undefined && data.latitude !== null) formData.append('latitude', String(data.latitude));
            if (data.longitude !== undefined && data.longitude !== null) formData.append('longitude', String(data.longitude));
            if (data.is_remote !== undefined) formData.append('is_remote', String(data.is_remote));
            if (data.client_post_id) formData.append('client_post_id', data.client_post_id);

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
                headers,
                body: formData,
            });
        }

        return this.request<any>('/posts/create/', {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });
    }

    async toggleLike(postId: string, action?: 'like' | 'unlike' | 'toggle') {
        return this.request<{ liked: boolean; likes_count: number }>(`/posts/${postId}/like/`, {
            method: 'POST',
            body: action ? JSON.stringify({ action }) : undefined,
        });
    }

    async likePost(postId: string, action?: 'like' | 'unlike' | 'toggle') {
        return this.toggleLike(postId, action);
    }

    async ensureLiked(postId: string) {
        return this.request<{ liked: boolean; likes_count: number }>(`/posts/${postId}/like/`, {
            method: 'PUT',
        });
    }

    async ensureUnliked(postId: string) {
        return this.request<{ liked: boolean; likes_count: number }>(`/posts/${postId}/like/`, {
            method: 'DELETE',
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

    async removeFollower(followerId: string) {
        return this.request<{ removed: boolean; follower_id: string; followers_count: number }>(
            `/users/${followerId}/remove-follower/`,
            {
                method: 'POST',
            }
        );
    }

    async reportPost(postId: string, reason?: string) {
        return this.request<{ reported: boolean }>(`/posts/${postId}/report/`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    }



    async getPosts(params?: {
        mode?: string;
        view_type?: string;
        category?: string;
        location?: string;
        lat?: number;
        lng?: number;
        page?: number;
    }) {
        const queryParams = new URLSearchParams();
        if (params?.mode) queryParams.append('mode', params.mode);
        if (params?.view_type) queryParams.append('filter', params.view_type);
        if (params?.category) queryParams.append('category', params.category);
        if (params?.location) queryParams.append('location', params.location);
        if (params?.lat !== undefined && params?.lat !== null) queryParams.append('lat', String(params.lat));
        if (params?.lng !== undefined && params?.lng !== null) queryParams.append('lng', String(params.lng));
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

    async deleteMeSecurely(password: string, confirmPhrase: string) {
        return this.request<void>('/users/me/', {
            method: 'DELETE',
            body: JSON.stringify({ password, confirm_phrase: confirmPhrase }),
        });
    }

    async getUserSessions() {
        const data = await this.request<any>('/users/me/sessions/');
        return Array.isArray(data) ? data : (data.results ?? []);
    }

    async revokeUserSession(sessionId: string) {
        return this.request<void>(`/users/me/sessions/${sessionId}/`, {
            method: 'DELETE',
        });
    }

    async revokeAllOtherSessions() {
        return this.request<{ message: string }>('/users/me/sessions/revoke-others/', {
            method: 'POST',
        });
    }

    async getBlockedUsers() {
        const data = await this.request<any>('/users/me/blocked/');
        return Array.isArray(data) ? data : (data.results ?? []);
    }

    async blockUser(userId: string, reason?: string) {
        return this.request<any>('/users/me/blocked/', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId, reason: reason || '' }),
        });
    }

    async unblockUser(userId: string) {
        return this.request<void>(`/users/me/blocked/${userId}/`, {
            method: 'DELETE',
        });
    }

    async getTimeStats() {
        return this.request<any>('/users/me/time-stats/');
    }

    async getProfessionalStats() {
        return this.request<any>('/users/me/professional-stats/');
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

    async search(query: string, opts?: {
        type?: 'all' | 'users' | 'posts' | 'builders' | 'projects';
        category?: string;
        location?: string;
        college?: string;
        skills?: string;
        role?: string;
        availability?: string;
        verified_only?: boolean;
        sort_by?: string;
        page?: number;
        page_size?: number;
    }) {
        const params = new URLSearchParams();
        if (query) params.append('q', query);
        if (opts?.type) params.append('type', opts.type);
        if (opts?.category && opts.category !== 'all') params.append('category', opts.category);
        if (opts?.location) params.append('location', opts.location);
        if (opts?.college) params.append('college', opts.college);
        if (opts?.skills) params.append('skills', opts.skills);
        if (opts?.role) params.append('role', opts.role);
        if (opts?.availability) params.append('availability', opts.availability);
        if (opts?.verified_only) params.append('verified_only', 'true');
        if (opts?.sort_by) params.append('sort_by', opts.sort_by);
        if (opts?.page && opts.page > 1) params.append('page', String(opts.page));
        if (opts?.page_size) params.append('page_size', String(opts.page_size));

        return this.request<{
            users: any[];
            posts: any[];
            builders: any[];
            projects: any[];
            pagination: {
                page: number;
                page_size: number;
                total_users: number;
                total_posts: number;
                total_pages?: number;
                has_more_users?: boolean;
                has_more_posts?: boolean;
                has_next?: boolean;
                has_prev?: boolean;
            };
        }>(`/search/?${params}`);
    }

    async getSearchSuggestions(query: string) {
        if (!query || query.trim().length < 2) {
            return { skills: [], colleges: [], categories: [], builders: [] };
        }
        return this.request<{
            skills: string[];
            colleges: string[];
            categories: string[];
            builders: Array<{
                id: string;
                username: string;
                full_name: string;
                profile_image?: string;
                headline?: string;
            }>;
        }>(`/search/suggestions/?q=${encodeURIComponent(query.trim())}`);
    }

    async getComments(postId: string) {
        const data = await this.request<any>(`/posts/${postId}/comments/`);
        return Array.isArray(data) ? data : (data.results ?? []);
    }

    async addComment(postId: string, content: string, clientCommentId?: string) {
        return this.request<{
            id: string;
            user: any;
            content: string;
            client_comment_id?: string;
            created_at: string;
            post_comments_count?: number;
        }>(`/posts/${postId}/comments/`, {
            method: 'POST',
            headers: clientCommentId ? { 'Idempotency-Key': clientCommentId } : undefined,
            body: JSON.stringify({
                content,
                ...(clientCommentId ? { client_comment_id: clientCommentId } : {}),
            }),
        });
    }

    async deleteComment(postId: string, commentId: string) {
        return this.request<any>(`/posts/${postId}/comments/${commentId}/`, {
            method: 'DELETE',
        });
    }

    // Collaboration endpoints
    async sendCollaborationRequest(
        postId: string,
        data?: string | {
            message?: string;
            role?: string;
            pitch?: string;
            weekly_commitment?: string;
            portfolio_url?: string;
            client_request_id?: string;
        }
    ) {
        const payload: Record<string, any> = { post_id: postId };
        const headers: Record<string, string> = {};

        if (typeof data === 'string') {
            payload.message = data;
        } else if (data && typeof data === 'object') {
            if (data.message) payload.message = data.message;
            if (data.role) payload.role = data.role;
            if (data.pitch) payload.pitch = data.pitch;
            if (data.weekly_commitment) payload.weekly_commitment = data.weekly_commitment;
            if (data.portfolio_url) payload.portfolio_url = data.portfolio_url;
            if (data.client_request_id) {
                payload.client_request_id = data.client_request_id;
                headers['Idempotency-Key'] = data.client_request_id;
            }
        }

        return this.request<any>('/collaboration/request/', {
            method: 'POST',
            headers: Object.keys(headers).length > 0 ? headers : undefined,
            body: JSON.stringify(payload),
        });
    }

    async acceptCollaborationRequest(requestId: string) {
        return this.request<{ message: string; group_chat_id?: string; workspace_id?: string }>(`/collaboration/request/${requestId}/accept/`, {
            method: 'POST',
        });
    }

    async declineCollaborationRequest(requestId: string) {
        return this.request<{ message: string }>(`/collaboration/request/${requestId}/decline/`, {
            method: 'POST',
        });
    }

    async cancelCollaborationRequest(requestId: string) {
        return this.request<{ message: string; cancelled: boolean }>(`/collaboration/request/${requestId}/cancel/`, {
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

    async getConversations(opts?: { type?: 'dms' | 'groups'; q?: string }) {
        const params = new URLSearchParams();
        if (opts?.type) params.append('type', opts.type);
        if (opts?.q) params.append('q', opts.q);
        const qs = params.toString();
        const data = await this.request<any>(`/chats/conversations/${qs ? '?' + qs : ''}`);
        return Array.isArray(data) ? data : (data.results ?? []);
    }

    async getMessages(conversationId: string, opts?: { page?: number; q?: string; before?: string; limit?: number }) {
        const params = new URLSearchParams();
        if (opts?.page && opts.page > 1) params.append('page', String(opts.page));
        if (opts?.q) params.append('q', opts.q);
        if (opts?.before) params.append('before', opts.before);
        if (opts?.limit) params.append('limit', String(opts.limit));
        const qs = params.toString();
        const data = await this.request<any>(`/chats/conversations/${conversationId}/messages/${qs ? '?' + qs : ''}`);
        return data;
    }

    async sendMessage(conversationId: string, content: string, attachment_url?: string, client_msg_id?: string) {
        return this.request<any>(`/chats/conversations/${conversationId}/messages/`, {
            method: 'POST',
            body: JSON.stringify({ content, attachment_url, client_msg_id }),
        });
    }

    // Workspaces & Project Execution
    async getMyWorkspaces() {
        const data = await this.request<any>('/workspaces/');
        return Array.isArray(data) ? data : (data.results ?? []);
    }

    async getWorkspace(workspaceId: string) {
        return this.request<any>(`/workspaces/${workspaceId}/`);
    }

    async updateWorkspace(workspaceId: string, data: { repo_url?: string; demo_url?: string; documentation_url?: string; max_members?: number }) {
        return this.request<any>(`/workspaces/${workspaceId}/`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async getWorkspaceMembers(workspaceId: string) {
        const data = await this.request<any>(`/workspaces/${workspaceId}/members/`);
        return Array.isArray(data) ? data : (data.results ?? []);
    }

    async updateMemberRole(workspaceId: string, memberId: string, data: { role?: string; role_title?: string }) {
        return this.request<any>(`/workspaces/${workspaceId}/members/${memberId}/role/`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async updateWorkspaceMemberRole(workspaceId: string, memberId: string, data: { role?: string; role_title?: string }) {
        return this.updateMemberRole(workspaceId, memberId, data);
    }

    async leaveWorkspace(workspaceId: string) {
        return this.request<{ message: string }>(`/workspaces/${workspaceId}/members/leave/`, {
            method: 'POST',
        });
    }

    async removeWorkspaceMember(workspaceId: string, memberId: string, reason?: string) {
        return this.request<{ message: string }>(`/workspaces/${workspaceId}/members/${memberId}/remove/`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    }

    async getWorkspaceActivity(workspaceId: string) {
        const data = await this.request<any>(`/workspaces/${workspaceId}/activity/`);
        return Array.isArray(data) ? data : (data.results ?? []);
    }

    async getWorkspaceMilestones(workspaceId: string) {
        const data = await this.request<any>(`/workspaces/${workspaceId}/milestones/`);
        return Array.isArray(data) ? data : (data.results ?? []);
    }

    async createWorkspaceMilestone(workspaceId: string, data: { title: string; description?: string; due_date?: string; order?: number }) {
        return this.request<any>(`/workspaces/${workspaceId}/milestones/`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getWorkspaceTasks(workspaceId: string, filters?: { status?: string; assignee?: string; milestone?: string }) {
        let url = `/workspaces/${workspaceId}/tasks/`;
        if (filters) {
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.assignee) params.append('assignee', filters.assignee);
            if (filters.milestone) params.append('milestone', filters.milestone);
            const qs = params.toString();
            if (qs) url += `?${qs}`;
        }
        const data = await this.request<any>(url);
        return Array.isArray(data) ? data : (data.results ?? []);
    }

    async createWorkspaceTask(workspaceId: string, data: {
        title: string;
        description?: string;
        priority?: string;
        status?: string;
        assignee_id?: string;
        reviewer_id?: string;
        milestone_id?: string;
        due_date?: string;
    }) {
        return this.request<any>(`/workspaces/${workspaceId}/tasks/`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateWorkspaceTask(workspaceId: string, taskId: string, data: any) {
        return this.request<any>(`/workspaces/${workspaceId}/tasks/${taskId}/`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async submitTaskDeliverable(workspaceId: string, taskId: string, data: {
        title?: string;
        description?: string;
        pr_url?: string;
        file_url?: string;
        file_type?: string;
    }) {
        return this.request<any>(`/workspaces/${workspaceId}/tasks/${taskId}/deliverables/`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async reviewTaskDeliverable(workspaceId: string, taskId: string, deliverableId: string, data: {
        verdict: 'approved' | 'changes_requested' | 'rejected';
        feedback?: string;
    }) {
        return this.request<any>(`/workspaces/${workspaceId}/tasks/${taskId}/deliverables/${deliverableId}/review/`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async completeWorkspace(workspaceId: string) {
        return this.request<any>(`/workspaces/${workspaceId}/complete/`, {
            method: 'POST',
        });
    }

    async getWorkspaceProof(workspaceId: string) {
        return this.request<any>(`/workspaces/${workspaceId}/complete/`);
    }

    async reopenWorkspace(workspaceId: string) {
        return this.request<any>(`/workspaces/${workspaceId}/reopen/`, {
            method: 'POST',
        });
    }

    // Public Proof of Work & Peer Review
    async getPublicProof(code: string) {
        return this.request<any>(`/proofs/${code}/`);
    }

    async submitPeerReview(code: string, data: {
        reviewee_id: string;
        execution_score: number;
        collaboration_score: number;
        reliability_score: number;
        feedback?: string;
    }) {
        return this.request<any>(`/proofs/${code}/peer-review/`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // Builder Reputation & Verified Contribution Summary
    async getUserReputation(userId: string) {
        return this.request<{
            score: number;
            level: string;
            badge_color: string;
            verified_stats: {
                approved_deliverables_count: number;
                completed_tasks_count: number;
                completed_projects_count: number;
                peer_reviews_count: number;
                average_peer_rating: number;
            };
            score_breakdown: {
                deliverables_points: number;
                tasks_points: number;
                projects_points: number;
                peer_reviews_points: number;
            };
            recent_events: Array<{
                id: string;
                event_type: string;
                points: number;
                description: string;
                created_at: string;
            }>;
        }>(`/users/${userId}/reputation/`);
    }

    async getMyReputation() {
        return this.request<any>('/users/me/reputation/');
    }

    async recalculateReputation(userId: string) {
        return this.request<any>(`/users/${userId}/reputation/recalculate/`, {
            method: 'POST',
        });
    }

    // --- Verified Builder Dossier & Timeline ---
    async getUserDossier(userIdOrUsername?: string) {
        const endpoint = userIdOrUsername ? `/users/${userIdOrUsername}/dossier/` : '/users/me/dossier/';
        return this.request<any>(endpoint);
    }

    async getUserActivityMatrix(userIdOrUsername: string) {
        return this.request<any>(`/users/${userIdOrUsername}/activity-matrix/`);
    }

    async updateDossierPreferences(data: {
        availability_status?: string;
        headline?: string;
        pinned_proof_ids?: string[];
        collaboration_preferences?: string[];
    }) {
        return this.request<any>('/users/me/dossier-preferences/', {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async getUserProofs(userIdOrUsername?: string) {
        const endpoint = userIdOrUsername ? `/users/${userIdOrUsername}/proofs/` : '/users/me/proofs/';
        return this.request<any[]>(endpoint);
    }

    async createExperience(data: any) {
        return this.request<any>('/users/me/experiences/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateExperience(id: string, data: any) {
        return this.request<any>(`/users/me/experiences/${id}/`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteExperience(id: string) {
        return this.request<void>(`/users/me/experiences/${id}/`, {
            method: 'DELETE',
        });
    }

    async createEducation(data: any) {
        return this.request<any>('/users/me/educations/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateEducation(id: string, data: any) {
        return this.request<any>(`/users/me/educations/${id}/`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteEducation(id: string) {
        return this.request<void>(`/users/me/educations/${id}/`, {
            method: 'DELETE',
        });
    }

    // Research & Living Papers endpoints
    async getResearchPapers(params?: {
        field?: string;
        status?: string;
        tab?: string;
        user?: string;
        author_id?: string;
        has_code?: boolean;
        has_bom?: boolean;
        has_workspace?: boolean;
        search?: string;
        ordering?: string;
    }) {
        const searchParams = new URLSearchParams();
        if (params?.field && params.field !== 'ALL') searchParams.set('field', params.field);
        if (params?.status) searchParams.set('status', params.status);
        if (params?.tab) searchParams.set('tab', params.tab);
        if (params?.user) searchParams.set('user', params.user);
        if (params?.author_id) searchParams.set('user', params.author_id);
        if (params?.has_code) searchParams.set('has_code', 'true');
        if (params?.has_bom) searchParams.set('has_bom', 'true');
        if (params?.has_workspace) searchParams.set('has_workspace', 'true');
        if (params?.search) searchParams.set('search', params.search);
        if (params?.ordering) searchParams.set('ordering', params.ordering);

        const query = searchParams.toString();
        const url = query ? `/research/?${query}` : '/research/';
        return this.request<any>(url);
    }

    async getResearchPaper(slug: string) {
        return this.request<any>(`/research/${slug}/`);
    }

    async createResearchPaper(data: {
        title: string;
        abstract: string;
        methodology_summary?: string;
        field: string;
        pdf_url?: string;
        code_repo_url?: string;
        dataset_url?: string;
        live_demo_url?: string;
        hardware_bom?: Array<{ name: string; slug?: string; quantity: number; role?: string; datasheet_url?: string }>;
        open_collaborator_roles?: string[];
        doi?: string;
        keywords?: string[];
        associated_workspace?: string;
        authors?: Array<{
            full_name: string;
            email?: string;
            affiliation?: string;
            orcid?: string;
            is_corresponding?: boolean;
            order?: number;
            contribution_statement?: string;
        }>;
    }) {
        return this.request<any>('/research/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async approveResearchPaper(slug: string) {
        return this.request<any>(`/research/${slug}/approve/`, {
            method: 'POST',
        });
    }

    async rejectResearchPaper(slug: string, reason?: string) {
        return this.request<any>(`/research/${slug}/reject/`, {
            method: 'POST',
            body: JSON.stringify({ reason: reason || '' }),
        });
    }

    async submitResearchReview(slug: string, review: {
        verdict: string;
        rigor_score: number;
        clarity_score: number;
        reproducibility_score: number;
        evaluation_notes: string;
        environment_details?: string;
        evidence_url?: string;
    }) {
        return this.request<any>(`/research/${slug}/review/`, {
            method: 'POST',
            body: JSON.stringify(review),
        });
    }

    async getPaperCitation(slug: string, style: string = 'bibtex') {
        return this.request<{ format: string; citation: string; paper_code: string }>(`/research/${slug}/citation/?style=${encodeURIComponent(style)}`);
    }

    async requestPaperRevisions(slug: string, data: { feedback: string; editorial_notes?: string; checklist?: any }) {
        return this.request<any>(`/research/${slug}/request_revisions/`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async submitPaperRevision(slug: string, data: { pdf_url: string; changelog?: string; abstract?: string; methodology_summary?: string }) {
        return this.request<any>(`/research/${slug}/submit_revision/`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async publishResearchPaper(slug: string, targetStatus?: string) {
        return this.request<any>(`/research/${slug}/publish/`, {
            method: 'POST',
            body: JSON.stringify({ status: targetStatus }),
        });
    }

    async getResearchStats() {
        return this.request<{
            total_papers: number;
            total_preprints: number;
            total_reproduced: number;
            total_audits: number;
            hardware_bom_papers: number;
            pending_count?: number;
            my_submissions_count?: number;
        }>('/research/stats/');
    }

    // Document & Media Upload
    async uploadDocument(file: File) {
        const formData = new FormData();
        formData.append('file', file);
        return this.request<{
            url: string;
            original_filename: string;
            file_size_bytes: number;
            file_type: string;
        }>('/uploads/document/', {
            method: 'POST',
            body: formData,
        });
    }

    async uploadImage(file: File) {
        return this.uploadDocument(file);
    }

    // Engineering Resources endpoints
    async getResources(params?: {
        category?: string;
        file_type?: string;
        search?: string;
        ordering?: string;
        tab?: string;
        status?: string;
    }) {
        const searchParams = new URLSearchParams();
        if (params?.category && params.category !== 'ALL') searchParams.set('category', params.category);
        if (params?.file_type && params.file_type !== 'ALL') searchParams.set('file_type', params.file_type);
        if (params?.search) searchParams.set('search', params.search);
        if (params?.ordering) searchParams.set('ordering', params.ordering);
        if (params?.tab) searchParams.set('tab', params.tab);
        if (params?.status) searchParams.set('status', params.status);

        const query = searchParams.toString();
        const url = query ? `/resources/?${query}` : '/resources/';
        return this.request<any>(url);
    }

    async getResource(slug: string) {
        return this.request<any>(`/resources/${slug}/`);
    }

    async createResource(data: {
        title: string;
        description: string;
        category: string;
        file_type: string;
        file_url?: string;
        file_size_bytes?: number;
        original_filename?: string;
        external_link?: string;
        tags?: string[];
    }) {
        return this.request<any>('/resources/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async approveResource(slug: string) {
        return this.request<any>(`/resources/${slug}/approve/`, {
            method: 'POST',
        });
    }

    async rejectResource(slug: string, reason?: string) {
        return this.request<any>(`/resources/${slug}/reject/`, {
            method: 'POST',
            body: JSON.stringify({ reason: reason || '' }),
        });
    }

    async downloadResource(slug: string) {
        return this.request<{ download_url: string; downloads_count: number }>(`/resources/${slug}/download/`, {
            method: 'POST',
        });
    }

    async getResourceStats() {
        return this.request<{
            total_resources: number;
            total_downloads: number;
            pending_count: number;
            my_submissions_count: number;
        }>('/resources/stats/');
    }

    // ENQUEbet Pulse — Technical Intelligence, Briefings, Lifecycle & Opportunities
    async getPlatformUpdates(params: {
        category?: string;
        search?: string;
        tab?: string;
        type?: string;
        importance?: string;
        tag?: string;
        page?: number;
    } = {}) {
        const query = new URLSearchParams();
        if (params.category && params.category !== 'all') {
            query.append('category', params.category);
        }
        if (params.search) {
            query.append('search', params.search);
        }
        if (params.tab && params.tab !== 'all') {
            query.append('tab', params.tab);
        }
        if (params.type && params.type !== 'all') {
            query.append('type', params.type);
        }
        if (params.importance && params.importance !== 'all') {
            query.append('importance', params.importance);
        }
        if (params.tag) {
            query.append('tag', params.tag);
        }
        if (params.page) {
            query.append('page', params.page.toString());
        }
        const qs = query.toString();
        return this.request<any>(`/updates/${qs ? `?${qs}` : ''}`);
    }

    async getPulseBriefing() {
        return this.request<{
            date: string;
            total_recent: number;
            top_story: any | null;
            daily_developments: any[];
        }>('/updates/briefing/');
    }

    async getPulseLifecycle(params: { status?: string; search?: string } = {}) {
        const query = new URLSearchParams();
        if (params.status && params.status !== 'all') {
            query.append('status', params.status);
        }
        if (params.search) {
            query.append('search', params.search);
        }
        const qs = query.toString();
        return this.request<any>(`/updates/lifecycle/${qs ? `?${qs}` : ''}`);
    }

    async getPulseOpportunities(params: { type?: string; search?: string } = {}) {
        const query = new URLSearchParams();
        if (params.type && params.type !== 'all') {
            query.append('type', params.type);
        }
        if (params.search) {
            query.append('search', params.search);
        }
        const qs = query.toString();
        return this.request<any>(`/updates/opportunities/${qs ? `?${qs}` : ''}`);
    }

    async toggleSavePulseUpdate(slugOrId: string) {
        return this.request<{ is_saved: boolean; saves_count: number; update_id: string }>(
            `/updates/${slugOrId}/save/`,
            { method: 'POST' }
        );
    }

    async getPulsePreferences() {
        return this.request<{
            followed_categories: string[];
            followed_technologies: string[];
            receive_weekly_briefing: boolean;
        }>('/updates/preferences/');
    }

    async updatePulsePreferences(data: {
        followed_categories?: string[];
        followed_technologies?: string[];
        receive_weekly_briefing?: boolean;
    }) {
        return this.request<any>('/updates/preferences/', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async createPulseWorkspaceTask(slugOrId: string, workspaceId: string) {
        return this.request<{
            success: boolean;
            task_id: string;
            task_title: string;
            workspace_id: string;
            message: string;
        }>(`/updates/${slugOrId}/create_workspace_task/`, {
            method: 'POST',
            body: JSON.stringify({ workspace_id: workspaceId }),
        });
    }

    async getPlatformUpdate(slugOrId: string) {
        return this.request<any>(`/updates/${slugOrId}/`);
    }

    async createPlatformUpdate(data: any) {
        return this.request<any>('/updates/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updatePlatformUpdate(slugOrId: string, data: any) {
        return this.request<any>(`/updates/${slugOrId}/`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async deletePlatformUpdate(slugOrId: string) {
        return this.request<void>(`/updates/${slugOrId}/`, {
            method: 'DELETE',
        });
    }

    async getPlatformUpdateCategories() {
        return this.request<Array<{ value: string; label: string }>>('/updates/categories/');
    }

    async getPlatformUpdateStats() {
        return this.request<{
            total_count: number;
            pinned_count: number;
            top_story_count: number;
            opportunities_count: number;
            lifecycle_count: number;
            category_counts: Record<string, number>;
        }>('/updates/stats/');
    }
}


export const api = new ApiClient(API_BASE_URL);


