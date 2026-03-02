<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

interface TimeZone {
  city: string
  timezone: string
  label: string
}

interface TimeZoneGroup {
  region: string
  timeZones: TimeZone[]
}

const timeZoneGroups: TimeZoneGroup[] = [
  {
    region: '亚洲',
    timeZones: [
      { city: '中国', timezone: 'Asia/Shanghai', label: 'CN' },
      { city: '日本', timezone: 'Asia/Tokyo', label: 'JP' },
      { city: '韩国', timezone: 'Asia/Seoul', label: 'KR' },
      { city: '新加坡', timezone: 'Asia/Singapore', label: 'SG' },
      { city: '阿联酋', timezone: 'Asia/Dubai', label: 'AE' },
      { city: '印度', timezone: 'Asia/Kolkata', label: 'IN' }
    ]
  },
  {
    region: '美洲',
    timeZones: [
      { city: '美国西岸', timezone: 'America/Los_Angeles', label: 'PST' },
      { city: '美国中部', timezone: 'America/Chicago', label: 'CST' },
      { city: '美国东岸', timezone: 'America/New_York', label: 'EST' },
      { city: '加拿大', timezone: 'America/Toronto', label: 'CA' },
      { city: '巴西', timezone: 'America/Sao_Paulo', label: 'BR' }
    ]
  },
  {
    region: '欧洲',
    timeZones: [
      { city: '英国', timezone: 'Europe/London', label: 'UK' },
      { city: '德国', timezone: 'Europe/Berlin', label: 'DE' },
      { city: '法国', timezone: 'Europe/Paris', label: 'FR' },
      { city: '荷兰', timezone: 'Europe/Amsterdam', label: 'NL' },
      { city: '俄罗斯', timezone: 'Europe/Moscow', label: 'RU' }
    ]
  },
  {
    region: '大洋洲',
    timeZones: [
      { city: '澳大利亚', timezone: 'Australia/Sydney', label: 'AU' }
    ]
  }
]

const currentTime = ref(new Date())
let timer: number | null = null

const getLocalDate = (): string => {
  return dayjs(currentTime.value).format('YYYY年MM月DD日')
}

const getWeekday = (): string => {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return weekdays[dayjs(currentTime.value).day()]
}

const getTimeInZone = (timezone: string): string => {
  return dayjs(currentTime.value).tz(timezone).format('HH:mm:ss')
}

const getDateInZone = (timezone: string): string => {
  return dayjs(currentTime.value).tz(timezone).format('MM-DD')
}

onMounted(() => {
  timer = window.setInterval(() => {
    currentTime.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<template>
  <div class="world-clock">
    <div class="local-date">
      <span class="date-text">{{ getLocalDate() }}</span>
      <span class="weekday-text">{{ getWeekday() }}</span>
    </div>
    <div class="time-zones">
      <div v-for="group in timeZoneGroups" :key="group.region" class="timezone-group">
        <div class="group-label">{{ group.region }}</div>
        <div class="timezone-items">
          <div v-for="tz in group.timeZones" :key="tz.timezone" class="timezone-item">
            <div class="timezone-top">
              <span class="timezone-label">{{ tz.city }}</span>
              <span class="timezone-code">{{ tz.label }}</span>
            </div>
            <div class="timezone-bottom">
              <span class="timezone-time">{{ getTimeInZone(tz.timezone) }}</span>
              <span class="timezone-date">{{ getDateInZone(tz.timezone) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.world-clock {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  overflow: hidden;

  .local-date {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-right: 16px;
    border-right: 1px solid rgba(255, 255, 255, 0.3);
    flex-shrink: 0;

    .date-text {
      font-size: 16px;
      font-weight: 600;
      color: white;
      line-height: 1.2;
    }

    .weekday-text {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.9);
      margin-top: 2px;
    }
  }

  .time-zones {
    display: flex;
    gap: 12px;
    width: 100%;
    min-width: 0;

    .timezone-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      flex: 1;

      .group-label {
        font-size: 11px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.95);
        padding-bottom: 4px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      }

      .timezone-items {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
        gap: 5px;

        .timezone-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 5px 6px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 5px;
          transition: all 0.2s;
          min-width: 0;

          &:hover {
            background: rgba(255, 255, 255, 0.25);
            transform: translateY(-1px);
          }

          .timezone-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 3px;
            width: 100%;

            .timezone-label {
              font-size: 10px;
              color: rgba(255, 255, 255, 0.9);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              flex-shrink: 1;
            }

            .timezone-code {
              font-size: 8px;
              color: rgba(255, 255, 255, 0.7);
              padding: 1px 3px;
              background: rgba(0, 0, 0, 0.2);
              border-radius: 2px;
              flex-shrink: 0;
            }
          }

          .timezone-bottom {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 3px;
            width: 100%;

            .timezone-time {
              font-size: 12px;
              font-weight: 600;
              color: white;
              font-family: 'Consolas', 'Monaco', monospace;
              flex-shrink: 0;
            }

            .timezone-date {
              font-size: 9px;
              color: rgba(255, 255, 255, 0.8);
              flex-shrink: 0;
            }
          }
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .world-clock {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;

    .local-date {
      border-right: none;
      border-bottom: 1px solid rgba(255, 255, 255, 0.3);
      padding-right: 0;
      padding-bottom: 10px;
      width: 100%;
    }

    .time-zones {
      width: 100%;
      flex-direction: column;
      gap: 8px;

      .timezone-item {
        justify-content: space-between;
      }
    }
  }
}
</style>
