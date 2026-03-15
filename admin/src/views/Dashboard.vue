<template>
  <div class="dashboard">
    <!-- 顶部统计卡片区域 -->
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon">
              <el-icon size="40" color="#409eff"><Briefcase /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.openJobs }}</div>
              <div class="stat-label">开放职位</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon">
              <el-icon size="40" color="#67c23a"><User /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.totalCandidates }}</div>
              <div class="stat-label">候选人总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon">
              <el-icon size="40" color="#e6a23c"><Document /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.pendingApplications }}</div>
              <div class="stat-label">待处理申请</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon">
              <el-icon size="40" color="#f56c6c"><Check /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.hiredThisMonth }}</div>
              <div class="stat-label">本月入职</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <!-- 最近申请列表 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>最近申请记录</span>
          </template>
          <el-table :data="recentApplications" style="width: 100%">
            <el-table-column prop="candidate_name" label="候选人" />
            <el-table-column prop="job_title" label="申请职位" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <!-- AI 筛选概况图表区域 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>AI 筛选分析概况</span>
          </template>
          <div class="chart-container">
            <p>正在加载图表数据...</p>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 模拟统计数据，实际应从 API 获取
const stats = ref({
  openJobs: 12,
  totalCandidates: 156,
  pendingApplications: 34,
  hiredThisMonth: 8,
})

// 最近申请记录模拟数据
const recentApplications = ref([
  { candidate_name: '张三', job_title: '前端开发工程师', status: 'pending' },
  { candidate_name: '李四', job_title: '后端开发工程师', status: 'reviewing' },
  { candidate_name: '王五', job_title: '全栈开发工程师', status: 'interview' },
])

/**
 * 根据状态获取 Element Plus Tag 类型
 */
const getStatusType = (status: string): "success" | "warning" | "info" | "primary" | "danger" | undefined => {
  const types: Record<string, "success" | "warning" | "info" | "primary" | "danger"> = {
    pending: 'warning',
    reviewing: 'info',
    interview: 'primary',
    accepted: 'success',
    rejected: 'danger',
  }
  return types[status] || 'info'
}

/**
 * 状态中文标签转换
 */
const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: '待处理',
    reviewing: '复核中',
    interview: '面试中',
    accepted: '已录用',
    rejected: '已拒绝',
  }
  return labels[status] || status
}
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  padding: 10px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.chart-container {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
