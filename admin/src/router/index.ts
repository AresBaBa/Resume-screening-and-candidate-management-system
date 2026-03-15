import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/Dashboard.vue'),
    },
    {
      path: '/jobs',
      name: 'jobs',
      component: () => import('@/views/Jobs.vue'),
    },
    {
      path: '/candidates',
      name: 'candidates',
      component: () => import('@/views/Candidates.vue'),
    },
    {
      path: '/applications',
      name: 'applications',
      component: () => import('@/views/Applications.vue'),
    },
    {
      path: '/resumes',
      name: 'resumes',
      component: () => import('@/views/Resumes.vue'),
    },
    {
      path: '/analytics',
      name: 'analytics',
      component: () => import('@/views/Analytics.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/Settings.vue'),
    },
  ],
})

export default router
