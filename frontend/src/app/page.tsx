'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, FolderOpen, ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import { resumeApi } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ name: string; success: boolean; error?: string }[]>([]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === 'application/pdf' || file.name.endsWith('.pdf')
    );
    if (files.length > 0) {
      await uploadFiles(files);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await uploadFiles(files);
    }
    e.target.value = '';
  };

  const handleDragClick = () => {
    fileInputRef.current?.click();
  };

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    setUploadProgress(files.map(f => ({ name: f.name, success: false })));
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(prev => prev.map((p, idx) => 
          idx === i ? { ...p, success: false } : p
        ));
        
        try {
          const formData = new FormData();
          formData.append('file', file);
          await resumeApi.upload(formData);
          setUploadProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, success: true } : p
          ));
        } catch (error: any) {
          setUploadProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, success: false, error: error.response?.data?.msg || '上传失败' } : p
          ));
        }
      }
    } finally {
      setUploading(false);
    }
  };

  const handleViewResumes = () => {
    router.push('/resumes');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Header 
        title="上传简历"
        subtitle="拖拽或点击上传 PDF 格式简历"
        actions={
          <button
            onClick={handleViewResumes}
            className="btn btn-secondary flex items-center gap-2"
          >
            <FileText size={18} />
            查看简历列表
          </button>
        }
      />
      
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
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
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all ${
                dragActive 
                  ? 'bg-primary-100 dark:bg-primary-900/50' 
                  : 'bg-gray-100 dark:bg-slate-700'
              }`}>
                {dragActive ? (
                  <Upload className="w-12 h-12 text-primary-600 dark:text-primary-400" />
                ) : (
                  <FolderOpen className="w-12 h-12 text-gray-400 dark:text-slate-500" />
                )}
              </div>
              
              <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {dragActive ? '松开鼠标上传文件' : '拖拽PDF文件到此处上传'}
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                或点击此处选择文件
              </p>
              
              <div className="mt-6 flex items-center gap-2 text-sm text-gray-400">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center">
                  <span className="text-xs font-medium">PDF</span>
                </div>
                <span>仅支持 PDF 格式</span>
              </div>
            </div>
          </div>

          {uploading && (
            <div className="mt-6 p-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                <span className="font-medium text-gray-900 dark:text-white">正在上传...</span>
              </div>
              <div className="space-y-2">
                {uploadProgress.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    {item.success ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : item.error ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
                    )}
                    <span className="text-gray-600 dark:text-gray-400 flex-1 truncate">{item.name}</span>
                    {item.success && <span className="text-green-500">上传成功</span>}
                    {item.error && <span className="text-red-500">{item.error}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <button
              onClick={handleViewResumes}
              className="group flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-700 dark:text-gray-300 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-all shadow-sm hover:shadow-md"
            >
              <FileText size={20} />
              <span className="font-medium">查看已上传简历</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
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
                <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">高效管理</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">一站式管理候选人信息，快速筛选</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
