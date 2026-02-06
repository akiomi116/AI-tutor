'use client';
import { useState, useEffect } from 'react';
import { getMemos, createMemo, deleteMemo } from '@/lib/api';

interface Memo {
    id: number;
    content: string;
    created_at: string;
}

export default function MemoPad() {
    const [memos, setMemos] = useState<Memo[]>([]);
    const [newMemo, setNewMemo] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadMemos();
        }
    }, [isOpen]);

    const loadMemos = () => {
        getMemos().then(setMemos).catch(console.error);
    };

    const handleCreate = async () => {
        if (!newMemo.trim()) return;
        try {
            await createMemo(newMemo);
            setNewMemo('');
            loadMemos();
        } catch (e) {
            console.error(e);
            alert('メモの保存に失敗しました');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('削除しますか？')) return;
        try {
            await deleteMemo(id);
            loadMemos();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-20 right-6 p-4 bg-yellow-400 text-yellow-900 rounded-full shadow-lg hover:bg-yellow-300 hover:scale-110 transition-all z-50"
                title="メモ帳"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
            </button>

            {/* Memo Panel */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-80 bg-yellow-50 rounded-xl shadow-2xl border border-yellow-200 z-50 flex flex-col max-h-[500px] overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-300">
                    <div className="bg-yellow-100 p-3 border-b border-yellow-200 flex justify-between items-center">
                        <h3 className="font-bold text-yellow-800">クイックメモ</h3>
                        <button onClick={() => reloadMemos()} className="text-xs text-yellow-600 hover:text-yellow-800">更新</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {memos.length === 0 && <p className="text-center text-gray-400 text-sm py-4">メモはありません</p>}
                        {memos.map((memo) => (
                            <div key={memo.id} className="bg-white p-3 rounded shadow-sm border border-yellow-100 group relative">
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{memo.content}</p>
                                <span className="text-xs text-gray-400 block mt-1">{new Date(memo.created_at).toLocaleString()}</span>
                                <button
                                    onClick={() => handleDelete(memo.id)}
                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="p-3 bg-white border-t border-yellow-200">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newMemo}
                                onChange={(e) => setNewMemo(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                placeholder="新しいメモ..."
                                className="flex-1 text-sm p-2 border border-yellow-200 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            />
                            <button
                                onClick={handleCreate}
                                className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded text-sm hover:bg-yellow-300 transition-colors"
                                disabled={!newMemo.trim()}
                            >
                                追加
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    function reloadMemos() {
        loadMemos();
    }
}
