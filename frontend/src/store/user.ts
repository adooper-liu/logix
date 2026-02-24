import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserInfo } from '@/types/user'

export const useUserStore = defineStore('user', () => {
  // 状态
  const userInfo = ref<UserInfo | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))

  // 动作
  const setUserInfo = (info: UserInfo) => {
    userInfo.value = info
  }

  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  const login = async (username: string, password: string) => {
    try {
      // 模拟登录API调用
      const response = await new Promise<any>((resolve) => {
        setTimeout(() => {
          resolve({
            token: 'mock-token-' + Date.now(),
            user: {
              id: 1,
              username,
              email: `${username}@logix.com`,
              role: 'admin'
            }
          })
        }, 1000)
      })

      setToken(response.token)
      setUserInfo(response.user)
      
      return { success: true }
    } catch (error) {
      return { success: false, error: '登录失败' }
    }
  }

  const logout = () => {
    userInfo.value = null
    token.value = null
    localStorage.removeItem('token')
  }

  const checkAuth = () => {
    return !!token.value
  }

  return {
    userInfo,
    token,
    setUserInfo,
    setToken,
    login,
    logout,
    checkAuth
  }
})