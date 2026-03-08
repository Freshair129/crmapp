"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

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

const fadeVariant = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -16 },
};

export default function Home() {
    const { data: session } = useSession();
    const currentUser = session?.user || null;

    const [activeView, setActiveView] = useState("dashboard");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [custRes, prodRes, empRes, ordRes] = await Promise.all([
                fetch("/api/customers"),
                fetch("/api/products"),
                fetch("/api/employees"),
                fetch("/api/orders"),
            ]);
            const [custData, prodData, empData, ordData] = await Promise.all([
                custRes.json(),
                prodRes.json(),
                empRes.json(),
                ordRes.json(),
            ]);
            setCustomers(Array.isArray(custData) ? custData : custData.data ?? []);
            setProducts(prodData.success ? prodData.data : Array.isArray(prodData) ? prodData : []);
            setEmployees(Array.isArray(empData) ? empData : empData.data ?? []);
            setOrders(Array.isArray(ordData) ? ordData : ordData.data ?? []);
        } catch (err) {
            console.error("fetchData failed:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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
        // Logic for checkout...
        console.log("Checking out for:", selectedCustomer.id, payload);
        // Simulation of success:
        setCart([]);
        setIsCartOpen(false);
        fetchData();
    };


    const handleViewChange = (view) => {
        setActiveView(view);
        if (view !== "customers") setSelectedCustomer(null);
    };

    const wrap = (key, children) => (
        <motion.div key={key} variants={fadeVariant} initial="initial" animate="animate" exit="exit"
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
            {children}
        </motion.div>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-[#0A1A2F] text-white">
            <Sidebar activeView={activeView} onViewChange={handleViewChange} currentUser={currentUser} />

            <main className="flex-1 overflow-y-auto relative">
                {/* Ambient glows */}
                <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#C9A34E]/5 blur-[120px] -z-10 pointer-events-none" />
                <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] -z-10 pointer-events-none" />

                <AnimatePresence mode="wait">

                    {activeView === "dashboard" && wrap("dashboard",
                        <Dashboard customers={customers} products={products} employees={employees} currentUser={currentUser} />
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
                            />
                        )
                    )}

                    {activeView === "employees" && wrap("employees",
                        <EmployeeManagement employees={employees} customers={customers} onRefresh={fetchData} currentUser={currentUser} />
                    )}

                    {activeView === "store" && wrap("store",
                        <StoreGrid
                            products={products}
                            allProducts={products}
                            activeCustomer={selectedCustomer}
                            onSelectProduct={(p) => console.log("Selected:", p)}
                            onAddToCart={handleAddToCart}
                            cart={cart}
                            setCart={setCart}
                            onCheckout={handleCheckout}
                            isCartOpen={isCartOpen}
                            setIsCartOpen={setIsCartOpen}
                        />
                    )}

                    {activeView === "orders" && wrap("orders",
                        <Orders customers={customers} products={products} orders={orders} onRefresh={fetchData} />
                    )}


                    {activeView === "analytics" && wrap("analytics",
                        <Analytics customers={customers} products={products} employees={employees} />
                    )}

                    {activeView === "team-kpi" && wrap("team-kpi",
                        <TeamKPI employees={employees} customers={customers} />
                    )}

                    {activeView === "admin-performance" && wrap("admin-performance",
                        <AdminPerformance employees={employees} customers={customers} />
                    )}

                    {activeView === "facebook-ads" && wrap("facebook-ads",
                        <FacebookAds customers={customers} />
                    )}

                    {activeView === "facebook-chat" && wrap("facebook-chat",
                        <FacebookChat customers={customers} />
                    )}

                    {activeView === "campaign-tracking" && wrap("campaign-tracking",
                        <CampaignTracking customers={customers} />
                    )}

                    {activeView === "settings" && wrap("settings",
                        <Settings />
                    )}

                </AnimatePresence>
            </main>
        </div>
    );
}
