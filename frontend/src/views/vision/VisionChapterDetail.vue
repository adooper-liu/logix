<template>
  <div class="vision-article">
    <article class="article-magazine">
      <header class="article-header">
        <el-button class="back-btn" text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回关于
        </el-button>
        <span class="article-badge">{{ chapter?.badge ?? `第 ${chapter?.id} 章` }}</span>
        <h1 class="article-title">{{ chapter?.title }}</h1>
        <p class="article-subtitle">{{ chapter?.subtitle }}</p>
        <div class="article-lead" v-html="highlightContent(chapter?.summary)"></div>
      </header>

      <div v-if="chapter" class="article-body">
        <template v-for="(section, idx) in chapter.sections" :key="idx">
          <!-- 章节级标题 -->
          <h2
            v-if="section.level === 'chapter' && !section.content && !section.list"
            class="magazine-chapter-title"
          >
            {{ section.title }}
          </h2>
          <!-- 带内容的章节标题 -->
          <section v-else class="magazine-section">
            <h2 v-if="section.level === 'chapter'" class="magazine-chapter-title">
              {{ section.title }}
            </h2>
            <h3 v-else class="magazine-section-title">{{ section.title }}</h3>
            <div v-if="section.content" class="magazine-content">
              <p
                v-if="typeof section.content === 'string'"
                v-html="highlightContent(section.content)"
              ></p>
              <template v-else>
                <p
                  v-for="(para, i) in section.content"
                  :key="i"
                  v-html="highlightContent(para)"
                ></p>
              </template>
            </div>
            <ul v-if="section.list" class="magazine-list">
              <li v-for="(item, i) in section.list" :key="i" v-html="formatListItem(item)"></li>
            </ul>
            <a
              v-if="section.link"
              :href="section.link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="magazine-link"
            >
              {{ section.link.text }}
              <el-icon><Link /></el-icon>
            </a>
          </section>
        </template>
      </div>

      <div v-else class="article-not-found">
        <el-empty description="未找到内容">
          <el-button type="primary" @click="goBack">返回关于</el-button>
        </el-empty>
      </div>

      <div v-if="chapter" class="article-footer">
        <el-button :disabled="!prevChapter" @click="prevChapter && goToChapter(prevChapter.id)">
          <el-icon><ArrowLeft /></el-icon>
          上一章
        </el-button>
        <el-button
          type="primary"
          :disabled="!nextChapter"
          @click="nextChapter && goToChapter(nextChapter.id)"
        >
          下一章
          <el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight, Link } from '@element-plus/icons-vue'
import { visionChapters } from '@/constants/visionChapters'

const route = useRoute()
const router = useRouter()

const chapterId = computed(() => {
  const id = route.params.chapterId
  if (id === undefined || id === null) return 0
  const n = parseInt(String(id), 10)
  return Number.isNaN(n) ? 0 : n
})

const chapter = computed(() => visionChapters.find(c => c.id === chapterId.value))

const prevChapter = computed(() => {
  const idx = visionChapters.findIndex(c => c.id === chapterId.value)
  return idx > 0 ? visionChapters[idx - 1] : null
})

const nextChapter = computed(() => {
  const idx = visionChapters.findIndex(c => c.id === chapterId.value)
  return idx >= 0 && idx < visionChapters.length - 1 ? visionChapters[idx + 1] : null
})

const goBack = () => router.push('/about')
const goToChapter = (id: number) => {
  if (id >= 0) router.push(`/about/vision/${id}`)
}

/** 高亮「」内的关键术语 */
function highlightContent(text: string | undefined): string {
  if (!text) return ''
  return text.replace(/「([^」]+)」/g, '<span class="term">$1</span>')
}

/** 列表项：加粗「——」前的重点，并高亮「」术语 */
function formatListItem(text: string | undefined): string {
  if (!text) return ''
  const highlighted = highlightContent(text)
  const idx = highlighted.indexOf('——')
  if (idx > 0) {
    return `<span class="list-key">${highlighted.slice(0, idx)}</span>——${highlighted.slice(idx + 1)}`
  }
  return highlighted
}
</script>

<style lang="scss" scoped>
@use '@/assets/styles/variables' as *;

.vision-article {
  min-height: 100vh;
  background: #fafafa;
  padding: 0;
}

.article-magazine {
  max-width: 920px;
  margin: 0 auto;
  padding: 48px 40px 64px;
  font-family: 'Georgia', 'Songti SC', 'SimSun', serif;
}

.article-header {
  margin-bottom: 48px;
  padding-bottom: 32px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);

  .back-btn {
    margin-bottom: 24px;
    color: $primary-color;
    font-size: 14px;

    &:hover {
      color: $primary-dark;
    }
  }

  .article-badge {
    display: inline-block;
    padding: 6px 16px;
    background: $primary-color;
    color: white;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.5em;
    margin-bottom: 20px;
  }

  .article-title {
    font-size: 42px;
    font-weight: 700;
    line-height: 1.25;
    color: #1a1a1a;
    margin: 0 0 12px;
    letter-spacing: 2px;
  }

  .article-subtitle {
    font-size: 18px;
    color: #666;
    margin: 0 0 24px;
    font-weight: 400;
  }

  .article-lead {
    font-size: 19px;
    line-height: 1.8;
    color: #333;
    margin: 0;
    padding: 24px 28px;
    background: white;
    border-left: 4px solid $primary-color;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);

    :deep(.term) {
      font-weight: 600;
      color: $primary-dark;
      background: rgba($primary-color, 0.08);
      padding: 0 4px;
      border-radius: 2px;
    }
  }
}

.article-body {
  .magazine-chapter-title {
    font-size: 26px;
    font-weight: 700;
    color: #1a1a1a;
    margin: 48px 0 24px;
    padding-bottom: 12px;
    border-bottom: 2px solid $primary-color;
    letter-spacing: 1px;

    &:first-of-type {
      margin-top: 0;
    }
  }

  .magazine-section {
    margin-bottom: 36px;

    .magazine-section-title {
      font-size: 18px;
      font-weight: 600;
      color: #2c2c2c;
      margin: 0 0 16px;
      letter-spacing: 0.5px;
    }

    .magazine-content {
      margin-bottom: 16px;

      p {
        font-size: 16px;
        line-height: 1.9;
        color: #444;
        margin: 0 0 16px;
        text-align: justify;

        &:last-child {
          margin-bottom: 0;
        }

        :deep(.term) {
          font-weight: 600;
          color: $primary-dark;
          background: rgba($primary-color, 0.08);
          padding: 0 4px;
          border-radius: 2px;
        }
      }
    }

    .magazine-list {
      list-style: none;
      padding: 0;
      margin: 0;

      li {
        font-size: 16px;
        line-height: 1.85;
        color: #444;
        padding: 12px 0 12px 28px;
        position: relative;
        border-left: 3px solid transparent;
        padding-left: 24px;
        margin-left: 0;

        :deep(.list-key) {
          font-weight: 600;
          color: #1a1a1a;
        }

        :deep(.term) {
          font-weight: 600;
          color: $primary-dark;
          background: rgba($primary-color, 0.08);
          padding: 0 4px;
          border-radius: 2px;
        }

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 18px;
          width: 6px;
          height: 6px;
          background: $primary-color;
          border-radius: 50%;
        }

        & + li {
          border-top: 1px solid rgba(0, 0, 0, 0.06);
        }
      }
    }

    .magazine-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      color: $primary-color;
      font-size: 15px;
      font-weight: 500;
      text-decoration: none;

      &:hover {
        color: $primary-dark;
        text-decoration: underline;
      }
    }
  }
}

.article-not-found {
  padding: 80px 0;
  text-align: center;
}

.article-footer {
  margin-top: 64px;
  padding-top: 32px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  justify-content: space-between;
  gap: 16px;

  .el-button {
    min-width: 120px;
  }
}
</style>
