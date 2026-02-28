<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

const loginForm = ref({
  username: 'admin',
  password: '123456'
})

const loading = ref(false)

const handleLogin = async () => {
  if (!loginForm.value.username || !loginForm.value.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }

  loading.value = true
  
  try {
    const result = await userStore.login(loginForm.value.username, loginForm.value.password)
    
    if (result.success) {
      ElMessage.success('登录成功')
      router.push('/')
    } else {
      ElMessage.error(result.error || '登录失败')
    }
  } catch (error) {
    ElMessage.error('登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-form">
      <div class="login-header">
        <h1 class="title">LogiX</h1>
        <p class="subtitle">物流管理系统</p>
      </div>
      
      <el-form 
        :model="loginForm" 
        label-position="top"
        @submit.prevent="handleLogin"
      >
        <el-form-item label="用户名">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            :prefix-icon="User"
            size="large"
          />
        </el-form-item>
        
        <el-form-item label="密码">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            size="large"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="handleLogin"
            class="login-button"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-footer">
        <p class="tips">演示账号: admin / 123456</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-form {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  
  .login-header {
    text-align: center;
    margin-bottom: 30px;
    
    .title {
      font-size: 32px;
      font-weight: bold;
      color: $text-primary;
      margin-bottom: 10px;
    }
    
    .subtitle {
      color: $text-secondary;
      font-size: 16px;
    }
  }
  
  .login-button {
    width: 100%;
    margin-top: 20px;
  }
  
  .login-footer {
    text-align: center;
    margin-top: 20px;
    
    .tips {
      color: $text-secondary;
      font-size: 14px;
    }
  }
}
</style>