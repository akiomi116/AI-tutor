'use client';
import { useState, useEffect } from 'react';
import { getPlans } from '@/lib/api';
import Link from 'next/link';

interface Plan {
    id: number;
    title: string;
    created_at: string;
    items: { is_completed: boolean }[];
}

export default function PlanListWidget() {
    const [plans, setPlans] = useState<Plan[]>([]);

    useEffect(() => {
        getPlans().then(setPlans).catch(console.error);
    }, []);

    const totalItems = plans.reduce((acc: number, p: any) => acc + (p.items?.length || 0), 0);
    const completedItems = plans.reduce((acc: number, p: any) => acc + (p.items?.filter((i: any) => i.is_completed).length || 0), 0);
    const overallProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                    全体の進捗
                </h2>
                <Link href="/plans" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                    詳細 →
                </Link>
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="28" fill="none" stroke="#F1F5F9" strokeWidth="6" />
                        <circle cx="32" cy="32" r="28" fill="none" stroke="#4F46E5" strokeWidth="6" strokeDasharray={175} strokeDashoffset={175 - (175 * overallProgress) / 100} strokeLinecap="round" />
                    </svg>
                    <span className="absolute text-xs font-black text-slate-700">{Math.round(overallProgress)}%</span>
                </div>
                <div>
                    <div className="text-xl font-black text-slate-800">{completedItems} / {totalItems}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">完了したステップ</div>
                </div>
            </div>

            <div className="space-y-4">
                {plans.slice(0, 2).map((plan: any) => (
                    <div key={plan.id} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-slate-600">
                            <span className="truncate max-w-[150px]">{plan.title}</span>
                            <span>{plan.items?.length > 0 ? Math.round((plan.items.filter((i: any) => i.is_completed).length / plan.items.length) * 100) : 0}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1">
                            <div
                                className="bg-indigo-400 h-1 rounded-full transition-all duration-1000"
                                style={{ width: `${plan.items?.length > 0 ? (plan.items.filter((i: any) => i.is_completed).length / plan.items.length) * 100 : 0}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
