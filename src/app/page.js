"use client";

import { useState, useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { can, getAccessibleModules } from "@/lib/permissionMatrix";

import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import CustomerList from "@/components/CustomerList";
import CustomerCard from "@/components/CustomerCard";
import EmployeeManagement from "@/components/EmployeeManagement";
import StoreGrid from "@/components/StoreGrid";
import Orders from "@/components/Orders";
import Analytics from "@/components/Analytics";
import TeamKPI from "@/components/TeamKPI";
import AdminPerformance from "@/components/AdminPerformance";
import FacebookAds from "@/components/FacebookAds";
import FacebookChat from "@/components/FacebookChat";
import CampaignTracking from "@/components/CampaignTracking";
import Settings from "@/components/Settings";
import AIConfigPage from "@/components/AIConfigPage";
import UnifiedInbox from "@/components/UnifiedInbox";


// New Standalone Modules
import PremiumPOS from "@/components/PremiumPOS";
import LineConnect from "@/components/LineConnect";
import NotificationCenter from "@/components/NotificationCenter";
import ExecutiveAnalytics from "@/components/ExecutiveAnalytics";
import InventoryManager from "@/components/InventoryManager";
import AuditHistory from "@/components/AuditHistory";
import SystemConfig from "@/components/SystemConfig";
import LoginPage from "@/components/LoginPage";
import TopBar from "@/components/TopBar";
// Phase 15 — Operations
import ScheduleCalendar from "@/components/ScheduleCalendar";
import KitchenStockPanel from "@/components/KitchenStockPanel";
import AssetPanel from "@/components/AssetPanel";
import RecipePage from "@/components/RecipePage";
import PackagePage from "@/components/PackagePage";
import CoursePage from "@/components/CoursePage";
import TaskPanel from "@/components/TaskPanel";
import InventoryControlPanel from "@/components/InventoryControlPanel";
import ProcurementPanel from "@/components/ProcurementPanel";

const pageVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.15 } }
};

export default function Home() {
    const { data: session, status } = useSession();
    const [currentUser, setCurrentUser] = useState(null);
    const [authInited, setAuthInited] = useState(false);

    // Global Settings State
    const [language, setLanguage] = useState('TH');
    const [theme, setTheme] = useState('dark');

    // Apply theme to <html> so CSS selectors can respond
    useEffect(() => {
        document.documentElement.dataset.theme = theme;
    }, [theme]);

    useEffect(() => {
        if (status === "authenticated" && session?.user) {
            setCurrentUser(session.user);
        } else if (status === "unauthenticated") {
            if (process.env.NODE_ENV === 'development') {
                setCurrentUser({
                    id: 'dev-user',
                    firstName: 'Dev',
                    lastName: 'User',
                    role: 'DEVELOPER',
                    email: 'dev@vschool.com'
                });
            } else {
                setCurrentUser(null);
            }
        } else if (status === "loading" && process.env.NODE_ENV === 'development') {
            // Predictively set for dev to avoid flicker
            setCurrentUser({
                id: 'dev-user',
                firstName: 'Dev',
                lastName: 'User',
                role: 'DEVELOPER',
                email: 'dev@vschool.com'
            });
        }
        setAuthInited(status !== "loading" || process.env.NODE_ENV === 'development');
    }, [session, status]);

    const handleLogout = () => {
        signOut({ redirect: false });
        setCurrentUser(null);
    };

    const mainScrollRef = useRef(null);

    const [activeView, setActiveView] = useState("dashboard");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [urgentTaskCount, setUrgentTaskCount] = useState(0);

    const fetchData = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const hasManagerAccess = can(currentUser.role, 'system', 'view');

            const fetchPromises = [
                fetch("/api/customers"),
                fetch("/api/products"),
                fetch("/api/orders"),
            ];

            if (hasManagerAccess) {
                fetchPromises.push(fetch("/api/employees"));
            }

            const results = await Promise.all(fetchPromises);
            const [custRes, prodRes, ordRes, empRes] = results;

            const custData = await custRes.json();
            const prodData = await prodRes.json();
            const ordData = await ordRes.json();
            let empData = { success: true, data: [] };

            if (hasManagerAccess && empRes) {
                empData = await empRes.json();
            }
            setCustomers(Array.isArray(custData) ? custData : custData.data ?? []);
            setProducts(prodData.success ? prodData.data : Array.isArray(prodData) ? prodData : []);
            setEmployees(Array.isArray(empData) ? empData : empData.data ?? []);
            setOrders(Array.isArray(ordData) ? ordData : ordData.data ?? []);

            // Fetch urgent task count (L0+L1) for Sidebar badge — non-blocking
            fetch('/api/tasks?limit=1').then(r => r.json()).then(d => {
                if (d.urgentCount !== undefined) setUrgentTaskCount(d.urgentCount);
            }).catch(() => {});
        } catch (err) {
            console.error("fetchData failed:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser) fetchData();
    }, [currentUser]);

    const handleAddToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id && item.type === product.type);
            if (existing) {
                return prev.map(item =>
                    (item.id === product.id && item.type === product.type)
                        ? { ...item, qty: item.qty + 1 }
                        : item
                );
            }
            return [...prev, { ...product, qty: 1 }];
        });
    };

    const handleCheckout = async (payload) => {
        if (!selectedCustomer) {
            alert("Please select a customer first.");
            return;
        }
        console.log("Checking out for:", selectedCustomer.id, payload);
        setCart([]);
        setIsCartOpen(false);
        fetchData();
    };


    const handleViewChange = (view) => {
        setActiveView(view);
        if (view !== "customers") setSelectedCustomer(null);
        // Reset scroll position so new view always starts at the top
        if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
    };

    // Demo / read-only guard for GUEST role
    const isGuest = currentUser?.role === 'GUEST';

    const wrap = (key, children) => (
        <motion.div key={key} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="h-full min-h-0 flex flex-col">
            {children}
        </motion.div>
    );

    // Guard: Loading State
    if (!authInited) {
        return (
            <div className="h-screen w-screen bg-[#0A1A2F] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#C9A34E]" size={40} />
            </div>
        );
    }

    // Guard: Protected View
    if (process.env.NODE_ENV !== 'development') {
        if (status === "unauthenticated" || (!currentUser && status === "authenticated")) {
            return <LoginPage onLogin={(user) => setCurrentUser(user)} />;
        }
    }

    return (
        <div className="flex h-screen overflow-hidden bg-[#0A1A2F] text-white">
            <Sidebar
                activeView={activeView}
                onViewChange={handleViewChange}
                currentUser={currentUser}
                cartCount={cart.reduce((s, i) => s + i.qty, 0)}
                pendingTaskCount={urgentTaskCount}
                onLogout={handleLogout}
            />

            <main ref={mainScrollRef} className={`flex-1 relative flex flex-col ${activeView === 'facebook-chat' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                <TopBar
                    language={language}
                    setLanguage={setLanguage}
                    theme={theme}
                    setTheme={setTheme}
                    currentUser={currentUser}
                    onLogout={handleLogout}
                />

                {/* Demo Mode Banner */}
                {isGuest && (
                    <div className="flex items-center gap-3 px-6 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-[11px] font-black uppercase tracking-widest">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
                        Demo Mode — Read Only · ไม่สามารถแก้ไขข้อมูลได้
                    </div>
                )}

                <div className={`flex-1 relative min-h-0 ${activeView === 'facebook-chat' ? 'flex flex-col overflow-hidden' : 'p-8'}`}>
                    <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#C9A34E]/5 blur-[120px] -z-10 pointer-events-none" />
                    <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] -z-10 pointer-events-none" />

                    <AnimatePresence mode="wait">

                        {activeView === "dashboard" && wrap("dashboard",
                            <Dashboard customers={customers} products={products} employees={employees} orders={orders} currentUser={currentUser} onRefresh={fetchData} />
                        )}

                        {activeView === "executive-analytics" && wrap("executive-analytics",
                            <ExecutiveAnalytics language={language} />
                        )}

                        {activeView === "pos-system" && wrap("pos-system",
                            <PremiumPOS language={language} readOnly={isGuest} />
                        )}

                        {activeView === "inventory-manager" && wrap("inventory-manager",
                            <InventoryManager />
                        )}

                        {activeView === "audit-trail" && wrap("audit-trail",
                            <AuditHistory />
                        )}

                        {activeView === "customers" && wrap("customers",
                            selectedCustomer ? (
                                <div className="p-6">
                                    <button
                                        onClick={() => setSelectedCustomer(null)}
                                        className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                                    >
                                        ← Back to Customers
                                    </button>
                                    <CustomerCard
                                        customer={selectedCustomer}
                                        customers={customers}
                                        onSelectCustomer={setSelectedCustomer}
                                        products={products}
                                    />
                                </div>
                            ) : loading ? (
                                <div className="flex items-center justify-center h-64">
                                    <Loader2 className="animate-spin text-[#C9A34E]" size={28} />
                                </div>
                            ) : (
                                <CustomerList
                                    customers={customers}
                                    products={products}
                                    onSelectCustomer={setSelectedCustomer}
                                    readOnly={isGuest}
                                />
                            )
                        )}

                        {activeView === "facebook-chat" && wrap("facebook-chat",
                            <UnifiedInbox language={language} />
                        )}


                        {activeView === "line-connect" && wrap("line-connect",
                            <LineConnect language={language} />
                        )}

                        {activeView === "facebook-ads" && wrap("facebook-ads",
                            <FacebookAds customers={customers} />
                        )}

                        {activeView === "campaign-tracking" && wrap("campaign-tracking",
                            <CampaignTracking customers={customers} />
                        )}

                        {activeView === "analytics" && wrap("analytics",
                            <Analytics customers={customers} products={products} employees={employees} />
                        )}

                        {activeView === "notification-rules" && wrap("notification-rules",
                            <NotificationCenter language={language} />
                        )}

                        {activeView === "employees" && wrap("employees",
                            <EmployeeManagement employees={employees} customers={customers} onRefresh={fetchData} currentUser={currentUser} />
                        )}

                        {activeView === "team-kpi" && wrap("team-kpi",
                            <TeamKPI employees={employees} customers={customers} />
                        )}

                        {activeView === "admin-performance" && wrap("admin-performance",
                            <AdminPerformance employees={employees} customers={customers} />
                        )}

                        {activeView === "system-config" && wrap("system-config",
                            <SystemConfig language={language} setLanguage={setLanguage} />
                        )}

                        {activeView === "ai-config" && wrap("ai-config",
                            <AIConfigPage />
                        )}

                        {activeView === "settings" && wrap("settings",
                            <Settings />
                        )}

                        {activeView === "schedules" && wrap("schedules",
                            <ScheduleCalendar language={language} />
                        )}

                        {activeView === "courses" && wrap("courses",
                            <CoursePage language={language} />
                        )}

                        {activeView === "recipes" && wrap("recipes",
                            <RecipePage language={language} />
                        )}

                        {activeView === "packages" && wrap("packages",
                            <PackagePage language={language} />
                        )}

                        {activeView === "kitchen-stock" && wrap("kitchen-stock",
                            <KitchenStockPanel language={language} />
                        )}

                        {activeView === "inventory-control" && wrap("inventory-control",
                            <InventoryControlPanel />
                        )}

                        {activeView === "procurement" && wrap("procurement",
                            <ProcurementPanel />
                        )}

                        {activeView === "assets" && wrap("assets",
                            <AssetPanel language={language} />
                        )}

                        {activeView === "tasks" && wrap("tasks",
                            <TaskPanel employees={employees} customers={customers} currentUser={currentUser} />
                        )}

                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
