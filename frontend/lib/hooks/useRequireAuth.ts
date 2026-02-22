"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

export function useRequireAuth() {
    const auth = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!auth.loading && !auth.user) {
            router.push('/auth/login');
        }
    }, [auth.user, auth.loading, router]);

    return auth;
}
