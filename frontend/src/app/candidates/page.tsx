'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, Filter, Users, ChevronDown, ChevronUp, Star, MapPin, Mail, Phone, Eye, X, Check, XCircle, GitCompare, FileText, Grid, List } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useToast } from '@/components/Toast';
import { useLoading } from '@/components/Loading';
import Header from '@/components/Header';
import { Skeleton } from '@/components/Skeleton';
import { Pagination } from '@/components/Pagination';
import axios from 'axios';
import { jobApi, candidateApi } from '@/lib/api';
import { useUserStore } from '@/stores/userStore';
import { JobApplication, Job } from '@/types';

const statusConfig = {
  pending: { label: '待筛选', color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' },
  screening: { label: '筛选中', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
  pass: { label: '通过', color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
  interviewing: { label: '面试中', color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
  hired: { label: '已录用', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
  rejected: { label: '已拒绝', color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
};

export default function CandidatesPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.id ? Number(params.id) : null;
  const jobsFetchedRef = useRef(false);
  const candidatesFetchedRef = useRef(false);

  const [candidates, setCandidates] = useState<JobApplication[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<number | null>(jobId);
  const [selectedCandidate, setSelectedCandidate] = useState<JobApplication | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    city: '',
    status: '',
    minScore: '',
    maxScore: '',
    skill: '',
    sortBy: 'matching_score',
    sortOrder: 'desc',
  });

  const [initialized, setInitialized] = useState(false);
  const { showToast } = useToast();
  const { setLoading: setGlobalLoading } = useLoading();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      if (jobsFetchedRef.current) return;
      jobsFetchedRef.current = true;
      
      try {
        const response = await jobApi.list({ status: 'open' });
        const data = response.data;
        const jobsData = Array.isArray(data) ? data : (data?.jobs || data?.items || []);
        setJobs(jobsData);
        
        if (!selectedJob && jobsData.length > 0) {
          setSelectedJob(jobsData[0].id);
        }
        
        setInitialized(true);
      } catch (error) {
        console.error('获取岗位列表失败:', error);
        setJobs([]);
        setInitialized(true);
      }
    };
    
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialized && selectedJob) {
      candidatesFetchedRef.current = false;
      fetchCandidates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJob, filters, initialized, page, perPage]);

  const fetchCandidates = async () => {
    setLoading(true);
    setGlobalLoading(true);
    try {
      const params: any = { page, per_page: perPage };
      if (selectedJob) params.job_id = selectedJob;
      if (filters.search) params.search = filters.search;
      if (filters.minScore) params.min_score = Number(filters.minScore);
      if (filters.maxScore) params.max_score = Number(filters.maxScore);
      if (filters.status) params.status = filters.status;
      if (filters.city) params.city = filters.city;
      if (filters.skill) params.skill = filters.skill;
      if (filters.sortBy) params.sort_by = filters.sortBy;
      if (filters.sortOrder) params.sort_order = filters.sortOrder;

      const response = await candidateApi.list(params);
      let fetchedCandidates: JobApplication[] = [];
      const data = response.data;
      if (Array.isArray(data)) {
        fetchedCandidates = data;
      } else if (data && Array.isArray(data.candidates)) {
        fetchedCandidates = data.candidates;
      } else if (data && Array.isArray(data.items)) {
        fetchedCandidates = data.items;
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        fetchedCandidates = fetchedCandidates.filter((c: JobApplication) => {
          const nameMatch = c.applicant_name?.toLowerCase().includes(searchLower);
          const emailMatch = c.applicant_email?.toLowerCase().includes(searchLower);
          const cityMatch = c.applicant_city?.toLowerCase().includes(searchLower);
          const skillMatch = c.resume?.ai_skills?.some((s: string) => s.toLowerCase().includes(searchLower));
          const schoolMatch = c.resume?.ai_education?.some((e: any) => 
            e.school?.toLowerCase().includes(searchLower) || e.degree?.toLowerCase().includes(searchLower)
          );
          return nameMatch || emailMatch || cityMatch || skillMatch || schoolMatch;
        });
      }

      setCandidates(fetchedCandidates);
      setTotal(fetchedCandidates.length);
    } catch (error) {
      console.error('获取候选人列表失败:', error);
      showToast('error', '获取候选人列表失败，请稍后重试');
      setCandidates([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  };

  const handleStatusChange = async (candidateId: number, status: string) => {
    try {
      await candidateApi.updateStatus(candidateId, status);
      setCandidates(candidates.map(c => 
        c.id === candidateId ? { ...c, status: status as any } : c
      ));
      if (selectedCandidate?.id === candidateId) {
        setSelectedCandidate({ ...selectedCandidate, status: status as any });
      }
    } catch (error) {
      console.error('更新状态失败:', error);
    }
  };

  const handleBatchStatusChange = async (status: string) => {
    try {
      await Promise.all(
        selectedCandidates.map(id => candidateApi.updateStatus(id, status))
      );
      setCandidates(candidates.map(c => 
        selectedCandidates.includes(c.id) ? { ...c, status: status as any } : c
      ));
      setSelectedCandidates([]);
    } catch (error) {
      console.error('批量更新状态失败:', error);
    }
  };

  const handleSelectCandidate = (id: number) => {
    setSelectedCandidates(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      if (prev.length >= 3) {
        alert('最多只能选择3个候选人进行对比');
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleOpenPdf = async (candidate: any) => {
    try {
      const token = useUserStore.getState().token;
      const response = await axios.get(
        `/api/resumes/${candidate.resume_id}/download`,
        {
          responseType: 'blob',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      const url = URL.createObjectURL(response.data);
      setPdfUrl(url);
      setShowPdfModal(true);
    } catch (error) {
      console.error('加载PDF失败:', error);
      showToast('error', '加载PDF失败');
    }
  };

  const handleCompare = () => {
    if (selectedCandidates.length < 2) {
      showToast('info', '请至少选择2个候选人进行对比');
      return;
    }
    if (selectedCandidates.length > 3) {
      showToast('info', '对比功能最多支持3个候选人，已自动选择前3个');
    }
    setShowCompare(true);
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score?: number) => {
    if (!score) return 'bg-gray-100 dark:bg-gray-800';
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  const currentJob = jobs.find(j => j.id === selectedJob);
  const compareCandidates = candidates.filter(c => selectedCandidates.slice(0, 3).includes(c.id));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Header
        title="候选人"
        subtitle={currentJob ? `岗位：${currentJob.title}` : '候选人筛选与管理'}
        actions={
          selectedCandidates.length >= 2 && (
            <button
              onClick={handleCompare}
              className="btn btn-primary flex items-center gap-2"
            >
              <GitCompare size={18} />
              对比 ({selectedCandidates.length})
            </button>
          )
        }
      />

      <div className="p-6 flex flex-col min-h-[calc(100vh-64px)]">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-6">
            <select
              value={selectedJob || ''}
              onChange={(e) => setSelectedJob(Number(e.target.value) || null)}
              className="input w-64"
            >
              <option value="">选择岗位</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="搜索候选人..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="input pl-10"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="input w-32"
          >
            <option value="">全部状态</option>
            <option value="pending">待筛选</option>
            <option value="screening">筛选中</option>
            <option value="pass">通过</option>
            <option value="interviewing">面试中</option>
            <option value="hired">已录用</option>
            <option value="rejected">已拒绝</option>
          </select>

          <input
            type="number"
            placeholder="最低分"
            value={filters.minScore}
            onChange={(e) => setFilters({ ...filters, minScore: e.target.value })}
            className="input w-24 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <input
            type="number"
            placeholder="最高分"
            value={filters.maxScore}
            onChange={(e) => setFilters({ ...filters, maxScore: e.target.value })}
            className="input w-24 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {selectedCandidates.length > 0 && (
          <div className="mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg flex items-center justify-between">
            <span className="text-sm text-primary-700 dark:text-primary-300">
              已选择 {selectedCandidates.length} 个候选人
            </span>
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBatchStatusChange(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="input py-1 text-sm w-40"
                defaultValue=""
              >
                <option value="">批量修改状态</option>
                <option value="pass">通过</option>
                <option value="interviewing">安排面试</option>
                <option value="rejected">拒绝</option>
              </select>
              <button
                onClick={handleCompare}
                disabled={selectedCandidates.length < 2}
                className="btn btn-primary py-1 text-sm disabled:opacity-50 whitespace-nowrap flex items-center gap-1"
              >
                <GitCompare size={14} />
                对比
              </button>
              <button
                onClick={() => setSelectedCandidates([])}
                className="btn btn-secondary py-1 text-sm"
              >
                清除选择
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-16 w-16 text-gray-300 dark:text-slate-600 mb-4" />
            <p className="text-lg text-gray-500 dark:text-gray-400">暂无候选人</p>
            <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
              请先在岗位管理中进行AI匹配
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                共 {total} 个候选人
              </p>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-slate-600 shadow-sm text-primary-600'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  title="表格视图"
                >
                  <List size={18} />
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === 'card'
                      ? 'bg-white dark:bg-slate-600 shadow-sm text-primary-600'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  title="卡片视图"
                >
                  <Grid size={18} />
                </button>
              </div>
            </div>
            {viewMode === 'table' ? (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-30">
                    选择
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    候选人
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    联系方式
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    匹配分数
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    技能匹配
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {candidates.map((candidate) => {
                  const status = statusConfig[candidate.status] || statusConfig.pending;
                  const isSelected = selectedCandidates.includes(candidate.id);

                  return (
                    <tr
                      key={candidate.id}
                      className={`hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${
                        isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                      }`}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectCandidate(candidate.id)}
                          className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary-600 dark:text-primary-400 font-medium">
                              {(candidate.applicant_name || 'C')[0].toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p 
                              className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]"
                              title={candidate.applicant_name || '未知'}
                            >
                              {candidate.applicant_name || '未知'}
                            </p>
                            {candidate.resume?.ai_skills && (
                              <p 
                                className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]"
                                title={candidate.resume.ai_skills.join(', ')}
                              >
                                {candidate.resume.ai_skills.slice(0, 3).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1 min-w-0">
                          {candidate.applicant_email && (
                            <p 
                              className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1 truncate max-w-[180px]"
                              title={candidate.applicant_email}
                            >
                              <Mail size={12} className="flex-shrink-0" />
                              <span className="truncate">{candidate.applicant_email}</span>
                            </p>
                          )}
                          {candidate.applicant_phone && (
                            <p 
                              className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1 truncate max-w-[180px]"
                              title={candidate.applicant_phone}
                            >
                              <Phone size={12} className="flex-shrink-0" />
                              <span className="truncate">{candidate.applicant_phone}</span>
                            </p>
                          )}
                          {candidate.applicant_city && (
                            <p 
                              className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate max-w-[180px]"
                              title={candidate.applicant_city}
                            >
                              <MapPin size={12} className="flex-shrink-0" />
                              <span className="truncate">{candidate.applicant_city}</span>
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${getScoreBg(candidate.matching_score)}`}>
                            <Star size={14} className={getScoreColor(candidate.matching_score)} />
                            <span className={`font-semibold ${getScoreColor(candidate.matching_score)}`}>
                              {candidate.matching_score || '-'}
                            </span>
                          </div>
                          <div className="flex gap-2 text-xs">
                            <span className="text-gray-500">技能 {candidate.skill_score || '-'}</span>
                            <span className="text-gray-500">经验 {candidate.experience_score || '-'}</span>
                            <span className="text-gray-500">学历 {candidate.education_score || '-'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {candidate.matching_data?.matched_skills?.slice(0, 3).map((skill, i) => (
                            <span key={i} className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs rounded-full">
                              {skill}
                            </span>
                          ))}
                          {candidate.matching_data?.missing_skills?.slice(0, 2).map((skill, i) => (
                            <span key={i} className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-full">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={candidate.status}
                          onChange={(e) => handleStatusChange(candidate.id, e.target.value)}
                          className={`text-sm px-2.5 py-1 rounded-full border-0 cursor-pointer ${status.color}`}
                        >
                          <option value="pending">待筛选</option>
                          <option value="screening">筛选中</option>
                          <option value="pass">通过</option>
                          <option value="interviewing">面试中</option>
                          <option value="hired">已录用</option>
                          <option value="rejected">已拒绝</option>
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedCandidate(candidate)}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                            title="查看详情"
                          >
                            <Eye size={16} className="text-gray-600 dark:text-gray-300" />
                          </button>
                          {candidate.resume && (
                            <Link
                              href={`/resumes/${candidate.resume.id}`}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                              title="查看简历"
                            >
                              <Eye size={16} className="text-primary-600 dark:text-primary-400" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {candidates.map((candidate) => {
                  const status = statusConfig[candidate.status] || statusConfig.pending;
                  const isSelected = selectedCandidates.includes(candidate.id);

                  return (
                    <div
                      key={candidate.id}
                      className={`card p-4 hover:shadow-lg transition-shadow cursor-pointer ${
                        isSelected ? 'ring-2 ring-primary-500' : ''
                      }`}
                      onClick={() => setSelectedCandidate(candidate)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                            <span className="text-xl text-primary-600 dark:text-primary-400 font-medium">
                              {(candidate.applicant_name || 'C')[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {candidate.applicant_name || '未知'}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {candidate.applicant_city || '-'}
                            </p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectCandidate(candidate.id);
                          }}
                          className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                        <div className={`text-lg font-bold ${getScoreColor(candidate.matching_score)}`}>
                          {candidate.matching_score || '-'}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {candidate.resume?.ai_skills && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">技能</p>
                            <div className="flex flex-wrap gap-1">
                              {candidate.resume.ai_skills.slice(0, 4).map((skill, i) => (
                                <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-xs rounded-full">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (candidate.resume_id) {
                              handleOpenPdf(candidate);
                            }
                          }}
                          disabled={!candidate.resume_id}
                          className="flex-1 btn btn-secondary py-1 text-xs disabled:opacity-50"
                        >
                          查看简历
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCandidate(candidate.id);
                          }}
                          className={`flex-1 btn py-1 text-xs ${
                            isSelected
                              ? 'bg-primary-600 text-white hover:bg-primary-700'
                              : 'btn-primary'
                          }`}
                        >
                          {isSelected ? '已选择' : '选择'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {selectedCandidate && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCandidate(null)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                候选人详情
              </h2>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                  <span className="text-2xl text-primary-600 dark:text-primary-400 font-medium">
                    {(selectedCandidate.applicant_name || 'C')[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedCandidate.applicant_name || '未知'}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {selectedCandidate.applicant_email && (
                      <span className="flex items-center gap-1">
                        <Mail size={14} />
                        {selectedCandidate.applicant_email}
                      </span>
                    )}
                    {selectedCandidate.applicant_phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={14} />
                        {selectedCandidate.applicant_phone}
                      </span>
                    )}
                    {selectedCandidate.applicant_city && (
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {selectedCandidate.applicant_city}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-lg ${getScoreBg(selectedCandidate.matching_score)} text-center`}>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedCandidate.matching_score || '-'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">综合评分</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-center">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedCandidate.skill_score || '-'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">技能评分</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-center">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedCandidate.experience_score || '-'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">经验评分</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-center">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedCandidate.education_score || '-'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">学历评分</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2 text-center text-sm">能力综合素质</h4>
                  <ReactECharts
                    option={{
                      radar: {
                        indicator: [
                          { name: '综合', max: 100 },
                          { name: '技能', max: 100 },
                          { name: '经验', max: 100 },
                          { name: '学历', max: 100 }
                        ],
                        radius: '55%',
                        axisName: {
                          color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#6b7280',
                          fontSize: 11
                        }
                      },
                      series: [{
                        type: 'radar',
                        data: [{
                          value: [
                            selectedCandidate.matching_score || 0,
                            selectedCandidate.skill_score || 0,
                            selectedCandidate.experience_score || 0,
                            selectedCandidate.education_score || 0
                          ],
                          name: '能力评分',
                          areaStyle: {
                            color: 'rgba(99, 102, 241, 0.3)'
                          },
                          lineStyle: {
                            color: '#6366f1',
                            width: 2
                          },
                          itemStyle: {
                            color: '#6366f1'
                          }
                        }]
                      }],
                      tooltip: {
                        trigger: 'item'
                      }
                    }}
                    style={{ height: '180px', width: '100%' }}
                  />
                </div>
              </div>

              {selectedCandidate.matching_data && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">技能匹配详情</h4>
                  <div className="space-y-3">
                    {selectedCandidate.matching_data.matched_skills && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">已匹配技能</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedCandidate.matching_data.matched_skills.map((skill, i) => (
                            <span key={i} className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm rounded-full">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedCandidate.matching_data.missing_skills && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">缺失技能</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedCandidate.matching_data.missing_skills.map((skill, i) => (
                            <span key={i} className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-full">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedCandidate.matching_data.preferred_skills && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">加分技能</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedCandidate.matching_data.preferred_skills.map((skill, i) => (
                            <span key={i} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm rounded-full">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedCandidate.ai_comment && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">AI评价</h4>
                  <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {selectedCandidate.ai_comment}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-slate-700">
                {selectedCandidate.resume_id && (
                  <button
                    onClick={() => handleOpenPdf(selectedCandidate)}
                    className="flex-1 btn btn-secondary flex items-center justify-center gap-2"
                  >
                    <FileText size={16} />
                    查看PDF简历
                  </button>
                )}
                <button
                  onClick={() => handleStatusChange(selectedCandidate.id, 'pass')}
                  className="flex-1 btn bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  通过
                </button>
                <button
                  onClick={() => handleStatusChange(selectedCandidate.id, 'interviewing')}
                  className="flex-1 btn bg-purple-600 text-white hover:bg-purple-700 flex items-center justify-center gap-2"
                >
                  <Users size={16} />
                  安排面试
                </button>
                <button
                  onClick={() => handleStatusChange(selectedCandidate.id, 'rejected')}
                  className="flex-1 btn bg-red-600 text-white hover:bg-red-700 flex items-center justify-center gap-2"
                >
                  <XCircle size={16} />
                  拒绝
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPdfModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => {
            setShowPdfModal(false);
            if (pdfUrl) {
              URL.revokeObjectURL(pdfUrl);
              setPdfUrl(null);
            }
          }}
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
                onClick={() => {
                  setShowPdfModal(false);
                  if (pdfUrl) {
                    URL.revokeObjectURL(pdfUrl);
                    setPdfUrl(null);
                  }
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {pdfUrl ? (
                <embed
                  src={pdfUrl}
                  type="application/pdf"
                  className="w-full h-full"
                  title="PDF Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">加载中...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCompare && compareCandidates.length >= 2 && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCompare(false)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                候选人对比
              </h2>
              <button
                onClick={() => setShowCompare(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {compareCandidates.map((candidate, idx) => (
                    <div key={candidate.id} className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                          <span className="text-lg text-primary-600 dark:text-primary-400 font-medium">
                            {(candidate.applicant_name || 'C')[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                            {candidate.applicant_name || '未知'}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {candidate.applicant_city || '-'}
                          </p>
                        </div>
                      </div>
                      <ReactECharts
                        option={{
                          radar: {
                            indicator: [
                              { name: '综合', max: 100 },
                              { name: '技能', max: 100 },
                              { name: '经验', max: 100 },
                              { name: '学历', max: 100 }
                            ],
                            radius: '50%',
                            axisName: {
                              color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#6b7280',
                              fontSize: 10
                            }
                          },
                          series: [{
                            type: 'radar',
                            data: [{
                              value: [
                                candidate.matching_score || 0,
                                candidate.skill_score || 0,
                                candidate.experience_score || 0,
                                candidate.education_score || 0
                              ],
                              name: candidate.applicant_name || '候选人',
                              areaStyle: {
                                color: idx === 0 ? 'rgba(99, 102, 241, 0.3)' : 'rgba(236, 72, 153, 0.3)'
                              },
                              lineStyle: {
                                color: idx === 0 ? '#6366f1' : '#ec4899',
                                width: 2
                              },
                              itemStyle: {
                                color: idx === 0 ? '#6366f1' : '#ec4899'
                              }
                            }]
                          }],
                          tooltip: {
                            trigger: 'item'
                          }
                        }}
                        style={{ height: '150px', width: '100%' }}
                      />
                      <div className="flex justify-center mt-1">
                        <ReactECharts
                          option={{
                            series: [{
                              type: 'pie',
                              radius: ['45%', '70%'],
                              center: ['50%', '50%'],
                              data: [
                                { value: candidate.matching_score || 0, name: '综合', itemStyle: { color: '#6366f1' } },
                                { value: (100 - (candidate.matching_score || 0)), name: '', itemStyle: { color: 'transparent' } }
                              ],
                              label: {
                                show: true,
                                position: 'center',
                                formatter: () => `${candidate.matching_score || '-'}`,
                                fontSize: 12,
                                fontWeight: 'bold',
                                color: document.documentElement.classList.contains('dark') ? '#fff' : '#333'
                              },
                              labelLine: { show: false },
                              tooltip: { show: false }
                            }]
                          }}
                          style={{ height: '50px', width: '80px' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-3">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2 text-center text-sm">各项评分对比</h4>
                  <ReactECharts
                    option={{
                      tooltip: {
                        trigger: 'axis',
                        axisPointer: { type: 'shadow' }
                      },
                      legend: {
                        data: compareCandidates.map(c => c.applicant_name || '未知'),
                        bottom: 0,
                        textStyle: {
                          color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#6b7280'
                        },
                        itemWidth: 12,
                        itemHeight: 12,
                        fontSize: 10
                      },
                      grid: {
                        left: '3%',
                        right: '4%',
                        bottom: '18%',
                        top: '5%',
                        containLabel: true
                      },
                      xAxis: {
                        type: 'value',
                        max: 100,
                        axisLabel: {
                          color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#6b7280',
                          fontSize: 10
                        },
                        splitLine: {
                          lineStyle: {
                            color: document.documentElement.classList.contains('dark') ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                          }
                        }
                      },
                      yAxis: {
                        type: 'category',
                        data: ['综合', '技能', '经验', '学历'],
                        axisLabel: {
                          color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#6b7280',
                          fontSize: 10
                        }
                      },
                      series: compareCandidates.map((candidate, idx) => ({
                        name: candidate.applicant_name || '未知',
                        type: 'bar',
                        data: [
                          candidate.matching_score || 0,
                          candidate.skill_score || 0,
                          candidate.experience_score || 0,
                          candidate.education_score || 0
                        ],
                        itemStyle: {
                          color: idx === 0 ? '#6366f1' : '#ec4899'
                        },
                        label: {
                          show: true,
                          position: 'right',
                          formatter: '{c}',
                          fontSize: 10
                        }
                      }))
                    }}
                    style={{ height: '180px', width: '100%' }}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700">
                      <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">对比项</th>
                      {compareCandidates.map(candidate => (
                        <th key={candidate.id} className="text-center py-3 px-2 font-medium text-gray-700 dark:text-gray-300">
                          {candidate.applicant_name || '未知'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    <tr>
                      <td className="py-3 px-2 text-gray-700 dark:text-gray-300">综合评分</td>
                      {compareCandidates.map(candidate => (
                        <td key={candidate.id} className={`text-center py-3 px-2 text-xl font-bold ${getScoreColor(candidate.matching_score)}`}>
                          {candidate.matching_score || '-'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-2 text-gray-700 dark:text-gray-300">技能评分</td>
                      {compareCandidates.map(candidate => (
                        <td key={candidate.id} className={`text-center py-3 px-2 font-semibold ${getScoreColor(candidate.skill_score)}`}>
                          {candidate.skill_score || '-'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-2 text-gray-700 dark:text-gray-300">经验评分</td>
                      {compareCandidates.map(candidate => (
                        <td key={candidate.id} className={`text-center py-3 px-2 font-semibold ${getScoreColor(candidate.experience_score)}`}>
                          {candidate.experience_score || '-'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-2 text-gray-700 dark:text-gray-300">学历评分</td>
                      {compareCandidates.map(candidate => (
                        <td key={candidate.id} className={`text-center py-3 px-2 font-semibold ${getScoreColor(candidate.education_score)}`}>
                          {candidate.education_score || '-'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-2 text-gray-700 dark:text-gray-300">当前状态</td>
                      {compareCandidates.map(candidate => {
                        const status = statusConfig[candidate.status] || statusConfig.pending;
                        return (
                          <td key={candidate.id} className="text-center py-3 px-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                              {status.label}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="py-3 px-2 text-gray-700 dark:text-gray-300">已匹配技能</td>
                      {compareCandidates.map(candidate => (
                        <td key={candidate.id} className="py-3 px-2">
                          <div className="flex flex-wrap justify-center gap-1">
                            {candidate.matching_data?.matched_skills?.slice(0, 5).map((skill, i) => (
                              <span key={i} className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs rounded-full">
                                {skill}
                              </span>
                            )) || '-'}
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-2 text-gray-700 dark:text-gray-300">缺失技能</td>
                      {compareCandidates.map(candidate => (
                        <td key={candidate.id} className="py-3 px-2">
                          <div className="flex flex-wrap justify-center gap-1">
                            {candidate.matching_data?.missing_skills?.slice(0, 3).map((skill, i) => (
                              <span key={i} className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-full">
                                {skill}
                              </span>
                            )) || '-'}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={() => {
                    compareCandidates.forEach(c => handleStatusChange(c.id, 'pass'));
                    setShowCompare(false);
                  }}
                  className="flex-1 btn bg-green-600 text-white hover:bg-green-700"
                >
                  全部通过
                </button>
                <button
                  onClick={() => setShowCompare(false)}
                  className="flex-1 btn btn-secondary"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && total > 0 && (
        <Pagination
          current={page}
          pageSize={perPage}
          total={total}
          onChange={setPage}
          onPageSizeChange={(size) => {
            setPerPage(size);
            setPage(1);
          }}
          pageSizeOptions={[20, 40, 60]}
        />
      )}
      </div>
    </div>
  );
}
