'use client';

import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { createSession, getSessionStatus, sendChatMessage, createPlan } from '@/lib/api';
import VoiceInput from '@/components/VoiceInput';
import PlanListWidget from '@/components/PlanListWidget';
import MemoPad from '@/components/MemoPad';
import Link from 'next/link';

export default function Home() {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string; imageUrl?: string }[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize session for QR upload
  useEffect(() => {
    const initSession = async () => {
      try {
        const data = await createSession();
        setSessionId(data.session_id);
        const url = `http://192.168.10.101:9000/mobile/${data.session_id}`;
        setQrUrl(url);
      } catch (e) {
        console.error("Failed to create session", e);
      }
    };
    initSession();
  }, []);

  // Poll for image upload status
  useEffect(() => {
    if (!sessionId || uploadedImage) return;

    const interval = setInterval(async () => {
      try {
        const status = await getSessionStatus(sessionId);
        if (status.has_image && status.image_path) {
          setUploadedImage(status.image_path);
          setShowQr(false);
          alert("画像がアップロードされました！");
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId, uploadedImage]);

  const handleSend = async () => {
    if (!input.trim() && !uploadedImage) return;

    const userMessage = { role: 'user' as const, content: input, imageUrl: uploadedImage || undefined };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendChatMessage(input, sessionId || undefined, uploadedImage || undefined);
      setMessages((prev) => [...prev, { role: 'ai', content: res.response }]);
    } catch (e) {
      console.error("Chat error", e);
      setMessages((prev) => [...prev, { role: 'ai', content: "申し訳ありません。エラーが発生しました。" }]);
    } finally {
      setLoading(false);
      setUploadedImage(null);
    }
  };

  const saveAsPlan = async (content: string) => {
    const title = prompt("計画のタイトルを入力してください", "新しい学習計画");
    if (!title) return;

    // Simple parser: assumes lines starting with "-" or "*" or "1." are tasks
    const lines = content.split('\n');
    const items = lines
      .filter(line => /^[-\*]|\d+\./.test(line.trim()))
      .map(line => ({
        content: line.replace(/^[-\*]|\d+\.\s*/, '').trim(),
        is_completed: false
      }));

    if (items.length === 0) {
      alert("箇条書きが見つかりませんでした。計画全体を1つのタスクとして保存します。");
      items.push({ content: content.slice(0, 100) + "...", is_completed: false });
    }

    try {
      await createPlan(title, items);
      alert("学習計画を保存しました！");
      // Optionally refresh widget
      window.location.reload(); // Simple reload to refresh widget for MVP
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました");
    }
  };

  return (
    <main className="flex min-h-screen flex-col md:flex-row bg-slate-50">
      {/* Sidebar / Left Panel */}
      <div className="md:w-80 p-6 bg-indigo-50 border-r border-indigo-100 flex flex-col gap-6 overflow-y-auto">
        <h1 className="text-2xl font-bold text-indigo-900">AI家庭教師</h1>

        <PlanListWidget />

        <div className="mt-auto">
          <button
            onClick={() => setShowQr(!showQr)}
            className="w-full bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-xl hover:bg-indigo-100 transition shadow-sm text-sm"
          >
            {showQr ? 'QRを隠す' : '画像をアップロード (QR)'}
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative h-screen">
        {showQr && qrUrl && (
          <div className="absolute top-0 inset-x-0 bg-white/95 backdrop-blur z-40 p-6 shadow-lg border-b flex flex-col items-center animate-in slide-in-from-top-4">
            <h2 className="text-lg font-bold mb-2">スマホで読み取ってください</h2>
            <QRCodeSVG value={qrUrl} size={160} />
            <button onClick={() => setShowQr(false)} className="mt-4 text-sm text-gray-500 underline">閉じる</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
              <div className="text-6xl mb-4">🎓</div>
              <p>学習計画の作成や、問題の解説をお願いしてみよう</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-5 shadow-sm ${msg.role === 'user'
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-none'
                  : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                }`}>
                {msg.imageUrl && (
                  <div className="mb-2 text-xs bg-white/20 px-2 py-1 rounded inline-block">画像添付あり</div>
                )}
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                {msg.role === 'ai' && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => saveAsPlan(msg.content)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium bg-indigo-50 px-3 py-1.5 rounded-full transition-colors"
                    >
                      <span>📅</span> この内容で計画を作成
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl rounded-bl-none p-4 border border-gray-100 shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-white/80 backdrop-blur border-t border-gray-200">
          <div className="max-w-4xl mx-auto flex items-end gap-3">
            <div className="flex-1 relative bg-gray-100 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-200 transition-all">
              {uploadedImage && (
                <div className="absolute -top-12 left-0 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs shadow-sm flex items-center gap-2">
                  <span>📷 画像選択中</span>
                  <button onClick={() => setUploadedImage(null)} className="hover:text-green-900">×</button>
                </div>
              )}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="質問を入力..."
                className="w-full bg-transparent border-0 p-4 focus:ring-0 resize-none max-h-32 text-gray-800 placeholder-gray-400"
                rows={1}
              />
            </div>

            <VoiceInput onTranscript={(text) => setInput((prev) => prev + text)} />

            <button
              onClick={handleSend}
              disabled={loading || (!input.trim() && !uploadedImage)}
              className="bg-indigo-600 text-white p-4 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-indigo-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <MemoPad />
    </main>
  );
}
