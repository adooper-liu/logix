import { ref, type Ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * 防抖函数
 * @param fn 要执行的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      fn.apply(this, args)
      timeoutId = null
    }, delay)
  }
}

/**
 * 节流函数
 * @param fn 要执行的函数
 * @param limit 时间限制（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number = 300
): (...args: Parameters<T>) => void {
  let lastRun = 0
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now()
    const remaining = limit - (now - lastRun)

    if (remaining <= 0) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      lastRun = now
      fn.apply(this, args)
    } else if (timeoutId === null) {
      timeoutId = setTimeout(() => {
        lastRun = Date.now()
        timeoutId = null
        fn.apply(this, args)
      }, remaining)
    }
  }
}

/**
 * Vue 3 组合式API - useDebounce
 * @param delay 延迟时间（毫秒）
 * @returns 防抖状态和方法
 */
export function useDebounce<T = any>(delay: number = 300) {
  const debouncedValue = ref<T | undefined>()
  const pending = ref(false)
  const lastValue = ref<T | undefined>()
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  /**
   * 防抖更新
   */
  const update = (value: T) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      debouncedValue.value = value
      pending.value = false
      timeoutId = null
    }, delay)
  }

  /**
   * 设置值（防抖）
   */
  const setValue = (value: T) => {
    lastValue.value = value
    pending.value = true
    update(value)
  }

  /**
   * 立即执行（跳过防抖）
   */
  const flush = () => {
    if (pending.value && lastValue.value !== undefined) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      debouncedValue.value = lastValue.value
      pending.value = false
    }
  }

  /**
   * 取消待执行
   */
  const cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    pending.value = false
  }

  return {
    debouncedValue: debouncedValue as Ref<T | undefined>,
    pending,
    setValue,
    flush,
    cancel,
  }
}

/**
 * Vue 3 组合式API - useThrottle
 * @param limit 时间限制（毫秒）
 * @returns 节流状态和方法
 */
export function useThrottle<T = any>(limit: number = 300) {
  const throttledValue = ref<T>() as Ref<T>
  const lastRun = ref(0)
  const scheduled = ref(false)
  const lastValue = ref<T>() as Ref<T>
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  /**
   * 节流更新
   */
  const update = (value: T) => {
    const now = Date.now()
    const remaining = limit - (now - lastRun.value)

    if (remaining <= 0) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      throttledValue.value = value
      scheduled.value = false
      lastRun.value = now
    } else if (timeoutId === null) {
      timeoutId = setTimeout(() => {
        throttledValue.value = value
        scheduled.value = false
        lastRun.value = Date.now()
        timeoutId = null
      }, remaining)
    }
  }

  /**
   * 设置值（节流）
   */
  const setValue = (value: T) => {
    lastValue.value = value
    scheduled.value = true
    update(value)
  }

  /**
   * 立即执行（跳过节流）
   */
  const flush = () => {
    if (scheduled.value && lastValue.value !== undefined) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      throttledValue.value = lastValue.value
      scheduled.value = false
      lastRun.value = Date.now()
    }
  }

  return {
    throttledValue,
    scheduled,
    setValue,
    flush,
  }
}

/**
 * 搜索防抖钩子
 * @param searchFn 搜索函数
 * @param delay 延迟时间（毫秒）
 * @returns 搜索状态和方法
 */
export function useSearchDebounce<T = any>(
  searchFn: (query: string) => Promise<T>,
  delay: number = 500
) {
  const query = ref('')
  const results = ref<T | undefined>()
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const search = async (searchQuery: string) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(async () => {
      if (!searchQuery.trim()) {
        results.value = undefined
        timeoutId = null
        return
      }

      isLoading.value = true
      error.value = null

      try {
        results.value = await searchFn(searchQuery)
      } catch (err) {
        error.value = err as Error
        results.value = undefined
      } finally {
        isLoading.value = false
        timeoutId = null
      }
    }, delay)
  }

  const onSearchInput = (value: string) => {
    query.value = value
    search(value)
  }

  const clear = () => {
    query.value = ''
    results.value = undefined
    error.value = null
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  onBeforeUnmount(() => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  })

  return {
    query,
    results: results as Ref<T | undefined>,
    isLoading,
    error,
    onSearchInput,
    clear,
  }
}

/**
 * 优化滚动事件监听
 * @param fn 滚动处理函数
 * @param options 选项
 * @returns 清除函数
 */
export function useThrottledScroll(
  fn: () => void,
  options: { limit?: number; leading?: boolean } = {}
) {
  const { limit = 100, leading = true } = options

  const throttledFn = throttle(fn, limit)

  onMounted(() => {
    if (leading) {
      // 首次立即执行
      fn()
    }
    window.addEventListener('scroll', throttledFn)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', throttledFn)
  })

  return {
    throttledFn,
  }
}

/**
 * 优化resize事件监听
 * @param fn resize处理函数
 * @param options 选项
 * @returns 清除函数
 */
export function useThrottledResize(
  fn: () => void,
  options: { limit?: number; leading?: boolean } = {}
) {
  const { limit = 200, leading = true } = options

  const throttledFn = throttle(fn, limit)

  onMounted(() => {
    if (leading) {
      fn()
    }
    window.addEventListener('resize', throttledFn)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', throttledFn)
  })

  return {
    throttledFn,
  }
}

/**
 * 扩展防抖函数类型
 */
declare module 'vue' {
  export interface ComponentCustomProperties {
    $debounce: typeof debounce
    $throttle: typeof throttle
  }
}
