import { redirect } from 'next/navigation';

export default function LoginAliasPage({
    searchParams,
}: {
    searchParams?: { [key: string]: string | string[] | undefined };
}) {
    const next = typeof searchParams?.next === 'string' ? `?next=${encodeURIComponent(searchParams.next)}` : '';
    redirect(`/auth/login${next}`);
}
