/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: [
        'pg', 'pg-connection-string', 'pg-native', 'pgpass', 'split2',
        '@prisma/client', 'node-cron'
    ],
};

export default nextConfig;
