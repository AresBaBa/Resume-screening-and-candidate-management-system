import { defineStore } from 'pinia'
import { ref } from 'vue'

interface User {
  id: number
  email: string
  name: string
  role: string
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('admin_token'))

  const setUser = (newUser: User | null) => {
    user.value = newUser
  }

  const setToken = (newToken: string | null) => {
    token.value = newToken
    if (newToken) {
      localStorage.setItem('admin_token', newToken)
    } else {
      localStorage.removeItem('admin_token')
    }
  }

  const logout = () => {
    user.value = null
    token.value = null
    localStorage.removeItem('admin_token')
  }

  return {
    user,
    token,
    setUser,
    setToken,
    logout,
  }
})
