/** @type {import('next').NextConfig} */
const nextConfig = {
    // output: 'standalone',  // Docker only — Vercel uses serverless (auto-detected)
    serverExternalPackages: [
        'pg', 'pg-connection-string', 'pg-native', 'pgpass', 'split2',
        '@prisma/adapter-pg', '@prisma/client',
        'node-cron',
    ],
    webpack: (config, { isServer }) => {
        // Resolve issues with Node.js modules in dependencies like 'pg'
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
                path: false,
                stream: false,
                util: false,
                crypto: false,
                dns: false,
                os: false,
            };

            // Explicitly ignore server-only packages in client/edge bundles
            config.resolve.alias = {
                ...config.resolve.alias,
                'pg': false,
                'pg-native': false,
                'pg-connection-string': false,
                'pgpass': false,
                'split2': false,
            };
        }
        return config;
    },
};

export default nextConfig;
