'use client';

import { useState } from 'react';
import { uploadImage } from '@/lib/api';
// Using Next.js dynamic routing, we get params
import { useParams } from 'next/navigation';

export default function MobileUploadPage() {
    const params = useParams();
    const sessionId = params.sessionId as string;
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [done, setDone] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file || !sessionId) return;
        setUploading(true);
        try {
            await uploadImage(sessionId, file);
            setDone(true);
        } catch (e) {
            alert('アップロードに失敗しました。');
            console.error(e);
        } finally {
            setUploading(false);
        }
    };

    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-green-50 p-6 text-center">
                <div>
                    <div className="text-6xl mb-4">✅</div>
                    <h1 className="text-2xl font-bold text-green-700 mb-2">送信完了！</h1>
                    <p className="text-gray-600">PCの画面を確認してください。</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 p-6 flex flex-col items-center justify-center">
            <h1 className="text-xl font-bold mb-8 text-gray-800">画像アップロード</h1>

            <div className="bg-white p-6 rounded-lg shadow w-full max-w-md">
                <label className="block mb-6 cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition">
                        {file ? (
                            <div className="text-green-600 font-semibold">{file.name}</div>
                        ) : (
                            <div className="text-gray-500">
                                <span className="text-4xl block mb-2">📷</span>
                                <span className="text-sm">カメラを起動 / 画像を選択</span>
                            </div>
                        )}
                    </div>
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </label>

                <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="w-full bg-blue-600 text-white font-bold py-4 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300"
                >
                    {uploading ? '送信中...' : 'PCへ送信'}
                </button>
            </div>
            <p className="mt-8 text-xs text-gray-400">Session ID: {sessionId}</p>
        </div>
    );
}
