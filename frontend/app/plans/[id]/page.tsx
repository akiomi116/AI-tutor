'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getPlan, updatePlanItem } from '@/lib/api';

interface PlanItem {
    id: number;
    content: string;
    priority: number;
    due_date?: string;
    is_completed: boolean;
}

interface Plan {
    id: number;
    title: string;
    target?: string;
    created_at: string;
    items: PlanItem[];
}

import { use } from 'react';

export default function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [plan, setPlan] = useState<Plan | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            getPlan(Number(id))
                .then(setPlan)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [id]);

    const handleToggle = async (itemId: number, currentStatus: boolean) => {
        // Optimistic update
        setPlan(prev => {
            if (!prev) return null;
            return {
                ...prev,
                items: prev.items.map(item =>
                    item.id === itemId ? { ...item, is_completed: !currentStatus } : item
                )
            };
        });

        try {
            await updatePlanItem(Number(id), itemId, !currentStatus);
        } catch (e) {
            console.error(e);
            // Revert on error
            setPlan(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    items: prev.items.map(item =>
                        item.id === itemId ? { ...item, is_completed: currentStatus } : item
                    )
                };
            });
            alert('更新に失敗しました');
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">読み込み中...</div>;
    if (!plan) return <div className="min-h-screen flex items-center justify-center text-red-500">計画が見つかりません</div>;

    const completedCount = plan.items.filter(i => i.is_completed).length;
    const progress = plan.items.length > 0 ? (completedCount / plan.items.length) * 100 : 0;

    const sortedItems = plan ? [...plan.items].sort((a, b) => {
        if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
        return a.priority - b.priority;
    }) : [];

    const nextMission = sortedItems.find(i => !i.is_completed);

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-8 font-bold text-sm">
                    ← ダッシュボードに戻る
                </Link>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 mb-2">{plan?.title}</h1>
                        <p className="text-slate-500 font-medium">作成日: {plan && new Date(plan.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="bg-white px-6 py-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">達成率</div>
                            <div className="text-2xl font-black text-indigo-600">
                                {plan ? Math.round((plan.items.filter(i => i.is_completed).length / plan.items.length) * 100) : 0}%
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black">
                            {plan?.items.filter(i => i.is_completed).length}/{plan?.items.length}
                        </div>
                    </div>
                </div>

                {nextMission && (
                    <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white mb-12 shadow-2xl shadow-indigo-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-10 text-8xl font-black italic">NEXT</div>
                        <div className="relative z-10">
                            <div className="bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block mb-4">
                                現在のミッション
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black mb-8 leading-tight">
                                {nextMission.content}
                            </h2>
                            <button
                                onClick={() => handleToggle(nextMission.id, false)}
                                className="bg-white text-indigo-600 px-10 py-5 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-xl"
                            >
                                完了にする ✨
                            </button>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-8 flex items-center gap-2">
                        <span>📋</span> 全てのステップ
                    </h3>
                    <div className="space-y-4">
                        {sortedItems.map((item) => (
                            <div
                                key={item.id}
                                className={`flex items-center gap-6 p-6 rounded-3xl transition-all border ${item.is_completed
                                        ? 'bg-slate-50 border-transparent opacity-60'
                                        : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md'
                                    }`}
                            >
                                <button
                                    onClick={() => handleToggle(item.id, item.is_completed)}
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${item.is_completed
                                            ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-100'
                                            : 'bg-slate-100 text-transparent hover:bg-slate-200'
                                        }`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                <div className={`flex-1 font-bold text-lg ${item.is_completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                    {item.content}
                                </div>
                                {!item.is_completed && (
                                    <div className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${item.priority === 1 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                        {item.priority === 1 ? '優先' : '通常'}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
