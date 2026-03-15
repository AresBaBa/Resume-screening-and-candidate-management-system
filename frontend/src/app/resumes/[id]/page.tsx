'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, User, Mail, Phone, MapPin, Briefcase, GraduationCap, Code, Folder, Save, Edit2, X, Check, Download } from 'lucide-react';
import Header from '@/components/Header';
import { Skeleton } from '@/components/Skeleton';
import { resumeApi } from '@/lib/api/index';
import { useUserStore } from '@/stores/userStore';
import { Resume, Contact, Experience, Education, Project as ProjectType } from '@/types';
import axios from 'axios';

interface EditableFieldProps {
  label: string;
  value: string | undefined;
  onSave: (value: string) => void;
}

function EditableField({ label, value, onSave }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </label>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="input flex-1"
          />
          <button onClick={handleSave} className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded">
            <Check size={18} />
          </button>
          <button onClick={() => setIsEditing(false)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
            <X size={18} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <p className="text-gray-900 dark:text-white flex-1">{value || '-'}</p>
          <button onClick={() => setIsEditing(true)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <Edit2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

const statusConfig = {
  pending: { label: '待处理', color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' },
  processing: { label: '解析中', color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
  completed: { label: '已完成', color: 'text-green-500 bg-green-50 dark:bg-green-900/20' },
  failed: { label: '解析失败', color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
};

export default function ResumeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const resumeId = Number(params.id);
  const fetchedRef = useRef(false);
  const pdfUrlRef = useRef<string | null>(null);

  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'ai' | 'raw'>('info');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

  useEffect(() => {
    const fetchResume = async () => {
      if (fetchedRef.current) return;
      fetchedRef.current = true;
      
      try {
        const response = await resumeApi.get(resumeId);
        setResume(response.data.resume || response.data);
      } catch (error) {
        console.error('获取简历详情失败:', error);
      } finally {
        setLoading(false);
      }
    };

    if (resumeId) {
      fetchResume();
    }
  }, [resumeId]);

  const handleSaveField = async (field: string, value: string) => {
    if (!resume) return;
    
    try {
      const updateData: any = {};
      if (field === 'name' || field === 'email' || field === 'phone' || field === 'city') {
        updateData.ai_contact = { ...resume.ai_contact, [field]: value };
      } else if (field.startsWith('exp_')) {
        const expField = field.replace('exp_', '');
        const expIndex = parseInt(field.split('_')[1] || '0');
        const newExp = [...(resume.ai_experience || [])];
        if (newExp[expIndex]) {
          newExp[expIndex] = { ...newExp[expIndex], [expField]: value };
        }
        updateData.ai_experience = newExp;
      } else if (field.startsWith('edu_')) {
        const eduField = field.replace('edu_', '');
        const newEdu = [...(resume.ai_education || [])];
        newEdu[0] = { ...newEdu[0], [eduField]: value };
        updateData.ai_education = newEdu;
      }
      
      await resumeApi.update(resumeId, updateData);
      setResume({ ...resume, ...updateData });
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  useEffect(() => {
    if (showPdfModal && !pdfUrlRef.current) {
      const loadPdf = async () => {
        setPdfLoading(true);
        try {
          const token = useUserStore.getState().token;
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/resumes/${resumeId}/download`,
            {
              responseType: 'blob',
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            }
          );
          const url = URL.createObjectURL(response.data);
          pdfUrlRef.current = url;
        } catch (error) {
          console.error('加载PDF失败:', error);
        } finally {
          setPdfLoading(false);
        }
      };
      loadPdf();
    }
  }, [showPdfModal, resumeId]);

  const handleOpenPdf = () => {
    setShowPdfModal(true);
  };

  const handleDownload = () => {
    if (pdfUrlRef.current) {
      const link = document.createElement('a');
      link.href = pdfUrlRef.current;
      link.download = resume?.file_name || 'resume.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const [reparsing, setReparsing] = useState(false);

  const handleReparse = async () => {
    if (!resume) return;
    
    setReparsing(true);
    try {
      const response = await resumeApi.reparse(resumeId);
      setResume(response.data.resume);
    } catch (error) {
      console.error('重新解析失败:', error);
    } finally {
      setReparsing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <Header title="简历详情" />
        <div className="p-6">
          <div className="card p-6">
            <Skeleton className="h-8 w-1/3 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <Header title="简历详情" />
        <div className="p-6 text-center">
          <p className="text-gray-500">简历不存在</p>
          <Link href="/resumes" className="btn btn-primary mt-4">
            返回列表
          </Link>
        </div>
      </div>
    );
  }

  const status = statusConfig[resume.parsing_status] || statusConfig.pending;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Header
        title="简历详情"
        actions={
          <Link href="/resumes" className="btn btn-secondary flex items-center gap-2">
            <ArrowLeft size={18} />
            返回列表
          </Link>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                    <FileText className="text-primary-600 dark:text-primary-400" size={32} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {resume.file_name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      上传于 {resume.created_at?.split('T')[0]}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${status.color}`}>
                  {status.label}
                </span>
              </div>

              <div className="flex border-b border-gray-200 dark:border-slate-700 mb-6">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`px-4 py-2 -mb-px text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'info'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  基本信息
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`px-4 py-2 -mb-px text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'ai'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  AI提取信息
                </button>
                <button
                  onClick={() => setActiveTab('raw')}
                  className={`px-4 py-2 -mb-px text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'raw'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  原始数据
                </button>
              </div>

              {activeTab === 'info' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <User size={18} />
                      联系信息
                    </h3>
                    <EditableField
                      label="姓名"
                      value={resume.ai_contact?.name}
                      onSave={(v) => handleSaveField('name', v)}
                    />
                    <EditableField
                      label="邮箱"
                      value={resume.ai_contact?.email}
                      onSave={(v) => handleSaveField('email', v)}
                    />
                    <EditableField
                      label="电话"
                      value={resume.ai_contact?.phone}
                      onSave={(v) => handleSaveField('phone', v)}
                    />
                    <EditableField
                      label="城市"
                      value={resume.ai_contact?.city}
                      onSave={(v) => handleSaveField('city', v)}
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Briefcase size={18} />
                      工作经历
                    </h3>
                    {resume.ai_experience && resume.ai_experience.length > 0 ? (
                      resume.ai_experience.map((exp, index) => (
                        <div key={index} className="mb-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                          <p className="font-medium text-gray-900 dark:text-white">{exp.title}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{exp.company}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{exp.dates}</p>
                          {exp.description && (
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{exp.description}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">暂无工作经历</p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <GraduationCap size={18} />
                      教育背景
                    </h3>
                    {resume.ai_education && resume.ai_education.length > 0 ? (
                      resume.ai_education.map((edu, index) => (
                        <div key={index} className="mb-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                          <p className="font-medium text-gray-900 dark:text-white">{edu.school}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{edu.degree} - {edu.major}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{edu.graduation_date}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">暂无教育背景</p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Folder size={18} />
                      项目经验
                    </h3>
                    {resume.ai_projects && resume.ai_projects.length > 0 ? (
                      resume.ai_projects.map((proj, index) => (
                        <div key={index} className="mb-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                          <p className="font-medium text-gray-900 dark:text-white">{proj.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{proj.role}</p>
                          {proj.tech && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {proj.tech.split(',').map((t, i) => (
                                <span key={i} className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 text-xs rounded-full">
                                  {t.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                          {proj.description && (
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{proj.description}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">暂无项目经验</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'ai' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Code size={18} />
                      技能标签
                    </h3>
                    {resume.ai_skills && resume.ai_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {resume.ai_skills.map((skill, index) => (
                          <span
                            key={index}
                            className="px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">暂无技能信息</p>
                    )}
                  </div>

                  {resume.ai_summary && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        AI简历摘要
                      </h3>
                      <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {resume.ai_summary}
                        </p>
                      </div>
                    </div>
                  )}

                  {resume.ai_score !== undefined && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        AI评分
                      </h3>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                          <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                            {resume.ai_score}
                          </span>
                        </div>
                        {resume.ai_feedback && (
                          <div className="flex-1 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {resume.ai_feedback}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'raw' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    原始解析数据
                  </h3>
                  <pre className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-all">
                    {JSON.stringify(resume.parsed_data || resume.ai_structured || {}, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                文件信息
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">文件名</span>
                  <span className="text-gray-900 dark:text-white text-right truncate ml-2">
                    {resume.file_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">文件类型</span>
                  <span className="text-gray-900 dark:text-white">{resume.file_type || 'PDF'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">文件大小</span>
                  <span className="text-gray-900 dark:text-white">
                    {resume.file_size ? (resume.file_size / 1024 / 1024).toFixed(2) + ' MB' : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">解析状态</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">上传时间</span>
                  <span className="text-gray-900 dark:text-white">
                    {resume.created_at?.replace('T', ' ').split('.')[0]}
                  </span>
                </div>
              </div>
              <button 
                onClick={handleOpenPdf}
                className="w-full btn btn-primary mt-4 flex items-center justify-center gap-2"
              >
                <FileText size={16} />
                查看PDF简历
              </button>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                操作
              </h3>
              <div className="space-y-2">
                <button 
                  onClick={handleReparse}
                  disabled={reparsing}
                  className="w-full btn btn-secondary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {reparsing ? (
                    <>
                      <span className="animate-spin">⟳</span>
                      解析中...
                    </>
                  ) : (
                    <>
                      <Folder size={16} />
                      重新解析
                    </>
                  )}
                </button>
                <button 
                  onClick={handleDownload}
                  className="w-full btn btn-secondary flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  下载简历
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPdfModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowPdfModal(false)}
        >
          <div 
            className="relative w-full h-full max-w-6xl max-h-[90vh] m-4 bg-white dark:bg-slate-800 rounded-lg overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                PDF简历预览
              </h3>
              <button 
                onClick={() => setShowPdfModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {pdfLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">加载中...</div>
                </div>
              ) : pdfUrlRef.current ? (
                <embed
                  src={pdfUrlRef.current}
                  type="application/pdf"
                  className="w-full h-full"
                  title="PDF Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">无法加载PDF</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
