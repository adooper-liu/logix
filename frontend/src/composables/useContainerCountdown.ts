import { computed, Ref, ref } from 'vue'
import type { PortOperation, TruckingTransport, EmptyReturn } from '@/types/container'

interface CountdownData {
  count: number
  urgent: number
  expired: number
}

// 倒计时计算逻辑
export function useContainerCountdown(containers: Ref<any[]>) {
  const currentTime = ref(new Date())
  let timer: number | null = null

  // 计算倒计时时间
  const getRemainingTime = (targetDate: string | Date | null | undefined) => {
    if (!targetDate) return null
    const target = new Date(targetDate)
    const now = currentTime.value
    const diff = target.getTime() - now.getTime()

    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    return { days, hours, minutes, seconds, isExpired: false }
  }

  // 计算按到港倒计时的货柜数量
  const countdownByArrival = computed((): CountdownData => {
    if (!containers.length) return { count: 0, urgent: 0, expired: 0 }
    let count = 0
    let urgent = 0
    let expired = 0

    containers.forEach((c: any) => {
      const portOps = c.portOperations as PortOperation[] | undefined
      const portOp = portOps?.find(po => po.portType === 'destination')
      if (portOp?.etaDestPort && !portOp.ataDestPort) {
        const time = getRemainingTime(portOp.etaDestPort)
        if (time && !time.isExpired) {
          count++
          if (time.days <= 2) urgent++
        } else if (time?.isExpired) {
          expired++
        }
      }
    })

    return { count, urgent, expired }
  })

  // 计算按提柜倒计时的货柜数量
  const countdownByPickup = computed((): CountdownData => {
    if (!containers.length) return { count: 0, urgent: 0, expired: 0 }
    let count = 0
    let urgent = 0
    let expired = 0

    containers.forEach((c: any) => {
      const portOps = c.portOperations as PortOperation[] | undefined
      const portOp = portOps?.find(po => po.portType === 'destination')
      const trucking = c.truckingTransports as TruckingTransport[] | undefined
      const firstTrucking = trucking?.[0]
      if (portOp?.ataDestPort && !firstTrucking?.pickupDate) {
        const time = getRemainingTime(portOp.lastFreeDate)
        if (time && !time.isExpired) {
          count++
          if (time.days <= 2) urgent++
        } else if (time?.isExpired) {
          expired++
        }
      }
    })

    return { count, urgent, expired }
  })

  // 计算按最晚提柜倒计时的货柜数量
  const countdownByLastPickup = computed((): CountdownData => {
    if (!containers.length) return { count: 0, urgent: 0, expired: 0 }
    let count = 0
    let urgent = 0
    let expired = 0

    containers.forEach((c: any) => {
      const portOps = c.portOperations as PortOperation[] | undefined
      const portOp = portOps?.find(po => po.portType === 'destination')
      const trucking = c.truckingTransports as TruckingTransport[] | undefined
      const firstTrucking = trucking?.[0]
      if (portOp?.lastFreeDate && !firstTrucking?.pickupDate) {
        const time = getRemainingTime(portOp.lastFreeDate)
        if (time && !time.isExpired) {
          count++
          if (time.days <= 2) urgent++
        } else if (time?.isExpired) {
          expired++
        }
      }
    })

    return { count, urgent, expired }
  })

  // 计算按最晚还箱倒计时的货柜数量
  const countdownByReturn = computed((): CountdownData => {
    if (!containers.length) return { count: 0, urgent: 0, expired: 0 }
    let count = 0
    let urgent = 0
    let expired = 0

    containers.forEach((c: any) => {
      const emptyReturns = c.emptyReturns as EmptyReturn[] | undefined
      const emptyReturn = emptyReturns?.[0]
      if (emptyReturn?.plannedReturnDate && !emptyReturn.returnTime) {
        const time = getRemainingTime(emptyReturn.plannedReturnDate)
        if (time && !time.isExpired) {
          count++
          if (time.days <= 2) urgent++
        } else if (time?.isExpired) {
          expired++
        }
      }
    })

    return { count, urgent, expired }
  })

  // 启动定时器
  const startTimer = () => {
    timer = window.setInterval(() => {
      currentTime.value = new Date()
    }, 1000)
  }

  // 停止定时器
  const stopTimer = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  return {
    countdownByArrival,
    countdownByPickup,
    countdownByLastPickup,
    countdownByReturn,
    startTimer,
    stopTimer
  }
}
