import {
  addWorkingDaysInclusive,
  resolveLastFreeDate
} from './demurrageFreePeriod';

describe('demurrageFreePeriod', () => {
  describe('resolveLastFreeDate', () => {
    it('自然日：7 天免费期含起算日，LFD = start + 6', () => {
      const start = new Date('2026-03-01T00:00:00.000Z');
      const lfd = resolveLastFreeDate(start, 7, '自然日');
      expect(lfd.toISOString()).toBe('2026-03-07T00:00:00.000Z');
    });

    it('自然日：1 天免费期时 LFD = 起算日', () => {
      const start = new Date('2026-03-01T00:00:00.000Z');
      const lfd = resolveLastFreeDate(start, 1, '自然日');
      expect(lfd.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    });

    it('freeDays=0：无免费期，LFD 为起算日前一天（计费从起算日开始）', () => {
      const start = new Date('2026-03-01T00:00:00.000Z');
      const lfd = resolveLastFreeDate(start, 0, '自然日');
      expect(lfd.toISOString()).toBe('2026-02-28T00:00:00.000Z');
    });

    it('工作日：7 个工作日含起算日，周一 → 下周二', () => {
      const monday = new Date('2026-03-09T00:00:00.000Z');
      const lfd = resolveLastFreeDate(monday, 7, '工作日');
      // Mon9 Tue10 Wed11 Thu12 Fri13 Mon16 Tue17
      expect(lfd.toISOString()).toBe('2026-03-17T00:00:00.000Z');
    });

    it('工作日：1 天免费期时 LFD = 起算日（若为工作日）', () => {
      const monday = new Date('2026-03-09T00:00:00.000Z');
      const lfd = resolveLastFreeDate(monday, 1, '工作日');
      expect(lfd.toISOString()).toBe('2026-03-09T00:00:00.000Z');
    });

    it('工作日 freeDays=0：LFD 为起算日前一天', () => {
      const monday = new Date('2026-03-09T00:00:00.000Z');
      const lfd = resolveLastFreeDate(monday, 0, '工作日');
      expect(lfd.toISOString()).toBe('2026-03-08T00:00:00.000Z');
    });
  });

  describe('addWorkingDaysInclusive', () => {
    it('从周一开始计入 5 个工作日落到周五', () => {
      const monday = new Date('2026-03-09T00:00:00.000Z');
      const result = addWorkingDaysInclusive(monday, 5);
      expect(result.toISOString()).toBe('2026-03-13T00:00:00.000Z');
    });
  });
});
