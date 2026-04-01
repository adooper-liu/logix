import api from './api'

export const riskApi = {
  getContainerRisk: (containerNumber: string) =>
    api.get(`/v1/risk/container/${encodeURIComponent(containerNumber)}`),
}
