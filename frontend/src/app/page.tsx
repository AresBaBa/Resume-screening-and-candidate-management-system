'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, FolderOpen, ArrowRight, X, Plus, Keyboard, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import ResumeCard from '@/components/ResumeCard';
import { resumeApi, StreamUploadMessage } from '@/lib/api';
import { useUserStore } from '@/stores/userStore';

interface ResumeCardData {
  id: string;
  name: string;
  file: File;
  status: 'pending' | 'uploading' | 'analyzing' | 'completed' | 'error';
  progress: number;
  progressMessages: string[];
  error?: string;
  resumeData?: any;
}

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [cardData, setCardData] = useState<ResumeCardData[]>([]);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (selectedFiles.length > 0 && !processing) {
          handleUpload();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (xhrRef.current) {
        xhrRef.current.abort();
      }
    };
  }, [selectedFiles, processing]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === 'application/pdf' || file.name.endsWith('.pdf')
    );
    addFiles(files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      addFiles(files);
    }
    e.target.value = '';
  };

  const addFiles = (files: File[]) => {
    const MAX_FILES = 5;
    setSelectedFiles((prev) => {
      const remainingSlots = MAX_FILES - prev.length;
      if (remainingSlots <= 0) return prev;
      return [...prev, ...files].slice(0, MAX_FILES);
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleUpload = async () => {
    console.log('tazlyx debug: handleUpload called', { selectedFilesLength: selectedFiles.length, processing });
    if (selectedFiles.length === 0 || processing) {
      console.log('tazlyx debug: early return', { selectedFilesLength: selectedFiles.length, processing });
      return;
    }

    console.log('tazlyx debug: starting upload with files:', selectedFiles.map(f => f.name));

    const initialCards: ResumeCardData[] = selectedFiles.map((file, idx) => ({
      id: `card-${idx}-${Date.now()}`,
      name: file.name,
      file,
      status: 'pending',
      progress: 0,
      progressMessages: [],
    }));

    setCardData(initialCards);
    setProcessing(true);

    const { token } = useUserStore.getState();
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    console.log('tazlyx debug: token exists:', !!token, token ? token.substring(0, 50) + '...' : null);
    
    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append('files', file));

    console.log('tazlyx debug: sending fetch request to:', `${API_BASE_URL}/api/resumes/stream-upload`);

    try {
      const response = await fetch(`${API_BASE_URL}/api/resumes/stream-upload`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });

      console.log('tazlyx debug: fetch response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('tazlyx debug: fetch error body:', errorText);
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: StreamUploadMessage = JSON.parse(line.substring(6));
              handleStreamMessage(data);
            } catch (e) {
              console.error('tazlyx debug: Failed to parse SSE data:', e);
            }
          }
        }
      }

      console.log('tazlyx debug: All uploads completed');
      setProcessing(false);
    } catch (error: any) {
      console.error('tazlyx debug: Upload error:', error);
      setProcessing(false);
      setCardData((prev) =>
        prev.map((card) => ({
          ...card,
          status: 'error',
          error: error.message || '网络错误',
        }))
      );
    }
  };

  const handleStreamMessage = (data: StreamUploadMessage) => {
    console.log('tazlyx debug: SSE message:', data);

    if (data.type === 'start') {
      setCardData((prev) =>
        prev.map((card, idx) =>
          idx === data.index ? { ...card, status: 'uploading', progress: 10 } : card
        )
      );
    } else if (data.type === 'progress') {
      setCardData((prev) =>
        prev.map((card) => {
          if (card.name === data.file) {
            const newProgress = card.status === 'uploading' ? Math.min(50, 10 + card.progressMessages.length * 10) : card.progress;
            const isAnalyzing = data.message?.includes('AI') || data.message?.includes('分析');
            return {
              ...card,
              status: isAnalyzing ? 'analyzing' : card.status,
              progress: isAnalyzing ? Math.min(90, 50 + card.progressMessages.length * 5) : newProgress,
              progressMessages: [...card.progressMessages, data.message || ''],
            };
          }
          return card;
        })
      );
    } else if (data.type === 'complete') {
      setCardData((prev) =>
        prev.map((card) =>
          card.name === data.file
            ? { ...card, status: 'completed', progress: 100, resumeData: data.resume }
            : card
        )
      );
    } else if (data.type === 'error') {
      setCardData((prev) =>
        prev.map((card) =>
          card.name === data.file
            ? { ...card, status: 'error', error: data.error }
            : card
        )
      );
    }
  };

  const handleRemoveCard = (id: string) => {
    setCardData((prev) => prev.filter((card) => card.id !== id));
    if (cardData.length === 1) {
      setProcessing(false);
      setSelectedFiles([]);
    }
  };

  const handleViewResume = (id: string) => {
    const card = cardData.find((c) => c.id === id);
    if (card?.resumeData?.id) {
      router.push(`/resumes/${card.resumeData.id}`);
    }
  };

  const handleClearAll = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setCardData([]);
    setSelectedFiles([]);
    setProcessing(false);
  };

  const allCompleted = cardData.length > 0 && cardData.every((card) => card.status === 'completed');
  const hasError = cardData.some((card) => card.status === 'error');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Header
        title="上传简历"
        subtitle="拖拽或点击上传 PDF 格式简历"
        actions={
          <button
            onClick={() => router.push('/resumes')}
            className="btn btn-secondary flex items-center gap-2"
          >
            <FileText size={18} />
            查看简历列表
          </button>
        }
      />

      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {cardData.length === 0 ? (
            <>
              <div
                className={`relative border-2 border-dashed rounded-2xl p-16 text-center transition-all cursor-pointer ${
                  dragActive
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-[1.02]'
                    : 'border-gray-300 dark:border-slate-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={handleDragClick}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />

                <div className="flex flex-col items-center">
                  <div
                    className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all ${
                      dragActive ? 'bg-primary-100 dark:bg-primary-900/50' : 'bg-gray-100 dark:bg-slate-700'
                    }`}
                  >
                    {dragActive ? (
                      <Upload className="w-12 h-12 text-primary-600 dark:text-primary-400" />
                    ) : (
                      <FolderOpen className="w-12 h-12 text-gray-400 dark:text-slate-500" />
                    )}
                  </div>

                  <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {dragActive ? '松开鼠标添加文件' : '拖拽PDF文件到此处上传'}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">或点击此处选择文件</p>

                  <div className="mt-6 flex items-center gap-2 text-sm text-gray-400">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center">
                      <span className="text-xs font-medium">PDF</span>
                    </div>
                    <span>仅支持 PDF 格式</span>
                  </div>
                </div>
              </div>

              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                    <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">快速上传</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">拖拽或点击即可上传简历，支持批量处理</p>
                </div>
                <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">智能解析</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">AI 自动提取简历关键信息，结构化展示</p>
                </div>
                <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">高效管理</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">一站式管理候选人信息，快速筛选</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">处理中...</span>
                    </>
                  ) : (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {allCompleted ? '处理完成' : hasError ? '部分失败' : '等待处理'}
                    </span>
                  )}
                </div>
                {/* <button
                  onClick={handleClearAll}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  清除全部
                </button> */}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ aspectRatio: '4/3' }}>
                {cardData.map((card) => (
                  <div key={card.id} style={{ minHeight: '280px' }}>
                    <ResumeCard
                      data={card}
                      onRemove={!processing ? handleRemoveCard : undefined}
                      onView={card.status === 'completed' ? handleViewResume : undefined}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {selectedFiles.length > 0 && cardData.length === 0 && !processing && (
            <div className="bg-white dark:bg-slate-800 rounded-xl mt-5 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  已选择 {selectedFiles.length}/5 个文件
                </h3>
                {selectedFiles.length < 5 ? (
                  <button
                    onClick={handleDragClick}
                    className="btn btn-secondary py-1.5 flex items-center gap-1.5 text-sm"
                  >
                    <Plus size={16} />
                    继续添加
                  </button>
                ) : (
                  <span className="text-sm text-orange-500">已达到最大数量</span>
                )}
              </div>
              <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="text-primary-600 dark:text-primary-400" size={20} />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1.5 text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <button
                  onClick={() => setSelectedFiles([])}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  清除全部
                </button>
                <button
                  onClick={() => {
                    console.log('tazlyx debug: button clicked');
                    handleUpload();
                  }}
                  disabled={selectedFiles.length === 0 || processing}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Upload size={18} />
                  开始上传并分析
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
