"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { useAuth } from '@/lib/contexts/AuthContext';
import { api } from '@/lib/api';

export default function SettingsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useRequireAuth();
    const { logout, updateUser } = useAuth();

    const [savingAccount, setSavingAccount] = useState(false);
    const [savingPrivacy, setSavingPrivacy] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [deletingPosts, setDeletingPosts] = useState(false);

    const [accountData, setAccountData] = useState({
        username: '',
        email: '',
    });

    const [privacyData, setPrivacyData] = useState({
        is_private: false,
    });

    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_new_password: '',
    });

    useEffect(() => {
        if (!authLoading && user) {
            setAccountData({
                username: user.username || '',
                email: user.email || '',
            });
            setPrivacyData({
                is_private: Boolean(user.is_private),
            });
        }
    }, [authLoading, user]);

    if (authLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-text-secondary">Loading...</div>
            </div>
        );
    }

    const handleSaveAccount = async () => {
        setSavingAccount(true);
        try {
            const updated = await api.updateMe({
                username: accountData.username,
                email: accountData.email,
            });
            updateUser(updated);
            toast.success('Account updated');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update account');
        } finally {
            setSavingAccount(false);
        }
    };

    const handleChangePassword = async () => {
        if (!passwordData.current_password || !passwordData.new_password) {
            toast.error('Please fill all password fields');
            return;
        }
        if (passwordData.new_password !== passwordData.confirm_new_password) {
            toast.error('New passwords do not match');
            return;
        }

        setChangingPassword(true);
        try {
            await api.changeMyPassword(passwordData.current_password, passwordData.new_password);
            setPasswordData({ current_password: '', new_password: '', confirm_new_password: '' });
            toast.success('Password updated');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update password');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleSavePrivacy = async () => {
        setSavingPrivacy(true);
        try {
            const updated = await api.updateMe({
                is_private: privacyData.is_private,
            });
            updateUser(updated);
            toast.success('Privacy settings updated');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update privacy');
        } finally {
            setSavingPrivacy(false);
        }
    };

    const handleDeleteAllPosts = async () => {
        const ok = confirm('Delete all your posts? This cannot be undone.');
        if (!ok) return;

        setDeletingPosts(true);
        try {
            await api.deleteMyPosts();
            toast.success('All posts deleted');
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete posts');
        } finally {
            setDeletingPosts(false);
        }
    };

    const handleDeleteAccount = async () => {
        const ok = confirm('Delete your account permanently? This cannot be undone.');
        if (!ok) return;

        setDeletingAccount(true);
        try {
            await api.deleteMe();
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete account');
            setDeletingAccount(false);
            return;
        }

        // Clear local auth state and redirect.
        try {
            await logout();
        } catch {
            // Ensure localStorage is cleared even if logout API fails
            try {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
            } catch {
                // ignore
            }
        }

        toast.success('Account deleted');
        router.push('/auth/register');
    };

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-3xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Settings</h1>
                    <p className="text-text-secondary mt-1">Manage your account, privacy, and data.</p>
                </div>

                {/* Account */}
                <div className="card">
                    <h2 className="text-xl font-bold mb-4">Account</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Username</label>
                            <input
                                className="input w-full"
                                value={accountData.username}
                                onChange={(e) => setAccountData({ ...accountData, username: e.target.value })}
                                placeholder="Your username"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Email</label>
                            <input
                                className="input w-full"
                                value={accountData.email}
                                onChange={(e) => setAccountData({ ...accountData, email: e.target.value })}
                                placeholder="you@email.com"
                                type="email"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button
                            className="btn-primary"
                            disabled={savingAccount}
                            onClick={handleSaveAccount}
                        >
                            {savingAccount ? 'Saving...' : 'Save Account'}
                        </button>

                        <button
                            className="btn-outline"
                            onClick={() => logout()}
                        >
                            Logout
                        </button>

                        <button
                            className="btn-outline"
                            disabled={deletingAccount}
                            onClick={handleDeleteAccount}
                        >
                            {deletingAccount ? 'Deleting...' : 'Delete Account'}
                        </button>
                    </div>
                </div>

                {/* Password */}
                <div className="card">
                    <h2 className="text-xl font-bold mb-4">Change Password</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Current Password</label>
                            <input
                                className="input w-full"
                                value={passwordData.current_password}
                                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                                type="password"
                                placeholder="Enter current password"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">New Password</label>
                            <input
                                className="input w-full"
                                value={passwordData.new_password}
                                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                type="password"
                                placeholder="Enter new password"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                            <input
                                className="input w-full"
                                value={passwordData.confirm_new_password}
                                onChange={(e) => setPasswordData({ ...passwordData, confirm_new_password: e.target.value })}
                                type="password"
                                placeholder="Re-enter new password"
                            />
                        </div>

                        <button
                            className="btn-primary"
                            disabled={changingPassword}
                            onClick={handleChangePassword}
                        >
                            {changingPassword ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </div>

                {/* Privacy */}
                <div className="card">
                    <h2 className="text-xl font-bold mb-4">Privacy</h2>

                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <div className="font-medium">Private account</div>
                            <div className="text-text-secondary text-sm">When enabled, your account is marked as private.</div>
                        </div>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={privacyData.is_private}
                                onChange={(e) => setPrivacyData({ is_private: e.target.checked })}
                            />
                            <span className="text-sm text-text-secondary">{privacyData.is_private ? 'Private' : 'Public'}</span>
                        </label>
                    </div>

                    <div className="mt-4">
                        <button
                            className="btn-primary"
                            disabled={savingPrivacy}
                            onClick={handleSavePrivacy}
                        >
                            {savingPrivacy ? 'Saving...' : 'Save Privacy'}
                        </button>
                    </div>
                </div>

                {/* Data */}
                <div className="card">
                    <h2 className="text-xl font-bold mb-4">Data</h2>

                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <div className="font-medium">Delete all posts</div>
                            <div className="text-text-secondary text-sm">Removes all posts you created.</div>
                        </div>
                        <button
                            className="btn-outline"
                            disabled={deletingPosts}
                            onClick={handleDeleteAllPosts}
                        >
                            {deletingPosts ? 'Deleting...' : 'Delete All Posts'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
