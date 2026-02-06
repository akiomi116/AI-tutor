'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getPlans } from '@/lib/api';

interface Plan {
    id: number;
    title: string;
    target?: string;
    created_at: string;
    items: { is_completed: boolean }[];
}

export default function PlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getPlans()
            .then(setPlans)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">学習計画一覧</h1>
                        <p className="text-gray-600 mt-2">目標達成に向けて、計画的に進めよう！</p>
                    </div>
                    <Link href="/" className="bg-white/50 hover:bg-white/80 text-gray-700 px-4 py-2 rounded-lg transition-colors">
                        ← ダッシュボードに戻る
                    </Link>
                </header>

                {loading ? (
                    <div className="text-center py-20 text-gray-500">読み込み中...</div>
                ) : plans.length === 0 ? (
                    <div className="text-center py-20 bg-white/60 rounded-3xl shadow-lg">
                        <h2 className="text-xl font-bold text-gray-700 mb-2">まだ計画がありません</h2>
                        <p className="text-gray-500 mb-6">AIチャットで「学習計画を作って」と頼んでみよう！</p>
                        <Link href="/" className="bg-indigo-600 text-white px-6 py-3 rounded-full hover:bg-indigo-700 transition-colors shadow-lg">
                            チャットで作成する
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                        {plans.map((plan) => {
                            const completedCount = plan.items.filter(i => i.is_completed).length;
                            const progress = plan.items.length > 0 ? (completedCount / plan.items.length) * 100 : 0;

                            return (
                                <Link key={plan.id} href={`/plans/${plan.id}`} className="block group">
                                    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/50 hover:scale-105 transition-all duration-300">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h2 className="text-xl font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">{plan.title}</h2>
                                                {plan.target && <p className="text-sm text-gray-500 mt-1">目標: {plan.target}</p>}
                                            </div>
                                            <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                                {new Date(plan.created_at).toLocaleDateString()}
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm font-medium text-gray-600">
                                                <span>進捗状況</span>
                                                <span>{Math.round(progress)}% ({completedCount}/{plan.items.length})</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                                <div
                                                    className={`h-2.5 rounded-full transition-all duration-1000 ease-out ${progress === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                                        }`}
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
