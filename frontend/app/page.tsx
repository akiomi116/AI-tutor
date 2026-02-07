'use client';

import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { createSession, getSessionStatus, sendChatMessage, createPlan, getPlans, updatePlanItem, getSettings, updateSettings } from '@/lib/api';
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

  const [currentMission, setCurrentMission] = useState<{ id: number; planId: number; title: string; content: string; understanding_score: number } | null>(null);
  const [settings, setSettings] = useState<{ learning_mode: string } | null>(null);

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
    const initSettings = async () => {
      try {
        const data = await getSettings();
        setSettings(data);
      } catch (e) {
        console.error("Failed to fetch settings", e);
      }
    };
    initSession();
    initSettings();
    fetchNextMission();
  }, []);

  const handleModeChange = async (newMode: string) => {
    try {
      const data = await updateSettings(newMode);
      setSettings(data);
    } catch (e) {
      console.error("Failed to update settings", e);
    }
  };

  const fetchNextMission = async () => {
    try {
      const plans = await getPlans();
      // Find the first uncompleted item across all plans
      // For now, just take the first uncompleted item from the latest plan or priority 1
      for (const plan of plans) {
        // Skip items that look like noise
        const nextItem = plan.items.find((item: any) =>
          !item.is_completed &&
          item.content.trim() !== '--' &&
          item.content.trim().length > 1
        );
        if (nextItem) {
          setCurrentMission({
            id: nextItem.id,
            planId: plan.id,
            title: plan.title,
            content: nextItem.content,
            understanding_score: nextItem.understanding_score || 0
          });
          return;
        }
      }
      setCurrentMission(null);
    } catch (e) {
      console.error("Fetch mission error", e);
    }
  };

  const handleMissionComplete = async () => {
    if (!currentMission) return;
    try {
      await updatePlanItem(currentMission.planId, currentMission.id, true);
      alert("🎉 ミッション達成！おめでとうございます！次へ進みましょう。");
      fetchNextMission();
    } catch (e) {
      console.error(e);
      alert("更新に失敗しました");
    }
  };

  const handleStartMission = () => {
    if (!currentMission) return;
    setInput(`${currentMission.content}について解説してください。どうやって進めればいいですか？`);
    // Scroll to bottom to ensure user sees the input and chat
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

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
    setMessages((prev: any) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendChatMessage(
        input,
        sessionId || undefined,
        uploadedImage || undefined,
        currentMission?.id
      );

      setMessages((prev: any) => [...prev, { role: 'ai', content: res.response }]);

      // Update understanding score if returned
      if (res.understanding_score !== undefined && res.understanding_score !== null && currentMission) {
        if (res.understanding_score > currentMission.understanding_score) {
          setCurrentMission(prev => prev ? { ...prev, understanding_score: res.understanding_score } : null);
        }
      }
    } catch (e) {
      console.error("Chat error", e);
      setMessages((prev: any) => [...prev, { role: 'ai', content: "申し訳ありません。エラーが発生しました。" }]);
    } finally {
      setLoading(false);
      setUploadedImage(null);
    }
  };

  const saveAsPlan = async (content: string) => {
    const title = prompt("この計画に名前を付けて保存しましょう", "テスト勉強プラン");
    if (!title) return;

    const lines = content.split('\n');
    const items = lines
      .map(line => line.trim())
      .filter(line => {
        // Filter out noise: horizontal lines, empty lines after stripping markers, or very short lines
        const stripped = line.replace(/^[-\*\s\d\.]+/, '').trim();
        return stripped.length > 1 && !line.startsWith('---');
      })
      .map((line, index) => {
        // Remove markdown formatting like **...** for the task content display if it wraps the whole line
        const content = line.replace(/^[-\*]|\d+\.\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1').trim();
        return {
          content,
          is_completed: false,
          priority: index < 2 ? 1 : 2
        };
      });

    if (items.length === 0) {
      alert("具体的な課題が見つかりませんでした。メッセージ全体を1つのタスクとして保存します。");
      items.push({ content: content.slice(0, 100).trim() + "...", is_completed: false, priority: 1 });
    }

    try {
      await createPlan(title, items);
      alert("✨ 計画を保存しました！ダッシュボードに最初のミッションが表示されます。");
      fetchNextMission(); // Update mission card
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました");
    }
  };

  return (
    <main className="flex min-h-screen flex-col md:flex-row bg-[#F8FAFC]">
      {/* Sidebar / Left Panel */}
      <div className="md:w-80 p-6 bg-white border-r border-slate-200 flex flex-col gap-8 overflow-y-auto">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-600 rounded-lg text-white font-bold text-xl">🎓</div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">AI家庭教師</h1>
        </div>

        {settings && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">学習スタイル</h3>
            <div className="flex bg-white p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => handleModeChange('supportive')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-black transition-all ${settings.learning_mode === 'supportive'
                  ? 'bg-amber-100 text-amber-700 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-50'
                  }`}
              >
                支援
              </button>
              <button
                onClick={() => handleModeChange('exam')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-black transition-all ${settings.learning_mode === 'exam'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-50'
                  }`}
              >
                受験
              </button>
            </div>
          </div>
        )}

        <PlanListWidget />

        <div className="mt-auto space-y-3">
          <button
            onClick={() => setShowQr(!showQr)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-600 px-4 py-3 rounded-xl hover:bg-slate-100 transition-all font-medium text-sm flex items-center justify-center gap-2"
          >
            {showQr ? 'QRを隠す' : '📷 画像を同期 (スマホ連携)'}
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative h-screen bg-slate-50">
        {showQr && qrUrl && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-md z-50 flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 flex flex-col items-center">
              <h2 className="text-xl font-bold mb-4 text-slate-800">スマホでQRスキャン</h2>
              <QRCodeSVG value={qrUrl} size={200} />
              <p className="mt-4 text-sm text-slate-500 max-w-[200px] text-center">教科書の写真などをアップロードしてAIに質問できます</p>
              <button onClick={() => setShowQr(false)} className="mt-6 px-6 py-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors">閉じる</button>
            </div>
          </div>
        )}

        {/* Hero Mission Section */}
        <div className="px-6 pt-6">
          {currentMission ? (
            <div className="max-w-4xl mx-auto bg-white rounded-[2rem] p-8 shadow-sm border border-indigo-100 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-bl-xl tracking-tighter">FOR YOU</div>
              <div className="flex-1 text-center md:text-left">
                <div className="text-indigo-600/60 text-xs font-bold mb-2 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  現在挑戦中のミッション: {currentMission.title}
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight mb-4">
                  {currentMission.content}
                </h2>

                {/* Understanding Gauge with Mode-aware support */}
                <div className="w-full max-w-md bg-slate-50 rounded-full h-4 overflow-hidden border border-slate-100 relative p-[2px]">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(79,70,229,0.3)] ${settings?.learning_mode === 'exam' ? 'bg-indigo-600' : 'bg-amber-400'
                      }`}
                    style={{ width: `${currentMission.understanding_score}%` }}
                  >
                  </div>
                </div>
                <div className="flex justify-between items-center mt-3 max-w-md">
                  <div className="text-[10px] font-bold text-slate-400 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full border ${settings?.learning_mode === 'exam' ? 'border-indigo-200' : 'border-amber-200'}`}></span>
                    {settings?.learning_mode === 'exam' ? (
                      currentMission.understanding_score < 40 ? "まずは基本事項の確認" :
                        currentMission.understanding_score < 80 ? "論理的に説明できるかチェック" : "合格圏内！完了可能です"
                    ) : (
                      currentMission.understanding_score < 30 ? "AIへの質問から始めよう" :
                        currentMission.understanding_score < 60 ? "良い調子！自分の言葉で話そう" : "ミッションクリア！よく頑張ったね"
                    )}
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${settings?.learning_mode === 'exam' ? 'text-indigo-600 bg-indigo-50' : 'text-amber-700 bg-amber-50'
                    }`}>
                    {currentMission.understanding_score}%
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleStartMission}
                  className={`${settings?.learning_mode === 'exam' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-amber-500 hover:bg-amber-600'
                    } text-white px-6 py-4 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 font-black flex flex-col items-center justify-center gap-1 whitespace-nowrap min-w-[140px]`}
                >
                  <span className="text-lg">✍️</span>
                  <span className="text-sm">解説を聞く</span>
                </button>

                <div className="flex flex-col items-center gap-2">
                  <button
                    disabled={currentMission.understanding_score < (settings?.learning_mode === 'exam' ? 80 : 60)}
                    onClick={handleMissionComplete}
                    className={`px-6 py-4 rounded-2xl transition-all font-bold flex flex-col items-center justify-center gap-1 whitespace-nowrap text-sm min-w-[140px] ${currentMission.understanding_score >= (settings?.learning_mode === 'exam' ? 80 : 60)
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95'
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200'
                      }`}
                  >
                    <span className="text-lg">{currentMission.understanding_score >= (settings?.learning_mode === 'exam' ? 80 : 60) ? '✨' : '🔒'}</span>
                    <span>完了</span>
                  </button>
                  {currentMission.understanding_score < (settings?.learning_mode === 'exam' ? 80 : 60) && (
                    <span className="text-[9px] text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                      理解度 {settings?.learning_mode === 'exam' ? '80' : '60'}% でアンロック
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-[2rem] p-8 flex flex-col items-center justify-center text-slate-400">
              <p className="font-medium">現在設定されたミッションはありません。AIに学習計画の作成を依頼しましょう！</p>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && !currentMission && (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60">
              <div className="text-6xl mb-4 grayscale">🏛️</div>
              <p className="text-sm font-medium">学習の進め方や、わからない問題を詳しく解説します</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[70%] rounded-3xl p-6 shadow-sm ${msg.role === 'user'
                ? 'bg-slate-800 text-white rounded-br-none'
                : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                }`}>
                {msg.imageUrl && (
                  <div className="mb-3 overflow-hidden rounded-xl border border-white/10">
                    <img src={msg.imageUrl} alt="Uploaded content" className="max-h-60 rounded-xl" />
                  </div>
                )}
                <div className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</div>

                {msg.role === 'ai' && (
                  <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end">
                    <button
                      onClick={() => saveAsPlan(msg.content)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-2 font-bold bg-indigo-50 px-4 py-2 rounded-full transition-all hover:bg-indigo-100"
                    >
                      <span>📅</span> この内容をミッションに登録
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl rounded-bl-none p-4 border border-slate-50 shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse delay-75"></div>
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse delay-150"></div>
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

            <VoiceInput onTranscript={(text: string) => setInput((prev: string) => prev + text)} />

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
