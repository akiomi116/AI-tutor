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

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/50">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    学習計画一覧
                </h2>
                <Link href="/plans" className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors">
                    すべて見る →
                </Link>
            </div>

            {plans.length === 0 ? (
                <p className="text-gray-500 text-sm">計画はまだありません。</p>
            ) : (
                <ul className="space-y-3">
                    {plans.slice(0, 3).map((plan) => {
                        const completedCount = plan.items.filter(i => i.is_completed).length;
                        const progress = plan.items.length > 0 ? (completedCount / plan.items.length) * 100 : 0;

                        return (
                            <li key={plan.id} className="border-b last:border-0 pb-2 last:pb-0">
                                <Link href={`/plans/${plan.id}`} className="block hover:bg-gray-50 p-2 rounded transition-colors">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-medium text-gray-800">{plan.title}</span>
                                        <span className="text-xs text-gray-500">{new Date(plan.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <div className="text-right text-xs text-gray-600 mt-1">
                                        進捗: {Math.round(progress)}%
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
