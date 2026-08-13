/**
 * AI Flow API 路径必须相对 axios baseURL `/api/v1`，
 * 不能再带 `/v1` 前缀（否则会打到 `/api/v1/v1/ai/flow` 并 404）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from './api'
import { FLOW_API_BASE, flowService, type FlowDefinition } from './flow'

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

const sampleFlow: FlowDefinition = {
  id: 'flow-1',
  name: 'test',
  version: '1',
  createdBy: 'tester',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  nodes: [],
  startNodeId: 'start',
}

describe('flowService API paths', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedApi.get.mockResolvedValue({ success: true })
    mockedApi.post.mockResolvedValue({ success: true })
    mockedApi.put.mockResolvedValue({ success: true })
    mockedApi.delete.mockResolvedValue({ success: true })
  })

  it('uses /ai/flow relative to /api/v1 and never prefixes /v1', () => {
    expect(FLOW_API_BASE).toBe('/ai/flow')
    expect(FLOW_API_BASE.startsWith('/v1/')).toBe(false)
  })

  it('lists and reads flows without a duplicated /v1 prefix', async () => {
    await flowService.getFlows()
    await flowService.getFlow('flow-1')
    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/ai/flow')
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/ai/flow/flow-1')
  })

  it('creates, updates, and deletes flows without a duplicated /v1 prefix', async () => {
    await flowService.createFlow({
      name: 'test',
      version: '1',
      createdBy: 'tester',
      nodes: [],
      startNodeId: 'start',
    })
    await flowService.updateFlow('flow-1', { name: 'renamed' })
    await flowService.deleteFlow('flow-1')
    expect(mockedApi.post).toHaveBeenCalledWith('/ai/flow', expect.any(Object))
    expect(mockedApi.put).toHaveBeenCalledWith('/ai/flow/flow-1', { name: 'renamed' })
    expect(mockedApi.delete).toHaveBeenCalledWith('/ai/flow/flow-1')
  })

  it('executes saved and unsaved flows without a duplicated /v1 prefix', async () => {
    await flowService.executeFlow('flow-1', { foo: 1 })
    await flowService.executeFlowDefinition(sampleFlow, { bar: 2 })
    expect(mockedApi.post).toHaveBeenCalledWith('/ai/flow/execute', {
      flowId: 'flow-1',
      variables: { foo: 1 },
    })
    expect(mockedApi.post).toHaveBeenCalledWith('/ai/flow/execute-definition', {
      flow: sampleFlow,
      variables: { bar: 2 },
    })
  })
})
