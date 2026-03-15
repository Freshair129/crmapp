'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    BookOpen, Plus, Search, X, ChevronDown, ChevronUp,
    FlaskConical, Wrench, DollarSign, Tag, Edit2, Check,
    AlertTriangle, Loader2, RefreshCw
} from 'lucide-react';

const CATEGORIES = ['JP', 'TH', 'WESTERN', 'PASTRY', 'DESSERT', 'OTHER'];

function StatBadge({ label, value, color = 'gray' }) {
    const colors = {
        green: 'bg-green-100 text-green-800',
        blue: 'bg-blue-100 text-blue-800',
        yellow: 'bg-yellow-100 text-yellow-800',
        gray: 'bg-gray-100 text-gray-700'
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
            {label}: <strong>{value}</strong>
        </span>
    );
}

function IngredientRow({ ing }) {
    const isLow = ing.ingredient.currentStock < ing.ingredient.minStock;
    return (
        <div className={`flex items-center justify-between py-1.5 px-2 rounded text-sm ${isLow ? 'bg-red-50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2">
                {isLow && <AlertTriangle size={13} className="text-red-500 shrink-0" />}
                <span className="font-medium text-gray-800">{ing.ingredient.name}</span>
                <span className="text-gray-400 text-xs">({ing.ingredient.ingredientId})</span>
            </div>
            <div className="text-right">
                <span className="text-gray-700">{ing.qtyPerPerson} {ing.unit}/คน</span>
                <span className={`ml-2 text-xs ${isLow ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                    สต็อก: {ing.ingredient.currentStock} {ing.ingredient.unit}
                </span>
            </div>
        </div>
    );
}

function EquipmentRow({ eq }) {
    const isLow = eq.currentStock < eq.minStock;
    return (
        <div className={`flex items-center justify-between py-1.5 px-2 rounded text-sm ${isLow ? 'bg-orange-50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2">
                {isLow && <AlertTriangle size={13} className="text-orange-500 shrink-0" />}
                <span className="font-medium text-gray-800">{eq.name}</span>
            </div>
            <div className="text-right">
                <span className="text-gray-700">{eq.qtyRequired} {eq.unit}/session</span>
                <span className={`ml-2 text-xs ${isLow ? 'text-orange-500 font-semibold' : 'text-gray-400'}`}>
                    สต็อก: {eq.currentStock}
                </span>
            </div>
        </div>
    );
}

function RecipeCard({ recipe, onEdit }) {
    const [expanded, setExpanded] = useState(false);
    const lowIngredients = recipe.ingredients.filter(i => i.ingredient.currentStock < i.ingredient.minStock).length;
    const lowEquipment = recipe.equipment.filter(e => e.currentStock < e.minStock).length;

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(v => !v)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <BookOpen size={18} className="text-amber-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{recipe.name}</h3>
                            {(lowIngredients > 0 || lowEquipment > 0) && (
                                <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                                    <AlertTriangle size={11} /> สต็อกต่ำ
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-gray-400">{recipe.recipeId}</span>
                            {recipe.category && (
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{recipe.category}</span>
                            )}
                            <StatBadge label="วัตถุดิบ" value={recipe.ingredients.length} color="blue" />
                            <StatBadge label="อุปกรณ์" value={recipe.equipment.length} color="yellow" />
                            {recipe.courseMenus?.length > 0 && (
                                <StatBadge label="คอร์ส" value={recipe.courseMenus.length} color="green" />
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                        {recipe.estimatedCost != null && (
                            <div className="text-sm font-semibold text-gray-700">
                                ต้นทุน ฿{recipe.estimatedCost.toLocaleString()}
                            </div>
                        )}
                        {recipe.sellingPrice != null && (
                            <div className="text-xs text-green-600">
                                ราคา ฿{recipe.sellingPrice.toLocaleString()}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={e => { e.stopPropagation(); onEdit(recipe); }}
                        className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500"
                    >
                        <Edit2 size={14} />
                    </button>
                    {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
            </div>

            {expanded && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                    {recipe.description && (
                        <p className="text-sm text-gray-600 italic">{recipe.description}</p>
                    )}

                    {/* Ingredients */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <FlaskConical size={14} className="text-blue-500" />
                            <span className="text-sm font-semibold text-gray-700">วัตถุดิบ ({recipe.ingredients.length})</span>
                        </div>
                        {recipe.ingredients.length === 0 ? (
                            <p className="text-xs text-gray-400 pl-2">ยังไม่มีวัตถุดิบ</p>
                        ) : (
                            <div className="space-y-1">
                                {recipe.ingredients.map(ing => <IngredientRow key={ing.id} ing={ing} />)}
                            </div>
                        )}
                    </div>

                    {/* Equipment */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Wrench size={14} className="text-yellow-500" />
                            <span className="text-sm font-semibold text-gray-700">อุปกรณ์พิเศษ ({recipe.equipment.length})</span>
                        </div>
                        {recipe.equipment.length === 0 ? (
                            <p className="text-xs text-gray-400 pl-2">ไม่มีอุปกรณ์พิเศษ</p>
                        ) : (
                            <div className="space-y-1">
                                {recipe.equipment.map(eq => <EquipmentRow key={eq.id} eq={eq} />)}
                            </div>
                        )}
                    </div>

                    {/* Linked Courses */}
                    {recipe.courseMenus?.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Tag size={14} className="text-green-500" />
                                <span className="text-sm font-semibold text-gray-700">ใช้ในคอร์ส</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {recipe.courseMenus.map(cm => (
                                    <span key={cm.id} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                                        {cm.product.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function AddRecipeModal({ onClose, onSaved, ingredients }) {
    const [form, setForm] = useState({
        name: '', description: '', category: '', sellingPrice: '', estimatedCost: ''
    });
    const [recipeIngredients, setRecipeIngredients] = useState([]);
    const [equipment, setEquipment] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const addIngredientRow = () => setRecipeIngredients(r => [...r, { ingredientId: '', qtyPerPerson: '', unit: '' }]);
    const removeIngredient = i => setRecipeIngredients(r => r.filter((_, idx) => idx !== i));
    const setIngredient = (i, k, v) => setRecipeIngredients(r => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

    const addEquipmentRow = () => setEquipment(e => [...e, { name: '', unit: 'piece', qtyRequired: '', currentStock: '', minStock: '', notes: '' }]);
    const removeEquipment = i => setEquipment(e => e.filter((_, idx) => idx !== i));
    const setEquipmentField = (i, k, v) => setEquipment(e => e.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

    const handleSave = async () => {
        if (!form.name.trim()) { setError('กรุณาระบุชื่อสูตร'); return; }
        setSaving(true); setError('');
        try {
            const res = await fetch('/api/recipes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    ingredients: recipeIngredients.filter(r => r.ingredientId && r.qtyPerPerson),
                    equipment: equipment.filter(e => e.name && e.qtyRequired)
                })
            });
            if (!res.ok) { const d = await res.json(); setError(d.error || 'เกิดข้อผิดพลาด'); return; }
            const data = await res.json();
            onSaved(data);
        } catch {
            setError('เกิดข้อผิดพลาด');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <BookOpen size={20} className="text-amber-500" /> เพิ่มสูตรใหม่
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-5">
                    {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อสูตร *</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" value={form.name} onChange={e => set('name', e.target.value)} placeholder="เช่น ราเมนซุปมิโซ" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่</label>
                            <select className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" value={form.category} onChange={e => set('category', e.target.value)}>
                                <option value="">-- เลือก --</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ราคาขาย (฿)</label>
                            <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" value={form.sellingPrice} onChange={e => set('sellingPrice', e.target.value)} placeholder="0" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ต้นทุนรวม (฿)</label>
                            <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" value={form.estimatedCost} onChange={e => set('estimatedCost', e.target.value)} placeholder="0" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย</label>
                            <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="รายละเอียดสูตรอาหาร..." />
                        </div>
                    </div>

                    {/* Ingredients */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700 flex items-center gap-1"><FlaskConical size={14} className="text-blue-500" /> วัตถุดิบ</span>
                            <button onClick={addIngredientRow} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 flex items-center gap-1"><Plus size={12} /> เพิ่ม</button>
                        </div>
                        <div className="space-y-2">
                            {recipeIngredients.map((row, i) => (
                                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                                    <select className="col-span-5 border rounded px-2 py-1.5 text-xs" value={row.ingredientId} onChange={e => {
                                        const ing = ingredients.find(x => x.id === e.target.value);
                                        setIngredient(i, 'ingredientId', e.target.value);
                                        if (ing) setIngredient(i, 'unit', ing.unit);
                                    }}>
                                        <option value="">-- วัตถุดิบ --</option>
                                        {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}
                                    </select>
                                    <input type="number" className="col-span-3 border rounded px-2 py-1.5 text-xs" value={row.qtyPerPerson} onChange={e => setIngredient(i, 'qtyPerPerson', e.target.value)} placeholder="ปริมาณ/คน" />
                                    <input className="col-span-3 border rounded px-2 py-1.5 text-xs" value={row.unit} onChange={e => setIngredient(i, 'unit', e.target.value)} placeholder="หน่วย" />
                                    <button onClick={() => removeIngredient(i)} className="col-span-1 text-red-400 hover:text-red-600"><X size={14} /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Equipment */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700 flex items-center gap-1"><Wrench size={14} className="text-yellow-500" /> อุปกรณ์พิเศษ</span>
                            <button onClick={addEquipmentRow} className="text-xs bg-yellow-50 text-yellow-600 px-2 py-1 rounded-lg hover:bg-yellow-100 flex items-center gap-1"><Plus size={12} /> เพิ่ม</button>
                        </div>
                        <div className="space-y-2">
                            {equipment.map((row, i) => (
                                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                                    <input className="col-span-4 border rounded px-2 py-1.5 text-xs" value={row.name} onChange={e => setEquipmentField(i, 'name', e.target.value)} placeholder="ชื่ออุปกรณ์" />
                                    <input type="number" className="col-span-2 border rounded px-2 py-1.5 text-xs" value={row.qtyRequired} onChange={e => setEquipmentField(i, 'qtyRequired', e.target.value)} placeholder="จำนวน" />
                                    <input className="col-span-2 border rounded px-2 py-1.5 text-xs" value={row.unit} onChange={e => setEquipmentField(i, 'unit', e.target.value)} placeholder="หน่วย" />
                                    <input type="number" className="col-span-2 border rounded px-2 py-1.5 text-xs" value={row.currentStock} onChange={e => setEquipmentField(i, 'currentStock', e.target.value)} placeholder="สต็อก" />
                                    <input type="number" className="col-span-1 border rounded px-2 py-1.5 text-xs" value={row.minStock} onChange={e => setEquipmentField(i, 'minStock', e.target.value)} placeholder="min" />
                                    <button onClick={() => removeEquipment(i)} className="col-span-1 text-red-400 hover:text-red-600"><X size={14} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 p-6 border-t">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">ยกเลิก</button>
                    <button onClick={handleSave} disabled={saving} className="px-6 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        บันทึก
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function RecipePage() {
    const [recipes, setRecipes] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [editRecipe, setEditRecipe] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [rRes, iRes] = await Promise.all([
                fetch('/api/recipes'),
                fetch('/api/kitchen/ingredients')
            ]);
            const [rData, iData] = await Promise.all([rRes.json(), iRes.json()]);
            setRecipes(Array.isArray(rData) ? rData : []);
            setIngredients(Array.isArray(iData) ? iData : []);
        } catch {
            // silent — already handles empty state
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filtered = recipes.filter(r => {
        if (filterCat && r.category !== filterCat) return false;
        if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.recipeId.includes(search)) return false;
        return true;
    });

    const handleSaved = (newRecipe) => {
        setRecipes(prev => [newRecipe, ...prev]);
        setShowAdd(false);
    };

    const lowStockCount = recipes.reduce((acc, r) => {
        const lowIng = r.ingredients.filter(i => i.ingredient.currentStock < i.ingredient.minStock).length;
        const lowEq = r.equipment.filter(e => e.currentStock < e.minStock).length;
        return acc + lowIng + lowEq;
    }, 0);

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <BookOpen className="text-amber-500" /> เมนูสูตรอาหาร
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {recipes.length} สูตร
                        {lowStockCount > 0 && (
                            <span className="ml-2 text-red-500 flex items-center gap-1 inline-flex">
                                <AlertTriangle size={13} /> {lowStockCount} รายการสต็อกต่ำ
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchData} className="p-2 rounded-lg border hover:bg-gray-50 text-gray-500">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => setShowAdd(true)}
                        className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600 text-sm font-medium shadow-sm"
                    >
                        <Plus size={16} /> เพิ่มสูตร
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        className="w-full pl-9 pr-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                        placeholder="ค้นหาสูตร..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                    value={filterCat}
                    onChange={e => setFilterCat(e.target.value)}
                >
                    <option value="">ทุกหมวด</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* Recipe List */}
            {loading ? (
                <div className="flex items-center justify-center py-20 text-gray-400">
                    <Loader2 size={28} className="animate-spin mr-2" /> กำลังโหลด...
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
                    <p>{search || filterCat ? 'ไม่พบสูตรที่ค้นหา' : 'ยังไม่มีสูตรอาหาร กด "เพิ่มสูตร" เพื่อเริ่มต้น'}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(r => (
                        <RecipeCard key={r.id} recipe={r} onEdit={setEditRecipe} />
                    ))}
                </div>
            )}

            {showAdd && (
                <AddRecipeModal
                    onClose={() => setShowAdd(false)}
                    onSaved={handleSaved}
                    ingredients={ingredients}
                />
            )}
        </div>
    );
}
