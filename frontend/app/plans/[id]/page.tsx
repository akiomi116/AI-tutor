'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getPlan, updatePlanItem } from '@/lib/api';

interface PlanItem {
    id: number;
    content: string;
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-8">
            <div className="max-w-3xl mx-auto">
                <header className="mb-8">
                    <Link href="/plans" className="text-indigo-600 hover:text-indigo-800 text-sm mb-4 inline-block">
                        ← 一覧に戻る
                    </Link>
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">{plan.title}</h1>
                            {plan.target && <p className="text-lg text-gray-600 mt-2">目標: {plan.target}</p>}
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-indigo-600">{Math.round(progress)}%</div>
                            <div className="text-sm text-gray-500">達成率</div>
                        </div>
                    </div>

                    <div className="w-full bg-white/50 rounded-full h-4 mt-4 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </header>

                <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-white/50">
                    <h2 className="text-xl font-bold text-gray-700 mb-6 border-b pb-2">チェックリスト</h2>
                    <ul className="space-y-4">
                        {plan.items.map((item) => (
                            <li key={item.id} className="group flex items-start p-3 hover:bg-white/50 rounded-xl transition-colors">
                                <input
                                    type="checkbox"
                                    checked={item.is_completed}
                                    onChange={() => handleToggle(item.id, item.is_completed)}
                                    className="mt-1 h-5 w-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                                />
                                <span
                                    className={`ml-3 flex-1 text-gray-800 transition-all ${item.is_completed ? 'line-through text-gray-400' : ''
                                        }`}
                                    onClick={() => handleToggle(item.id, item.is_completed)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {item.content}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
