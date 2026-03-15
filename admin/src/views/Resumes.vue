<template>
  <div class="resumes-page">
    <el-card>
      <template #header>
        <span>Resume Management</span>
      </template>
      
      <el-table :data="resumes" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="candidate_id" label="Candidate ID" width="100" />
        <el-table-column prop="file_name" label="File Name" />
        <el-table-column prop="file_type" label="Type" width="80" />
        <el-table-column prop="parsing_status" label="Status" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.parsing_status)">{{ row.parsing_status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="handleParse(row)" :disabled="row.parsing_status === 'completed'">Parse</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">Delete</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { resumes as resumesApi, ai } from '@/api'

const loading = ref(false)
const resumes = ref([])

const fetchResumes = async () => {
  loading.value = true
  try {
    const response = await resumesApi.list()
    resumes.value = response.data.resumes || []
  } catch (error) {
    console.error('Failed to load resumes:', error)
    resumes.value = []
  } finally {
    loading.value = false
  }
}

const handleParse = async (row: any) => {
  try {
    await ai.parseResume(row.id)
    ElMessage.success('Resume parsed successfully')
    fetchResumes()
  } catch (error) {
    ElMessage.error('Failed to parse resume')
  }
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm('Are you sure to delete this resume?', 'Warning', {
      type: 'warning',
    })
    await resumesApi.delete(row.id)
    ElMessage.success('Resume deleted successfully')
    fetchResumes()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('Failed to delete resume')
    }
  }
}

/**
 * 获取简历解析状态对应的标签类型
 * @param status 状态字符串
 * @returns Element Plus Tag 类型: success | warning | info | primary | danger
 */
const getStatusType = (status: string): "success" | "warning" | "info" | "primary" | "danger" | undefined => {
  const types: Record<string, "success" | "warning" | "info" | "primary" | "danger"> = {
    pending: 'info',
    processing: 'warning',
    completed: 'success',
    failed: 'danger',
  }
  return types[status] || 'info'
}

onMounted(() => {
  fetchResumes()
})
</script>
