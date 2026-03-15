'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Briefcase, MapPin, Users, Search, Filter, Trash2, Edit2, Zap, X } from 'lucide-react';
import Header from '@/components/Header';
import { Popconfirm } from '@/components/Popconfirm';
import { SkeletonJobCard } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { Pagination } from '@/components/Pagination';
import { jobApi } from '@/lib/api';
import { Job } from '@/types';

const employmentTypes = {
  'full-time': '全职',
  'part-time': '兼职',
  'contract': '合同制',
  'internship': '实习',
};

const statusConfig = {
  open: { label: '招聘中', color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
  closed: { label: '已关闭', color: 'text-gray-600 bg-gray-50 dark:bg-gray-900/20' },
};

export default function JobsPage() {
  const router = useRouter();
  const fetchedRef = useRef(false);
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [matching, setMatching] = useState<number | null>(null);
  const [skipExistingMap, setSkipExistingMap] = useState<Record<number, boolean>>({});
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [total, setTotal] = useState(0);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    salary_range: '',
    employment_type: 'full-time',
    skills_required: '',
    skills_preferred: '',
    requirements: '',
  });

  useEffect(() => {
    fetchJobs();
  }, [page, perPage, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params: any = { page, per_page: perPage };
      if (statusFilter) params.status = statusFilter;
      const response = await jobApi.list(params);
      const data = response.data;
      if (Array.isArray(data)) {
        setJobs(data);
        setTotal(data.length);
      } else if (data && Array.isArray(data.jobs)) {
        setJobs(data.jobs);
        setTotal(data.total || data.jobs.length);
      } else if (data && Array.isArray(data.items)) {
        setJobs(data.items);
        setTotal(data.total || data.items.length);
      } else {
        setJobs([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('获取岗位列表失败:', error);
      setJobs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        skills_required: formData.skills_required.split(',').map(s => s.trim()).filter(Boolean),
        skills_preferred: formData.skills_preferred.split(',').map(s => s.trim()).filter(Boolean),
        requirements: formData.requirements.split('\n').filter(Boolean),
      };

      if (editingJob) {
        await jobApi.update(editingJob.id, data);
      } else {
        await jobApi.create(data);
      }

      setShowModal(false);
      setEditingJob(null);
      resetForm();
      await fetchJobs();
    } catch (error) {
      console.error('保存岗位失败:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      location: '',
      salary_range: '',
      employment_type: 'full-time',
      skills_required: '',
      skills_preferred: '',
      requirements: '',
    });
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      description: job.description,
      location: job.location || '',
      salary_range: job.salary_range || '',
      employment_type: job.employment_type,
      skills_required: (job.skills_required || []).join(', '),
      skills_preferred: (job.skills_preferred || []).join(', '),
      requirements: (job.requirements || []).join('\n'),
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await jobApi.delete(id);
      setJobs(jobs.filter((j) => j.id !== id));
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const handleMatch = async (jobId: number) => {
    setMatching(jobId);
    try {
      await jobApi.match(jobId, { skip_existing: skipExistingMap[jobId] ?? true });
      showToast('success', '匹配完成！请查看候选人列表');
    } catch (error) {
      console.error('匹配失败:', error);
      showToast('error', '匹配失败，请稍后重试');
    } finally {
      setMatching(null);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Header
        title="岗位管理"
        actions={
          <button
            onClick={() => {
              resetForm();
              setEditingJob(null);
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            创建岗位
          </button>
        }
      />

      <div className="p-6 flex flex-col min-h-[calc(100vh-64px)]">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="搜索岗位..."
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
            <option value="open">招聘中</option>
            <option value="closed">已关闭</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <SkeletonJobCard key={i} />
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="mx-auto h-16 w-16 text-gray-300 dark:text-slate-600 mb-4" />
            <p className="text-lg text-gray-500 dark:text-gray-400">暂无岗位</p>
            <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
              创建第一个招聘岗位
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job) => {
              const status = statusConfig[job.status] || statusConfig.open;

              return (
                <div
                  key={job.id}
                  className="card p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            {job.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          {employmentTypes[job.employment_type] || job.employment_type}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  {job.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
                      {job.description}
                    </p>
                  )}

                  {job.skills_required && job.skills_required.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {job.skills_required.slice(0, 4).map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                      {job.skills_required.length > 4 && (
                        <span className="px-2 py-0.5 text-gray-400 text-xs">
                          +{job.skills_required.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {job.skills_preferred && job.skills_preferred.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {job.skills_preferred.slice(0, 3).map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-slate-700">
                    <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={skipExistingMap[job.id] ?? true}
                        onChange={(e) => setSkipExistingMap((prev) => ({ ...prev, [job.id]: e.target.checked }))}
                        className="w-3.5 h-3.5 rounded border-gray-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
                      />
                      跳过已评分
                    </label>
                    <button
                      onClick={() => handleMatch(job.id)}
                      disabled={matching === job.id}
                      className="flex-1 btn btn-primary py-1.5 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Zap size={14} />
                      {matching === job.id ? '匹配中...' : 'AI匹配'}
                    </button>
                    <button
                      onClick={() => router.push(`/jobs/${job.id}/candidates`)}
                      className="flex-1 btn btn-secondary py-1.5 text-sm flex items-center justify-center gap-1.5"
                    >
                      <Users size={14} />
                      候选人
                    </button>
                    <button
                      onClick={() => handleEdit(job)}
                      className="p-1.5 btn btn-secondary"
                    >
                      <Edit2 size={14} />
                    </button>
                    <Popconfirm
                      title="确定要删除这个岗位吗？"
                      description="此操作不可恢复"
                      onConfirm={() => handleDelete(job.id)}
                      type="danger"
                    >
                      <button
                        className="p-1.5 btn btn-secondary text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={14} />
                      </button>
                    </Popconfirm>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowModal(false);
            setEditingJob(null);
          }}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingJob ? '编辑岗位' : '创建岗位'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingJob(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  岗位名称 *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input"
                  placeholder="例如：高级前端工程师"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    工作地点
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="input"
                    placeholder="例如：北京"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    薪资范围
                  </label>
                  <input
                    type="text"
                    value={formData.salary_range}
                    onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                    className="input"
                    placeholder="例如：15K-30K"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Employment Type
                </label>
                <select
                  value={formData.employment_type}
                  onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                  className="input"
                >
                  <option value="full-time">全职</option>
                  <option value="part-time">兼职</option>
                  <option value="contract">合同制</option>
                  <option value="internship">实习</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  岗位描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input min-h-[100px]"
                  placeholder="请输入岗位描述..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  必备技能（用逗号分隔）
                </label>
                <input
                  type="text"
                  value={formData.skills_required}
                  onChange={(e) => setFormData({ ...formData, skills_required: e.target.value })}
                  className="input"
                  placeholder="例如：React, TypeScript, Node.js"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  加分技能（用逗号分隔）
                </label>
                <input
                  type="text"
                  value={formData.skills_preferred}
                  onChange={(e) => setFormData({ ...formData, skills_preferred: e.target.value })}
                  className="input"
                  placeholder="例如：GraphQL, Docker"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  任职要求（每行一条）
                </label>
                <textarea
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  className="input min-h-[100px]"
                  placeholder="请输入任职要求..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingJob(null);
                  }}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingJob ? '保存' : '创建'}
                </button>
              </div>
            </form>
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
          pageSizeOptions={[12, 24, 48]}
        />
      )}
      </div>
    </div>
  );
}
