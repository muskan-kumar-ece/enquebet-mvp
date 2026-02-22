"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { WebSocketProvider } from '@/lib/contexts/WebSocketContext';

interface User {
    id: string;
    email: string;
    username: string;
    full_name: string;
    is_private?: boolean;
    bio?: string;
    location?: string;
    college?: string;
    profile_image?: string;
    avatar_url?: string;
    skills?: string[];
    followers_count?: number;
    following_count?: number;
    education?: string[];
    projects?: string[];
    experience?: string[];
    resume_file?: string;
    linkedin_url?: string;
    github_url?: string;
    portfolio_url?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => void;
    updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check if user is logged in on mount
        const checkAuth = async () => {
            const token = localStorage.getItem('accessToken');
            const storedUser = localStorage.getItem('user');

            if (token && storedUser) {
                try {
                    // Verify token is still valid by fetching profile
                    const profile = await api.getProfile();
                    setUser(profile);
                } catch (err) {
                    // Token expired or invalid
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('user');
                    setUser(null);
                }
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    const login = async (email: string, password: string) => {
        const response = await api.login({ email, password });
        api.setToken(response.access);
        localStorage.setItem('refreshToken', response.refresh);
        localStorage.setItem('user', JSON.stringify(response.user));
        setUser(response.user);
    };

    const register = async (data: any) => {
        const response = await api.register(data);
        api.setToken(response.access);
        localStorage.setItem('refreshToken', response.refresh);
        localStorage.setItem('user', JSON.stringify(response.user));
        setUser(response.user);
    };

    const logout = () => {
        const refresh = localStorage.getItem('refreshToken');
        if (refresh) {
            // Best-effort: don't block UI on logout.
            api.logout(refresh).catch(() => undefined);
        }

        api.clearToken();
        localStorage.removeItem('user');
        setUser(null);
        router.push('/auth/login');
    };

    const updateUser = (data: Partial<User>) => {
        if (user) {
            const updatedUser = { ...user, ...data };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
            <WebSocketProvider>
                {children}
            </WebSocketProvider>
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
