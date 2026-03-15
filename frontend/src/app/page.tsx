'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, FolderOpen, ArrowRight, CheckCircle, AlertCircle, Loader2, X, Plus, Keyboard } from 'lucide-react';
import Header from '@/components/Header';
import { resumeApi } from '@/lib/api';

interface SelectedFile {
  id: string;
  file: File;
  name: string;
  size: number;
}

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ name: string; success: boolean; error?: string }[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (selectedFiles.length > 0 && !uploading) {
          handleUpload();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFiles, uploading]);

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
    const newFiles: SelectedFile[] = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
    }));
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
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
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(selectedFiles.map((f) => ({ name: f.name, success: false })));

    try {
      for (let i = 0; i < selectedFiles.length; i++) { // fixed: use selectedFiles instead of files
        const selectedFile = selectedFiles[i];
        setUploadProgress((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, success: false } : p))
        );

        try {
          const formData = new FormData();
          formData.append('files', selectedFile.file);
          await resumeApi.upload(formData);
          setUploadProgress((prev) =>
            prev.map((p, idx) => (idx === i ? { ...p, success: true } : p))
          );
        } catch (error: any) {
          setUploadProgress((prev) =>
            prev.map((p, idx) =>
              idx === i ? { ...p, success: false, error: error.response?.data?.msg || '上传失败' } : p
            )
          );
        }
      }
    } finally {
      setUploading(false);
    }
  };

  const handleClearAndUpload = () => {
    setSelectedFiles([]);
    setUploadProgress([]);
  };

  const handleViewResumes = () => {
    router.push('/resumes');
  };

  const allUploaded = uploadProgress.length > 0 && uploadProgress.every((p) => p.success);

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
          {uploadProgress.length === 0 || allUploaded ? (
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
          ) : null}

          {selectedFiles.length > 0 && uploadProgress.length === 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  已选择 {selectedFiles.length} 个文件
                </h3>
                <button
                  onClick={handleDragClick}
                  className="btn btn-secondary py-1.5 flex items-center gap-1.5 text-sm"
                >
                  <Plus size={16} />
                  继续添加
                </button>
              </div>
              <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                {selectedFiles.map((file) => (
                  <div
                    key={file.id}
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
                      onClick={() => removeFile(file.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Keyboard size={16} />
                  <span>
                    按 <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-600 rounded text-xs">Ctrl</kbd> +{' '}
                    <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-600 rounded text-xs">Enter</kbd>{' '}
                    快速上传
                  </span>
                </div>
                <button
                  onClick={handleUpload}
                  disabled={uploading || selectedFiles.length === 0}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      上传中...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      上传简历
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {uploading && uploadProgress.length > 0 && !allUploaded && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">上传进度</h3>
              </div>
              <div className="p-4 space-y-2">
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

          {allUploaded && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">上传成功</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  已成功上传 {uploadProgress.length} 个简历文件
                </p>
                <div className="flex justify-center gap-3">
                  <button onClick={handleClearAndUpload} className="btn btn-secondary">
                    继续上传
                  </button>
                  <button onClick={handleViewResumes} className="btn btn-primary">
                    查看简历列表
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedFiles.length === 0 && uploadProgress.length === 0 && (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
