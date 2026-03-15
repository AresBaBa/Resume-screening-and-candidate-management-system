<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon">
              <el-icon size="40" color="#409eff"><Briefcase /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.openJobs }}</div>
              <div class="stat-label">Open Jobs</div>
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
              <div class="stat-label">Candidates</div>
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
              <div class="stat-label">Pending</div>
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
              <div class="stat-label">Hired</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>Recent Applications</span>
          </template>
          <el-table :data="recentApplications" style="width: 100%">
            <el-table-column prop="candidate_name" label="Candidate" />
            <el-table-column prop="job_title" label="Job" />
            <el-table-column prop="status" label="Status" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>AI Screening Summary</span>
          </template>
          <div class="chart-container">
            <p>Loading chart data...</p>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const stats = ref({
  openJobs: 12,
  totalCandidates: 156,
  pendingApplications: 34,
  hiredThisMonth: 8,
})

const recentApplications = ref([
  { candidate_name: 'John Doe', job_title: 'Frontend Developer', status: 'pending' },
  { candidate_name: 'Jane Smith', job_title: 'Backend Developer', status: 'reviewing' },
  { candidate_name: 'Bob Johnson', job_title: 'Full Stack Developer', status: 'interview' },
])

const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    pending: 'warning',
    reviewing: 'info',
    interview: 'primary',
    accepted: 'success',
    rejected: 'danger',
  }
  return types[status] || 'info'
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
