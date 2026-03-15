<template>
  <div class="analytics-page">
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>Application Trends</span>
          </template>
          <div class="chart-placeholder">
            <p>Application trends chart</p>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>Interview Success Rate</span>
          </template>
          <div class="chart-placeholder">
            <p>Interview success rate chart</p>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>Top Skills</span>
          </template>
          <el-statistic title="JavaScript" :value="42" />
          <el-statistic title="Python" :value="38" />
          <el-statistic title="React" :value="35" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>Hiring Pipeline</span>
          </template>
          <el-statistic title="Applied" :value="156" />
          <el-statistic title="Screened" :value="89" />
          <el-statistic title="Interviewed" :value="45" />
          <el-statistic title="Hired" :value="12" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>Time to Hire</span>
          </template>
          <el-statistic title="Average Days" :value="14.5" suffix="days" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.chart-placeholder {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  color: #909399;
}
</style>
