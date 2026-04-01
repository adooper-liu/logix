import api from './api'

export const timeApi = {
  getPrediction: (containerNumber: string) =>
    api.get(`/v1/time/predict/${encodeURIComponent(containerNumber)}`),
}
