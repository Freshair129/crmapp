"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SignInForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
                callbackUrl,
            });

            if (result?.error) {
                setError("Invalid email or password");
                setIsLoading(false);
            } else {
                router.push(callbackUrl);
                router.refresh();
            }
        } catch (err) {
            setError("Something went wrong. Please try again.");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0A1A2F] font-sans">
            <div className="max-w-md w-full p-8 bg-[#112240] rounded-2xl shadow-2xl border border-[#233554] transform transition-all hover:scale-[1.01]">
                {/* Logo & Header */}
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-extrabold text-[#CCD6F6] tracking-tight mb-2">
                        V School <span className="text-[#C9A34E]">CRM</span>
                    </h1>
                    <p className="text-[#8892B0] text-sm uppercase tracking-widest font-medium">
                        Management Portal v2.0
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg animate-pulse">
                        <p className="text-red-400 text-sm font-medium text-center">{error}</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[#8892B0] text-xs font-semibold uppercase tracking-wider mb-2" htmlFor="email">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            required
                            className="w-full px-4 py-3 bg-[#0A192F] border border-[#233554] rounded-lg text-[#CCD6F6] placeholder-[#495670] transition-all focus:outline-none focus:border-[#C9A34E] focus:ring-1 focus:ring-[#C9A34E]"
                            placeholder="admin@vschool.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-[#8892B0] text-xs font-semibold uppercase tracking-wider mb-2" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            required
                            className="w-full px-4 py-3 bg-[#0A192F] border border-[#233554] rounded-lg text-[#CCD6F6] placeholder-[#495670] transition-all focus:outline-none focus:border-[#C9A34E] focus:ring-1 focus:ring-[#C9A34E]"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-[#C9A34E] hover:bg-[#D4B46E] text-[#0A1A2F] font-bold rounded-lg transition-all transform active:scale-[0.98] shadow-lg shadow-[#C9A34E]/20 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#0A1A2F]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Authenticating...
                            </span>
                        ) : (
                            "Sign In to System"
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-[#233554] text-center">
                    <p className="text-[#495670] text-[10px] uppercase tracking-widest">
                        The V School &copy; 2026 Secured Japanese Culinary Ecosystem
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function SignInPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#0A1A2F]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C9A34E]"></div>
            </div>
        }>
            <SignInForm />
        </Suspense>
    );
}
