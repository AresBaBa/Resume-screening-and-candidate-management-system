<template>
  <div class="jobs-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>Job Management</span>
          <el-button type="primary" @click="handleCreate">Create Job</el-button>
        </div>
      </template>
      
      <el-table :data="jobs" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="title" label="Title" />
        <el-table-column prop="location" label="Location" width="150" />
        <el-table-column prop="employment_type" label="Type" width="120" />
        <el-table-column prop="status" label="Status" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'open' ? 'success' : 'info'">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="180">
          <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)">Edit</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">Delete</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        style="margin-top: 20px; justify-content: center"
        @current-change="fetchJobs"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { jobs as jobsApi } from '@/api'

const loading = ref(false)
const jobs = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

const fetchJobs = async () => {
  loading.value = true
  try {
    const response = await jobsApi.list({ page: currentPage.value, per_page: pageSize.value })
    jobs.value = response.data.jobs
    total.value = response.data.total
  } catch (error) {
    ElMessage.error('Failed to load jobs')
  } finally {
    loading.value = false
  }
}

const handleCreate = () => {
  ElMessage.info('Create job dialog - to be implemented')
}

const handleEdit = (row: any) => {
  ElMessage.info(`Edit job ${row.id} - to be implemented`)
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm('Are you sure to delete this job?', 'Warning', {
      type: 'warning',
    })
    await jobsApi.delete(row.id)
    ElMessage.success('Job deleted successfully')
    fetchJobs()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('Failed to delete job')
    }
  }
}

onMounted(() => {
  fetchJobs()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
