'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Trash2, Eye, Download, RefreshCw, Search, Filter, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';
import { SkeletonResumeCard } from '@/components/Skeleton';
import { resumeApi } from '@/lib/api';
import { Resume } from '@/types';

const statusConfig = {
  pending: { label: '待处理', icon: Clock, color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' },
  processing: { label: '解析中', icon: RefreshCw, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
  completed: { label: '已完成', icon: CheckCircle, color: 'text-green-500 bg-green-50 dark:bg-green-900/20' },
  failed: { label: '解析失败', icon: XCircle, color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
};

export default function ResumesPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fetchedRef = useRef(false);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchResumes = async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.parsing_status = statusFilter;
      const response = await resumeApi.list(params);
      const data = response.data;
      if (Array.isArray(data)) {
        setResumes(data);
      } else if (data && Array.isArray(data.resumes)) {
        setResumes(data.resumes);
      } else if (data && Array.isArray(data.items)) {
        setResumes(data.items);
      } else {
        setResumes([]);
      }
    } catch (error) {
      console.error('获取简历列表失败:', error);
      setResumes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        await resumeApi.upload(formData);
      }
      await fetchResumes();
    } catch (error) {
      console.error('上传失败:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这份简历吗？')) return;
    try {
      await resumeApi.delete(id);
      setResumes(resumes.filter((r) => r.id !== id));
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const handleReparse = async (id: number) => {
    try {
      await resumeApi.reparse(id);
      await fetchResumes();
    } catch (error) {
      console.error('重新解析失败:', error);
    }
  };

  const filteredResumes = resumes.filter((resume) => {
    const matchesSearch = resume.file_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || resume.parsing_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Header
        title="简历管理"
        actions={
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn btn-primary flex items-center gap-2"
          >
            <Upload size={18} />
            {uploading ? '上传中...' : '上传简历'}
          </button>
        }
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="p-6">
        <div
          className={`border-2 border-dashed rounded-xl p-8 mb-6 text-center transition-all ${
            dragActive
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-slate-600 hover:border-primary-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
            拖拽PDF文件到此处上传
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            或点击上方&quot;上传简历&quot;按钮选择文件
          </p>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="搜索简历文件名..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-40"
          >
            <option value="">全部状态</option>
            <option value="pending">待处理</option>
            <option value="processing">解析中</option>
            <option value="completed">已完成</option>
            <option value="failed">解析失败</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <SkeletonResumeCard key={i} />
            ))}
          </div>
        ) : filteredResumes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-16 w-16 text-gray-300 dark:text-slate-600 mb-4" />
            <p className="text-lg text-gray-500 dark:text-gray-400">暂无简历</p>
            <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
              上传PDF简历开始筛选
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResumes.map((resume) => {
              const status = statusConfig[resume.parsing_status] || statusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <div
                  key={resume.id}
                  className="card p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
                      <FileText className="text-primary-600 dark:text-primary-400" size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {resume.file_name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {formatFileSize(resume.file_size)} • {resume.created_at?.split('T')[0]}
                      </p>
                      <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        <StatusIcon size={12} />
                        {status.label}
                      </div>
                    </div>
                  </div>

                  {resume.ai_skills && resume.ai_skills.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {resume.ai_skills.slice(0, 3).map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-xs rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                      {resume.ai_skills.length > 3 && (
                        <span className="px-2 py-0.5 text-gray-400 text-xs">
                          +{resume.ai_skills.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/resumes/${resume.id}`)}
                      className="flex-1 btn btn-secondary py-1.5 text-sm flex items-center justify-center gap-1.5"
                    >
                      <Eye size={14} />
                      查看
                    </button>
                    <button
                      onClick={() => handleReparse(resume.id)}
                      className="p-1.5 btn btn-secondary"
                      title="重新解析"
                    >
                      <RefreshCw size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(resume.id)}
                      className="p-1.5 btn btn-secondary text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
