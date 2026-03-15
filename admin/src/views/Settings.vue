<template>
  <div class="settings-page">
    <el-card>
      <template #header>
        <span>System Settings</span>
      </template>
      
      <el-form label-width="200px">
        <el-form-item label="API URL">
          <el-input v-model="settings.apiUrl" placeholder="http://localhost:5000" />
        </el-form-item>
        
        <el-form-item label="OpenAI API Key">
          <el-input v-model="settings.openaiKey" type="password" show-password />
        </el-form-item>
        
        <el-form-item label="Redis URL">
          <el-input v-model="settings.redisUrl" placeholder="redis://localhost:6379" />
        </el-form-item>
        
        <el-form-item label="JWT Secret">
          <el-input v-model="settings.jwtSecret" type="password" show-password />
        </el-form-item>
        
        <el-form-item label="Max Upload Size (MB)">
          <el-input-number v-model="settings.maxUploadSize" :min="1" :max="100" />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleSave">Save Settings</el-button>
          <el-button @click="handleReset">Reset</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <el-card style="margin-top: 20px">
      <template #header>
        <span>Admin Profile</span>
      </template>
      
      <el-form label-width="200px">
        <el-form-item label="Email">
          <el-input v-model="profile.email" />
        </el-form-item>
        
        <el-form-item label="Name">
          <el-input v-model="profile.name" />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleUpdateProfile">Update Profile</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const settings = ref({
  apiUrl: 'http://localhost:5000',
  openaiKey: '',
  redisUrl: 'redis://localhost:6379',
  jwtSecret: '',
  maxUploadSize: 16,
})

const profile = ref({
  email: 'admin@example.com',
  name: 'Admin User',
})

const handleSave = () => {
  ElMessage.success('Settings saved successfully')
}

const handleReset = () => {
  settings.value = {
    apiUrl: 'http://localhost:5000',
    openaiKey: '',
    redisUrl: 'redis://localhost:6379',
    jwtSecret: '',
    maxUploadSize: 16,
  }
}

const handleUpdateProfile = () => {
  ElMessage.success('Profile updated successfully')
}
</script>
