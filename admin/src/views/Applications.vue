<template>
  <div class="applications-page">
    <el-card>
      <template #header>
        <span>Application Management</span>
      </template>
      
      <el-table :data="applications" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="candidate_id" label="Candidate ID" width="100" />
        <el-table-column prop="job_id" label="Job ID" width="80" />
        <el-table-column prop="ai_score" label="AI Score" width="100">
          <template #default="{ row }">
            <el-progress :percentage="row.ai_score || 0" :color="'#67c23a'" />
          </template>
        </el-table-column>
        <el-table-column prop="status" label="Status" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="interview_status" label="Interview" width="120" />
        <el-table-column label="Actions" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="handleScore(row)">AI Score</el-button>
            <el-button size="small" type="primary" @click="handleReview(row)">Review</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        style="margin-top: 20px; justify-content: center"
        @current-change="fetchApplications"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { applications as applicationsApi, ai } from '@/api'

const loading = ref(false)
const applications = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

const fetchApplications = async () => {
  loading.value = true
  try {
    const response = await applicationsApi.list({ page: currentPage.value, per_page: pageSize.value })
    applications.value = response.data.applications || []
    total.value = response.data.total || 0
  } catch (error) {
    console.error('Failed to load applications:', error)
    applications.value = []
  } finally {
    loading.value = false
  }
}

const handleScore = async (row: any) => {
  try {
    await ai.scoreApplication(row.id)
    ElMessage.success('Application scored successfully')
    fetchApplications()
  } catch (error) {
    ElMessage.error('Failed to score application')
  }
}

const handleReview = (row: any) => {
  ElMessage.info(`Review application ${row.id} - to be implemented`)
}

/**
 * 获取岗位申请状态对应的标签类型
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

onMounted(() => {
  fetchApplications()
})
</script>
