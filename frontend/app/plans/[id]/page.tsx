'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getPlan, updatePlanItem, sendChatMessage } from '@/lib/api';

interface PlanItem {
    id: number;
    content: string;
    priority: number;
    due_date?: string;
    is_completed: boolean;
    understanding_score: number;
    last_result?: string;
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
    const [reportingItemId, setReportingItemId] = useState<number | null>(null);
    const [reportText, setReportText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ [key: number]: string }>({});

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

    const handleReport = async (itemId: number) => {
        if (!reportText.trim()) return;
        setSubmitting(true);
        try {
            // session_id is not strictly required here as missionId links to user/plan, 
            // but we can use a placeholder or leave it undefined
            const res = await sendChatMessage(reportText, undefined, undefined, itemId);

            setFeedback(prev => ({ ...prev, [itemId]: res.response }));
            setReportText('');

            // Update the understanding score and last result in the local state
            if ((res.understanding_score !== undefined && res.understanding_score !== null) || res.extracted_result) {
                setPlan(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        items: prev.items.map(item =>
                            item.id === itemId ? {
                                ...item,
                                understanding_score: res.understanding_score !== undefined && res.understanding_score !== null ? res.understanding_score : item.understanding_score,
                                last_result: res.extracted_result || item.last_result
                            } : item
                        )
                    };
                });
            }
        } catch (e) {
            console.error(e);
            alert('報告に失敗しました');
        } finally {
            setSubmitting(false);
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
                            <div className="flex flex-wrap gap-4">
                                <button
                                    onClick={() => handleToggle(nextMission.id, false)}
                                    className="bg-white text-indigo-600 px-10 py-5 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-xl"
                                >
                                    完了にする ✨
                                </button>
                                <button
                                    onClick={() => setReportingItemId(reportingItemId === nextMission.id ? null : nextMission.id)}
                                    className="bg-indigo-500/30 backdrop-blur-md text-white border border-white/20 px-8 py-5 rounded-2xl font-black hover:bg-indigo-500/50 transition-all"
                                >
                                    ✍️ 実績を報告
                                </button>
                            </div>

                            {reportingItemId === nextMission.id && (
                                <div className="mt-8 bg-white/10 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <h4 className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-4">成果を報告する</h4>
                                    <textarea
                                        value={reportText}
                                        onChange={(e) => setReportText(e.target.value)}
                                        placeholder="学んだことや、終わった内容を具体的に入力してください..."
                                        className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-white placeholder:text-white/40 focus:ring-2 focus:ring-white/30 outline-none min-h-[120px] mb-4 transition-all"
                                    />
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => setReportingItemId(null)}
                                            className="px-6 py-3 text-xs font-bold text-white/70 hover:text-white transition-colors"
                                        >
                                            キャンセル
                                        </button>
                                        <button
                                            onClick={() => handleReport(nextMission.id)}
                                            disabled={submitting || !reportText.trim()}
                                            className="px-8 py-3 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-all disabled:opacity-50"
                                        >
                                            {submitting ? '評価中...' : '報告する'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {feedback[nextMission.id] && (
                                <div className="mt-8 bg-white/20 backdrop-blur-md p-6 rounded-[2rem] border border-white/20 text-white animate-in zoom-in-95 duration-500">
                                    <div className="font-bold flex items-center gap-2 mb-2">
                                        <span>🤖</span> AIからのフィードバック
                                    </div>
                                    <p className="text-sm leading-relaxed opacity-90">{feedback[nextMission.id]}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <span>📋</span> 全てのステップ
                    </h3>
                    <p className="text-xs text-slate-400 mb-8 font-medium">
                        AIと対話して理解度を高めるとスコアが上がります。
                        目標スコア（支援: 60%, 受験: 80%）に達するとチェックを付けて完了できます。
                    </p>
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
                                <div className="flex-1">
                                    <div className={`font-bold text-lg mb-2 ${item.is_completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                        {item.content}
                                    </div>
                                    {!item.is_completed && (
                                        <div className="flex flex-col gap-4 mt-2">
                                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden max-w-xs">
                                                <div
                                                    className="h-full bg-indigo-500 transition-all duration-500"
                                                    style={{ width: `${item.understanding_score}%` }}
                                                ></div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-[10px] font-black text-slate-400">理解度: {item.understanding_score}%</span>
                                                {item.last_result && (
                                                    <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">
                                                        📈 実績: {item.last_result}
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => setReportingItemId(reportingItemId === item.id ? null : item.id)}
                                                    className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md transition-colors"
                                                >
                                                    ✍️ 実績を入力
                                                </button>
                                                <Link
                                                    href={`/?missionId=${item.id}`}
                                                    className="text-[10px] font-black text-slate-400 hover:text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md transition-colors"
                                                >
                                                    💬 AIと相談
                                                </Link>
                                            </div>

                                            {reportingItemId === item.id && (
                                                <div className="mt-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">成果を報告する</h4>
                                                    <textarea
                                                        value={reportText}
                                                        onChange={(e) => setReportText(e.target.value)}
                                                        placeholder="学んだことや、終わった内容を具体的に入力してください..."
                                                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px] mb-3 transition-all"
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => setReportingItemId(null)}
                                                            className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                                        >
                                                            キャンセル
                                                        </button>
                                                        <button
                                                            onClick={() => handleReport(item.id)}
                                                            disabled={submitting || !reportText.trim()}
                                                            className="px-6 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
                                                        >
                                                            {submitting ? '評価中...' : '報告する'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {feedback[item.id] && (
                                                <div className="mt-4 bg-indigo-50 p-4 rounded-2xl border border-indigo-100 text-sm text-indigo-700 animate-in zoom-in-95 duration-300">
                                                    <div className="font-bold flex items-center gap-2 mb-1">
                                                        <span>🤖</span> AIからの評価
                                                    </div>
                                                    {feedback[item.id]}
                                                </div>
                                            )}
                                        </div>
                                    )}
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
