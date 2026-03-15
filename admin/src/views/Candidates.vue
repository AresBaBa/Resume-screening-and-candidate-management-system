<template>
  <div class="candidates-page">
    <el-card>
      <template #header>
        <span>Candidate Management</span>
      </template>
      
      <el-table :data="candidates" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="user_id" label="User ID" width="80" />
        <el-table-column prop="skills" label="Skills">
          <template #default="{ row }">
            <el-tag v-for="skill in (row.skills || []).slice(0, 3)" :key="skill" size="small" style="margin-right: 5px">
              {{ skill }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="experience_years" label="Experience" width="100" />
        <el-table-column prop="status" label="Status" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="120">
          <template #default="{ row }">
            <el-button size="small" @click="handleView(row)">View</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        style="margin-top: 20px; justify-content: center"
        @current-change="fetchCandidates"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { candidates as candidatesApi } from '@/api'

const loading = ref(false)
const candidates = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

const fetchCandidates = async () => {
  loading.value = true
  try {
    const response = await candidatesApi.list({ page: currentPage.value, per_page: pageSize.value })
    candidates.value = response.data.candidates
    total.value = response.data.total
  } catch (error) {
    ElMessage.error('Failed to load candidates')
  } finally {
    loading.value = false
  }
}

const handleView = (row: any) => {
  ElMessage.info(`View candidate ${row.id} - to be implemented`)
}

/**
 * 获取候选人状态对应的标签类型
 */
const getStatusType = (status: string): "success" | "warning" | "info" | "primary" | "danger" | undefined => {
  const types: Record<string, "success" | "warning" | "info" | "primary" | "danger"> = {
    active: 'success',
    inactive: 'info',
    hired: 'primary',
    rejected: 'danger',
  }
  return types[status] || 'info'
}

onMounted(() => {
  fetchCandidates()
})
</script>
