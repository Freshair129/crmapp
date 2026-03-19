/**
 * getSession — shared server-side session helper
 *
 * Wraps getServerSession(authOptions) so API routes don't need to import
 * authOptions individually. In next-auth v4 + Next.js 14 App Router,
 * getServerSession() without authOptions always returns null.
 */
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export function getSession() {
    return getServerSession(authOptions);
}
