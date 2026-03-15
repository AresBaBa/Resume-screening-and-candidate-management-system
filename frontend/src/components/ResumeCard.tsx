'use client';

import { useRef, useEffect } from 'react';
import { FileText, CheckCircle, AlertCircle, Loader2, X, Sparkles, User, Briefcase, GraduationCap, Code, FolderOpen } from 'lucide-react';

interface ResumeCardData {
  id: string;
  name: string;
  file: File;
  status: 'pending' | 'uploading' | 'analyzing' | 'completed' | 'error';
  progress: number;
  progressMessages: string[];
  thinkingContent?: string;
  error?: string;
  resumeData?: any;
}

interface ResumeCardProps {
  data: ResumeCardData;
  onRemove?: (id: string) => void;
  onView?: (id: string) => void;
}

export default function ResumeCard({ data, onRemove, onView }: ResumeCardProps) {
  const thinkingRef = useRef<HTMLDivElement | null>(null);

  // 自动滚动思维链内容到底部
  useEffect(() => {
    if (thinkingRef.current && data.thinkingContent) {
      thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
    }
  }, [data.thinkingContent]);

  // 根据不同状态返回对应的图标
  const getStatusIcon = () => {
    switch (data.status) {
      case 'uploading':
      case 'analyzing':
        return <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  // 根据不同状态返回对应的文本描述
  const getStatusText = () => {
    switch (data.status) {
      case 'uploading':
        return '上传中';
      case 'analyzing':
        return 'AI 分析中';
      case 'completed':
        return '已完成';
      case 'error':
        return '失败';
      default:
        return '等待中';
    }
  };

  // 根据不同状态返回对应的进度条颜色
  const getProgressColor = () => {
    switch (data.status) {
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-primary-600';
    }
  };

  // 格式化文件大小显示
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col h-full">
      {/* 头部：显示文件名、大小及状态图标 */}
      <div className="p-4 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            data.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30' :
            data.status === 'error' ? 'bg-red-100 dark:bg-red-900/30' :
            'bg-primary-100 dark:bg-primary-900/30'
          }`}>
            {getStatusIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
              {data.name}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {formatFileSize(data.file.size)}
            </p>
          </div>
          {/* 只有未完成时才显示删除按钮 */}
          {onRemove && data.status !== 'completed' && (
            <button
              onClick={() => onRemove(data.id)}
              className="p-1 text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 主体：根据状态显示进度、分析过程或结果摘要 */}
      <div className="p-4 flex-1 overflow-hidden">
        {data.status === 'pending' && (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <span className="text-sm">等待上传...</span>
          </div>
        )}

        {(data.status === 'uploading' || data.status === 'analyzing') && (
          <div className="space-y-3">
            {/* 进度条显示 */}
            <div className="flex items-center gap-2 text-sm">
              <span className={`font-medium ${
                data.status === 'uploading' ? 'text-primary-600 dark:text-primary-400' : 'text-blue-600 dark:text-blue-400'
              }`}>
                {data.status === 'uploading' ? '上传进度' : 'AI 分析'}
              </span>
              <span className="text-gray-500 dark:text-gray-400">{data.progress}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getProgressColor()}`}
                style={{ width: `${data.progress}%` }}
              />
            </div>
            {/* 最近的进度日志消息 */}
            {data.progressMessages.length > 0 && (
              <div className="space-y-1 mt-3">
                {data.progressMessages.slice(-3).map((msg, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {data.status === 'analyzing' ? (
                      <Sparkles className="w-3 h-3 text-blue-500" />
                    ) : (
                      <FolderOpen className="w-3 h-3 text-primary-500" />
                    )}
                    <span>{msg}</span>
                  </div>
                ))}
              </div>
            )}
            {/* AI 思考过程实时展示 (思维链) */}
            {data.thinkingContent && data.status === 'analyzing' && (
              <div 
                ref={thinkingRef}
                className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-600 dark:text-blue-400 max-h-80 overflow-y-auto scrollbar-hide"
              >
                <div className="font-medium mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI 思考中...
                </div>
                <div className="whitespace-pre-wrap font-mono">
                  {data.thinkingContent}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 错误提示 */}
        {data.status === 'error' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-500">{data.error || '处理失败'}</p>
            </div>
          </div>
        )}

        {/* 解析完成后显示结果摘要 */}
        {data.status === 'completed' && data.resumeData && (
          <div className="space-y-3">
            {/* 联系人、教育、工作经验摘要 */}
            {data.resumeData.ai_contact?.name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-primary-500" />
                <span className="text-gray-700 dark:text-gray-300">{data.resumeData.ai_contact.name}</span>
              </div>
            )}
            {data.resumeData.ai_contact?.email && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{data.resumeData.ai_contact.email}</span>
              </div>
            )}
            {data.resumeData.ai_contact?.phone && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{data.resumeData.ai_contact.phone}</span>
              </div>
            )}
            {data.resumeData.ai_education && data.resumeData.ai_education.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <GraduationCap className="w-4 h-4 text-green-500 mt-0.5" />
                <div className="text-gray-700 dark:text-gray-300">
                  {data.resumeData.ai_education[0].school} {data.resumeData.ai_education[0].degree}
                </div>
              </div>
            )}
            {data.resumeData.ai_experience && data.resumeData.ai_experience.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <Briefcase className="w-4 h-4 text-blue-500 mt-0.5" />
                <div className="text-gray-700 dark:text-gray-300">
                  {data.resumeData.ai_experience[0].title} @ {data.resumeData.ai_experience[0].company}
                </div>
              </div>
            )}
            {data.resumeData.ai_skills && data.resumeData.ai_skills.length > 0 && (
              <div className="flex items-start gap-2">
                <Code className="w-4 h-4 text-purple-500 mt-0.5" />
                <div className="flex flex-wrap gap-1">
                  {data.resumeData.ai_skills.slice(0, 4).map((skill: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                  {data.resumeData.ai_skills.length > 4 && (
                    <span className="px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                      +{data.resumeData.ai_skills.length - 4}
                    </span>
                  )}
                </div>
              </div>
            )}
            {data.resumeData.ai_score !== null && data.resumeData.ai_score !== undefined && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700">
                <span className="text-xs text-gray-500 dark:text-gray-400">AI 评分</span>
                <span className={`text-lg font-bold ${
                  data.resumeData.ai_score >= 80 ? 'text-green-500' :
                  data.resumeData.ai_score >= 60 ? 'text-yellow-500' :
                  'text-red-500'
                }`}>
                  {Math.round(data.resumeData.ai_score)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {data.status === 'completed' && onView && (
        <div className="p-3 border-t border-gray-100 dark:border-slate-700">
          <button
            onClick={() => onView(data.id)}
            className="w-full btn btn-secondary py-1.5 text-sm"
          >
            查看详情
          </button>
        </div>
      )}
    </div>
  );
}
