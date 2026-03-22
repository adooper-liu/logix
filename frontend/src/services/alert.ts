import api from './api';

export const alertApi = {
  getContainerAlerts: (containerNumber: string) =>
    api.get(`/v1/alerts/container/${encodeURIComponent(containerNumber)}`),
  getAllAlerts: (params?: { level?: string; resolved?: boolean }) =>
    api.get('/v1/alerts', { params }),
  acknowledgeAlert: (id: number, userId: string) =>
    api.post(`/v1/alerts/${id}/acknowledge`, { userId }),
  resolveAlert: (id: number, userId: string) =>
    api.post(`/v1/alerts/${id}/resolve`, { userId }),
  /** 单箱执行规则并写入 ext_container_alerts */
  runCheckContainer: (containerNumber: string) =>
    api.post(`/v1/alerts/run-check/${encodeURIComponent(containerNumber)}`)
};
