import { Inter, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: '--font-inter',
});

const ibmPlexThai = IBM_Plex_Sans_Thai({
    weight: ['300', '400', '500', '600', '700'],
    subsets: ['thai'],
    variable: '--font-thai',
});

import Providers from "@/components/Providers";

export const metadata = {
    title: "V School CRM v2",
    description: "Next-generation Cooking School Management",
};

export default function RootLayout({ children }) {
    return (
        <html lang="th">
            <head>
                <link
                    rel="stylesheet"
                    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
                    crossOrigin="anonymous"
                />
            </head>
            <body className={`${inter.variable} ${ibmPlexThai.variable} font-sans`}>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
