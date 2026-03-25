/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: [
        'pg', 'pg-connection-string', 'pg-native', 'pgpass', 'split2',
        '@prisma/client', 'node-cron'
    ],
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false, dns: false, net: false, tls: false,
                child_process: false, crypto: false, os: false, path: false,
            };
        }
        return config;
    },
};

export default nextConfig;
