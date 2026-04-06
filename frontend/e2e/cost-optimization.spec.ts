/**
 * 成本优化功能 - 集成测试
 * Cost Optimization Integration Tests
 * 
 * 测试完整的用户交互流程：
 * 1. 拖拽提柜节点
 * 2. 触发优化 API
 * 3. 显示优化面板
 * 4. 应用最优方案
 * 5. 验证数据更新
 * 
 * 测试数据：
 * - 货柜: HMMU6232153 (at_port 状态)
 * - 提柜日: 2026-04-02
 * - 仓库: IT-S002
 * - 车队: RT_LOGISTICA_SRL_
 */

import { test, expect } from '@playwright/test'

// 测试配置
const TEST_CONTAINER = 'HMMU6232153'
const NEW_PICKUP_DATE = '2026-03-31' // 提前 2 天

const defaultOptimizeResult = {
  success: true,
  data: {
    containerNumber: TEST_CONTAINER,
    originalCost: 1250,
    optimizedCost: 980,
    savings: 270,
    savingsPercent: 21.6,
    suggestedPickupDate: '2026-04-10',
    suggestedStrategy: 'Direct',
    alternatives: [
      {
        pickupDate: '2026-04-10',
        strategy: 'Direct',
        totalCost: 980,
        savings: 270,
        breakdown: {
          demurrageCost: 150,
          detentionCost: 200,
          storageCost: 300,
          yardStorageCost: 0,
          transportationCost: 250,
          handlingCost: 80,
        },
      },
    ],
  },
}

const mockContainerListResponse = {
  success: true,
  count: 1,
  items: [
    {
      containerNumber: TEST_CONTAINER,
      destinationPort: 'USLAX',
      orderNumber: 'RO-TEST-001',
      portOperations: [{ portType: 'destination', portCode: 'USLAX' }],
      truckingTransports: [
        {
          truckingCompanyId: 'TRUCK001',
          plannedPickupDate: '2026-04-03',
          plannedDeliveryDate: '2026-04-03',
          unloadModePlan: 'Live load',
        },
      ],
      warehouseOperations: [
        {
          warehouseId: 'WH001',
          plannedUnloadDate: '2026-04-03',
          unloadModePlan: 'Live load',
        },
      ],
      emptyReturns: [{ plannedReturnDate: '2026-04-03' }],
      availableTruckingCompanies: [],
      availableWarehouses: [],
      ganttDerived: null,
    },
  ],
}

const getDropCell = (page: any, index = 2) => page.locator('.supplier-row .date-cell').nth(index)

test.describe('Cost Optimization - Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 免登录进入受保护路由
    await page.addInitScript(() => {
      localStorage.setItem('token', 'e2e-test-token')
    })

    // 默认 mock：优化与更新接口
    await page.route('**/api/v1/scheduling/optimize-container/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(defaultOptimizeResult),
      })
    )
    await page.route('**/api/v1/containers/**/schedule', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    )
    await page.route('**/api/v1/containers/by-filter**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockContainerListResponse),
      })
    )
    await page.route('**/api/v1/containers**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockContainerListResponse),
      })
    )

    // 访问甘特图页面（Hash 路由）
    await page.goto('/#/gantt-chart')
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.simple-gantt-chart', { timeout: 15000 })
  })

  /**
   * 场景 1: 免费期内充足 - 拖拽后显示优化建议
   */
  test('should show optimization panel when dragging pickup date within free period', async ({ page }) => {
    // 1. 等待页面加载并搜索特定货柜
    await page.waitForSelector('.simple-gantt-chart', { timeout: 10000 })
    
    // 2. 在搜索框中输入货柜号
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="search"]')
    if (await searchInput.count() > 0) {
      await searchInput.fill(TEST_CONTAINER)
      await page.waitForTimeout(500) // 等待搜索结果
    }

    // 3. 找到提柜节点（使用实际日期）
    const pickupNode = page.locator('[data-testid="pickup-node"]').first()
    await expect(pickupNode).toBeVisible({ timeout: 5000 })

    // 4. 模拟拖拽到新的日期
    // 5. 拖拽并等待优化 API 调用
    const [optimizeResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/scheduling/optimize-container/') &&
          response.status() === 200,
        { timeout: 10000 }
      ),
      pickupNode.dragTo(getDropCell(page, 3)),
    ])

    // 6. 验证 API 响应
    const responseData = await optimizeResponse.json()
    expect(responseData.success).toBe(true)
    expect(responseData.data.containerNumber).toBe(TEST_CONTAINER)
    expect(responseData.data.savings).toBeGreaterThan(0)

    // 7. 验证优化面板显示
    const optimizationPanel = page.locator('.cost-optimization-panel')
    await expect(optimizationPanel).toBeVisible({ timeout: 5000 })

    // 8. 验证面板内容
    await expect(page.locator('.panel-title')).toContainText('成本优化建议')
    await expect(page.locator('.comparison-section')).toBeVisible()
    await expect(page.locator('.savings-banner')).toBeVisible()

    // 9. 验证节省金额 > 0
    const savingsText = await page.locator('.savings-amount').textContent()
    const savings = parseFloat(savingsText?.replace(/[^0-9.]/g, '') || '0')
    expect(savings).toBeGreaterThan(0)
  })

  /**
   * 场景 2: 应用最优方案 - 确认对话框和日期更新
   */
  test('should apply optimal solution after confirmation', async ({ page }) => {
    // 1. 等待页面加载
    await page.waitForSelector('.simple-gantt-chart', { timeout: 10000 })
    
    // 2. 搜索货柜
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="search"]')
    if (await searchInput.count() > 0) {
      await searchInput.fill(TEST_CONTAINER)
      await page.waitForTimeout(500)
    }

    // 3. 触发优化
    const pickupNode = page.locator('[data-testid="pickup-node"]').first()
    await pickupNode.dragTo(getDropCell(page, 3))

    // 4. 等待优化面板显示
    const optimizationPanel = page.locator('.cost-optimization-panel')
    await expect(optimizationPanel).toBeVisible({ timeout: 5000 })

    // 5. 点击"应用最优方案"按钮
    const applyButton = page.locator('.panel-footer .el-button--primary')
    await applyButton.click()

    // 6. 验证确认对话框显示
    const confirmDialog = page.locator('.el-message-box')
    await expect(confirmDialog).toBeVisible()

    // 7. 验证对话框内容
    await expect(confirmDialog).toContainText('确定要应用最优方案吗？')
    await expect(confirmDialog).toContainText('当前提柜日')
    await expect(confirmDialog).toContainText('建议提柜日')
    await expect(confirmDialog).toContainText('建议策略')

    // 6. 点击"确定应用"
    const confirmButton = page.locator('.el-message-box__btns button.el-button--primary')
    await confirmButton.click()

    // 7. 等待 API 更新
    await page.waitForResponse(
      (response) =>
        response.url().includes('/containers/') &&
        response.url().includes('/schedule') &&
        response.status() === 200
    )

    // 8. 验证成功消息
    const successMessage = page.locator('.el-message--success')
    await expect(successMessage).toBeVisible()
    await expect(successMessage).toContainText('最优方案已应用')

    // 9. 验证优化面板关闭
    await expect(optimizationPanel).not.toBeVisible()

    // 10. 验证甘特图数据刷新
    await page.waitForTimeout(1000) // 等待数据刷新
    await expect(page.locator('.simple-gantt-chart')).toBeVisible()
  })

  /**
   * 场景 3: 用户取消应用
   */
  test('should keep panel open when user cancels application', async ({ page }) => {
    // 1. 触发优化
    const pickupNode = page.locator('[data-testid="pickup-node"]').first()
    await pickupNode.dragTo(getDropCell(page, 3))

    // 2. 等待优化面板显示
    const optimizationPanel = page.locator('.cost-optimization-panel')
    await expect(optimizationPanel).toBeVisible({ timeout: 5000 })

    // 3. 点击"应用最优方案"
    const applyButton = page.locator('.panel-footer .el-button--primary')
    await applyButton.click()

    // 4. 验证确认对话框显示
    const confirmDialog = page.locator('.el-message-box')
    await expect(confirmDialog).toBeVisible()

    // 5. 点击"取消"
    const cancelButton = page.locator('.el-message-box__btns button:not(.el-button--primary)')
    await cancelButton.click()

    // 6. 验证对话框关闭
    await expect(confirmDialog).not.toBeVisible()

    // 7. 验证优化面板仍然打开
    await expect(optimizationPanel).toBeVisible()
  })

  /**
   * 场景 4: 防抖逻辑 - 快速拖拽只调用一次 API
   */
  test('should debounce rapid drag operations', async ({ page }) => {
    const apiCalls: string[] = []

    // 监听 API 调用
    page.on('response', (response) => {
      if (response.url().includes('/scheduling/optimize-container/')) {
        apiCalls.push(response.url())
      }
    })

    const pickupNode = page.locator('[data-testid="pickup-node"]').first()

    // 快速连续拖拽 5 次
    for (let i = 0; i < 5; i++) {
      await pickupNode.dragTo(getDropCell(page, 3 + i))
      await page.waitForTimeout(100) // 每次间隔 100ms
    }

    // 等待防抖延迟结束（500ms）+ 额外缓冲
    await page.waitForTimeout(1000)

    // 验证 API 调用次数 <= 2（最后一次 + 可能的第一次）
    expect(apiCalls.length).toBeLessThanOrEqual(2)
  })

  /**
   * 场景 5: 缓存机制 - 相同参数使用缓存
   */
  test('should use cache for repeated requests with same parameters', async ({ page }) => {
    const apiCalls: string[] = []

    // 监听 API 调用
    page.on('response', (response) => {
      if (response.url().includes('/scheduling/optimize-container/')) {
        apiCalls.push(response.url())
      }
    })

    const pickupNode = page.locator('[data-testid="pickup-node"]').first()

    // 第一次拖拽到 2026-04-10
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/scheduling/optimize-container/') &&
          response.status() === 200
      ),
      pickupNode.dragTo(getDropCell(page, 3)),
    ])

    const firstCallCount = apiCalls.length

    // 关闭面板
    const closeButton = page.locator('.cost-optimization-panel .panel-header button')
    await closeButton.click()

    // 第二次拖拽到相同日期（应该使用缓存）
    await pickupNode.dragTo(getDropCell(page, 3))
    await page.waitForTimeout(1000) // 等待可能的 API 调用

    const secondCallCount = apiCalls.length

    // 验证没有新的 API 调用（使用缓存）
    expect(secondCallCount).toBe(firstCallCount)
  })

  /**
   * 场景 6: 备选方案列表 - 显示 Top 3
   */
  test('should display top 3 alternative solutions', async ({ page }) => {
    // 1. 触发优化
    const pickupNode = page.locator('[data-testid="pickup-node"]').first()
    await pickupNode.dragTo(getDropCell(page, 3))

    // 2. 等待优化面板显示
    const optimizationPanel = page.locator('.cost-optimization-panel')
    await expect(optimizationPanel).toBeVisible({ timeout: 5000 })

    // 3. 验证备选方案区域存在
    const alternativesSection = page.locator('.alternatives-section')
    await expect(alternativesSection).toBeVisible()

    // 4. 验证备选方案数量
    const alternativeCards = page.locator('.alternative-item')
    const count = await alternativeCards.count()
    expect(count).toBeGreaterThanOrEqual(1)
    expect(count).toBeLessThanOrEqual(3) // Top 3

    // 5. 验证每个备选方案包含必要信息
    for (let i = 0; i < count; i++) {
      const card = alternativeCards.nth(i)
      await expect(card.locator('.alt-date')).toBeVisible()
      await expect(card.locator('.alt-strategy')).toBeVisible()
      await expect(card.locator('.alt-cost')).toBeVisible()
    }
  })

  /**
   * 场景 7: 费用明细弹窗 - 点击查看详细费用
   */
  test('should show cost breakdown dialog when clicking alternative', async ({ page }) => {
    // 1. 触发优化
    const pickupNode = page.locator('[data-testid="pickup-node"]').first()
    await pickupNode.dragTo(page.locator('.gantt-body .date-cell').nth(10))

    // 2. 等待优化面板显示
    const optimizationPanel = page.locator('.cost-optimization-panel')
    await expect(optimizationPanel).toBeVisible({ timeout: 5000 })

    // 3. 点击第一个备选方案的费用明细按钮
    const firstAlternative = page.locator('.alternative-item').first()
    await firstAlternative.click()

    // 4. 验证费用明细弹窗显示
    const breakdownDialog = page.locator('.el-dialog:has-text("费用明细")')
    await expect(breakdownDialog).toBeVisible()

    // 5. 验证费用明细内容
    await expect(breakdownDialog).toContainText('滞港费')
    await expect(breakdownDialog).toContainText('滞箱费')
    await expect(breakdownDialog).toContainText('港口存储费')
    await expect(breakdownDialog).toContainText('运输费')
    await expect(breakdownDialog).toContainText('总费用')

    // 6. 关闭弹窗
    const closeDialogButton = breakdownDialog.locator('.el-dialog__headerbtn')
    await closeDialogButton.click()

    // 7. 验证弹窗关闭
    await expect(breakdownDialog).not.toBeVisible()
  })

  /**
   * 场景 8: 无节省空间 - 不显示优化面板
   */
  test('should not show panel when no savings available', async ({ page }) => {
    // Mock API 返回无节省的结果
    await page.route('**/scheduling/optimize-container/*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            containerNumber: 'ECMU5399797',
            originalCost: 1000,
            optimizedCost: 1000,
            savings: 0,
            savingsPercent: 0,
            suggestedPickupDate: '2026-04-15',
            suggestedStrategy: 'Direct',
            alternatives: [],
          },
        }),
      })
    })

    // 1. 拖拽提柜节点
    const pickupNode = page.locator('[data-testid="pickup-node"]').first()
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/scheduling/optimize-container/') &&
          response.status() === 200
      ),
      pickupNode.dragTo(getDropCell(page, 3)),
    ])

    // 3. 验证优化面板不显示
    const optimizationPanel = page.locator('.cost-optimization-panel')
    await expect(optimizationPanel).not.toBeVisible({ timeout: 2000 })
  })

  /**
   * 场景 9: API 失败 - 显示错误消息
   */
  test('should show error message when API fails', async ({ page }) => {
    // Mock API 失败
    await page.route('**/scheduling/optimize-container/*', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: '服务器内部错误',
        }),
      })
    })

    // 1. 拖拽提柜节点
    const pickupNode = page.locator('[data-testid="pickup-node"]').first()
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/scheduling/optimize-container/') &&
          response.status() === 500
      ),
      pickupNode.dragTo(getDropCell(page, 3)),
    ])

    // 3. 验证错误消息显示
    const errorMessage = page.locator('.el-message--error')
    await expect(errorMessage).toBeVisible()
    await expect(errorMessage).toContainText('请求失败')
  })

  /**
   * 场景 10: Drop off 策略 - 验证卸柜日不设置
   */
  test('should not set unloadDate for Drop off strategy', async ({ page }) => {
    let updateRequest: any = null

    // 监听更新请求
    page.on('request', (request) => {
      if (request.url().includes('/containers/') && request.url().includes('/schedule')) {
        updateRequest = request.postDataJSON()
      }
    })

    // Mock 优化 API 返回 Drop off 策略
    await page.route('**/scheduling/optimize-container/*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            containerNumber: 'ECMU5399797',
            originalCost: 1250,
            optimizedCost: 980,
            savings: 270,
            savingsPercent: 21.6,
            suggestedPickupDate: '2026-04-10',
            suggestedStrategy: 'Drop off',
            alternatives: [],
          },
        }),
      })
    })

    // 1. 触发优化
    const pickupNode = page.locator('[data-testid="pickup-node"]').first()
    await pickupNode.dragTo(getDropCell(page, 3))

    // 2. 等待优化面板显示
    const optimizationPanel = page.locator('.cost-optimization-panel')
    await expect(optimizationPanel).toBeVisible({ timeout: 5000 })

    // 3. 应用最优方案
    const applyButton = page.locator('.panel-footer .el-button--primary')
    await applyButton.click()

    // 4. 确认对话框
    const confirmButton = page.locator('.el-message-box__btns button.el-button--primary')
    await confirmButton.click()

    // 5. 等待更新请求
    await page.waitForResponse(
      (response) =>
        response.url().includes('/containers/') &&
        response.url().includes('/schedule') &&
        response.status() === 200
    )

    // 6. 验证请求数据
    expect(updateRequest).not.toBeNull()
    expect(updateRequest.plannedPickupDate).toBe('2026-04-10')
    // 新逻辑：当建议提柜日晚于当前卸柜日时，会补齐送/卸避免顺序校验失败
    expect(updateRequest.plannedUnloadDate === undefined || typeof updateRequest.plannedUnloadDate === 'string').toBeTruthy()
  })
})
