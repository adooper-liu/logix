import { describe, expect, it } from "vitest";
import { calculatePlannedReturnDateBasic, calculatePlannedReturnDateString } from "../src/returnDateCalculator";

describe("calculatePlannedReturnDateBasic", () => {
  // 辅助函数：创建 UTC Date
  function createDate(year: number, month: number, day: number): Date {
    return new Date(Date.UTC(year, month - 1, day));
  }

  describe("Live load 模式", () => {
    it("应该返回卸柜日当天", () => {
      const result = calculatePlannedReturnDateBasic({
        unloadDate: "2026-04-10",
        unloadMode: "Live load",
      });

      expect(result.returnDate).toEqual(createDate(2026, 4, 10));
      expect(result.explanation).toBe("Live load: 还箱日=卸柜日");
    });

    it("接受 Date 对象作为输入", () => {
      const unloadDate = createDate(2026, 4, 10);
      const result = calculatePlannedReturnDateBasic({
        unloadDate,
        unloadMode: "Live load",
      });

      expect(result.returnDate).toEqual(unloadDate);
    });
  });

  describe("Drop off 模式 - 无历史数据", () => {
    it("应该返回卸柜日 + 1天", () => {
      const result = calculatePlannedReturnDateBasic({
        unloadDate: "2026-04-10",
        unloadMode: "Drop off",
      });

      expect(result.returnDate).toEqual(createDate(2026, 4, 11));
      expect(result.explanation).toBe("Drop off: 无历史数据，默认卸柜日+1天");
    });

    it("existingReturnDate 为空字符串时视为无历史", () => {
      const result = calculatePlannedReturnDateBasic({
        unloadDate: "2026-04-10",
        unloadMode: "Drop off",
        existingReturnDate: "",
      });

      expect(result.returnDate).toEqual(createDate(2026, 4, 11));
    });

    it("existingReturnDate 为 null 时视为无历史", () => {
      const result = calculatePlannedReturnDateBasic({
        unloadDate: "2026-04-10",
        unloadMode: "Drop off",
        existingReturnDate: null,
      });

      expect(result.returnDate).toEqual(createDate(2026, 4, 11));
    });
  });

  describe("Drop off 模式 - 有历史数据但不保持间隔", () => {
    it("原还箱日晚于卸柜日时，返回原还箱日", () => {
      const result = calculatePlannedReturnDateBasic({
        unloadDate: "2026-04-10",
        unloadMode: "Drop off",
        existingReturnDate: "2026-04-15",
      });

      expect(result.returnDate).toEqual(createDate(2026, 4, 15));
      expect(result.explanation).toBe("Drop off: max(卸柜日, 原还箱日)");
    });

    it("原还箱日早于卸柜日时，返回卸柜日", () => {
      const result = calculatePlannedReturnDateBasic({
        unloadDate: "2026-04-15",
        unloadMode: "Drop off",
        existingReturnDate: "2026-04-10",
      });

      expect(result.returnDate).toEqual(createDate(2026, 4, 15));
      expect(result.explanation).toBe("Drop off: max(卸柜日, 原还箱日)");
    });

    it("原还箱日等于卸柜日时，返回该日期", () => {
      const result = calculatePlannedReturnDateBasic({
        unloadDate: "2026-04-10",
        unloadMode: "Drop off",
        existingReturnDate: "2026-04-10",
      });

      expect(result.returnDate).toEqual(createDate(2026, 4, 10));
    });
  });

  describe("Drop off 模式 - 保持原有间隔", () => {
    it("正间隔：新还箱日 = 新卸柜日 + 原有间隔", () => {
      const result = calculatePlannedReturnDateBasic({
        unloadDate: "2026-04-10",
        unloadMode: "Drop off",
        existingReturnDate: "2026-04-15",
        oldUnloadDate: "2026-04-08",
      });

      // 原有间隔 = 15 - 8 = 7天
      // 新还箱日 = 10 + 7 = 17
      expect(result.returnDate).toEqual(createDate(2026, 4, 17));
      expect(result.explanation).toBe("Drop off: 保持原有间隔(7天)");
    });

    it("零间隔：还箱日等于卸柜日", () => {
      const result = calculatePlannedReturnDateBasic({
        unloadDate: "2026-04-10",
        unloadMode: "Drop off",
        existingReturnDate: "2026-04-08",
        oldUnloadDate: "2026-04-08",
      });

      // 原有间隔 = 8 - 8 = 0天
      // 新还箱日 = 10 + 0 = 10
      expect(result.returnDate).toEqual(createDate(2026, 4, 10));
      expect(result.explanation).toBe("Drop off: 保持原有间隔(0天)");
    });

    it("负间隔：还箱日不早于卸柜日", () => {
      const result = calculatePlannedReturnDateBasic({
        unloadDate: "2026-04-10",
        unloadMode: "Drop off",
        existingReturnDate: "2026-04-08",
        oldUnloadDate: "2026-04-12",
      });

      // 原有间隔 = 8 - 12 = -4天
      // 计算值 = 10 + (-4) = 6
      // 但还箱日不能早于卸柜日，所以取 max(10, 6) = 10
      expect(result.returnDate).toEqual(createDate(2026, 4, 10));
      expect(result.explanation).toBe("Drop off: 保持原有间隔(-4天)");
    });

    it("大间隔：正确计算多天间隔", () => {
      const result = calculatePlannedReturnDateBasic({
        unloadDate: "2026-04-10",
        unloadMode: "Drop off",
        existingReturnDate: "2026-04-20",
        oldUnloadDate: "2026-04-05",
      });

      // 原有间隔 = 20 - 5 = 15天
      // 新还箱日 = 10 + 15 = 25
      expect(result.returnDate).toEqual(createDate(2026, 4, 25));
      expect(result.explanation).toBe("Drop off: 保持原有间隔(15天)");
    });
  });

  describe("边界情况", () => {
    it("跨月计算正确", () => {
      const result = calculatePlannedReturnDateBasic({
        unloadDate: "2026-04-28",
        unloadMode: "Drop off",
        existingReturnDate: "2026-04-30",
        oldUnloadDate: "2026-04-25",
      });

      // 原有间隔 = 30 - 25 = 5天
      // 新还箱日 = 28 + 5 = 5月3日
      expect(result.returnDate).toEqual(createDate(2026, 5, 3));
    });

    it("跨年计算正确", () => {
      const result = calculatePlannedReturnDateBasic({
        unloadDate: "2026-12-28",
        unloadMode: "Drop off",
        existingReturnDate: "2026-12-30",
        oldUnloadDate: "2026-12-25",
      });

      // 原有间隔 = 30 - 25 = 5天
      // 新还箱日 = 28 + 5 = 2027年1月2日
      expect(result.returnDate).toEqual(createDate(2027, 1, 2));
    });

    it("oldUnloadDate 为空字符串时不保持间隔", () => {
      const result = calculatePlannedReturnDateBasic({
        unloadDate: "2026-04-10",
        unloadMode: "Drop off",
        existingReturnDate: "2026-04-15",
        oldUnloadDate: "",
      });

      expect(result.returnDate).toEqual(createDate(2026, 4, 15));
      expect(result.explanation).toBe("Drop off: max(卸柜日, 原还箱日)");
    });

    it("oldUnloadDate 为 null 时不保持间隔", () => {
      const result = calculatePlannedReturnDateBasic({
        unloadDate: "2026-04-10",
        unloadMode: "Drop off",
        existingReturnDate: "2026-04-15",
        oldUnloadDate: null,
      });

      expect(result.returnDate).toEqual(createDate(2026, 4, 15));
      expect(result.explanation).toBe("Drop off: max(卸柜日, 原还箱日)");
    });
  });

  describe("错误处理", () => {
    it("无效的日期格式抛出错误", () => {
      expect(() => {
        calculatePlannedReturnDateBasic({
          unloadDate: "invalid-date",
          unloadMode: "Live load",
        });
      }).toThrow(/Invalid date format/);
    });

    it("非 YYYY-MM-DD 格式抛出错误", () => {
      expect(() => {
        calculatePlannedReturnDateBasic({
          unloadDate: "2026/04/10",
          unloadMode: "Live load",
        });
      }).toThrow(/Invalid date format/);
    });
  });
});

describe("calculatePlannedReturnDateString", () => {
  it("返回格式化后的 YYYY-MM-DD 字符串", () => {
    const result = calculatePlannedReturnDateString({
      unloadDate: "2026-04-10",
      unloadMode: "Drop off",
    });

    expect(result).toBe("2026-04-11");
  });

  it("Live load 模式返回卸柜日", () => {
    const result = calculatePlannedReturnDateString({
      unloadDate: "2026-04-10",
      unloadMode: "Live load",
    });

    expect(result).toBe("2026-04-10");
  });
});
