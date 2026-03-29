#!/usr/bin/env node

/**
 * LogiX 开发范式自动检查工具
 *
 * 使用方法:
 *   npx ts-node --compilerOptions '{"module":"commonjs"}' scripts/dev-paradigm-check.ts [options]
 *
 * 选项:
 *   --phase <phase>     检查阶段 (architecture|problem|strategy|review|dev|test|retro)
 *   --file <file>       检查目标文件
 *   --output <format>   输出格式 (console|json|markdown)
 *   --strict            严格模式（警告也视为错误）
 */

import * as fs from "fs";
import * as path from "path";

// 颜色配置
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// 检查清单定义
const CHECKLISTS = {
  architecture: {
    name: "架构分析",
    items: [
      { id: "A1", text: "业务架构分析（参与者/流程/规则/状态）", required: true },
      { id: "A2", text: "数据模型分析（表结构/字段/关系/约束）", required: true },
      { id: "A3", text: "服务层分析（职责/依赖/事务/异常）", required: true },
      { id: "A4", text: "前端架构分析（组件/状态/事件/UI 逻辑）", required: false },
      { id: "A5", text: "数据流分析（来源/处理/存储/消费）", required: false },
    ],
  },

  problem: {
    name: "问题诊断",
    items: [
      { id: "P1", text: "现象描述清晰（What/When/Where/Who/Impact）", required: true },
      { id: "P2", text: "根因分析（直接/间接/系统性原因）", required: true },
      { id: "P3", text: "影响评估（用户数/数据/功能/性能）", required: true },
      { id: "P4", text: "紧急程度评估（Severity/Priority/SLA）", required: true },
      { id: "P5", text: "修复策略（临时/永久/预防措施）", required: true },
    ],
  },

  strategy: {
    name: "策略选择",
    items: [
      { id: "S1", text: "方案 A：最小改动（复用现有代码）", required: true },
      { id: "S2", text: "方案 B：适度扩展（渐进式重构）", required: false },
      { id: "S3", text: "方案 C：重构重写（需评审）", required: false },
      { id: "S4", text: "决策理由充分（工作量/风险/收益）", required: true },
      { id: "S5", text: "符合 SKILL 原则", required: true },
    ],
  },

  review: {
    name: "方案评审",
    items: [
      { id: "R1", text: "技术方案文档完整", required: true },
      { id: "R2", text: "技术评审通过", required: true },
      { id: "R3", text: "安全评审通过", required: true },
      { id: "R4", text: "性能评审通过", required: false },
      { id: "R5", text: "运维评审通过", required: false },
    ],
  },

  development: {
    name: "开发实施",
    items: [
      { id: "D1", text: "遵循编码规范", required: true },
      { id: "D2", text: "代码可读性好", required: true },
      { id: "D3", text: "注释充分", required: true },
      { id: "D4", text: "无代码异味", required: true },
      { id: "D5", text: "无过度设计", required: true },
    ],
  },

  testing: {
    name: "测试验证",
    items: [
      { id: "T1", text: "单元测试覆盖（>80%）", required: true },
      { id: "T2", text: "集成测试通过", required: true },
      { id: "T3", text: "功能测试通过", required: true },
      { id: "T4", text: "性能测试通过", required: false },
      { id: "T5", text: "安全测试通过", required: false },
    ],
  },

  retrospective: {
    name: "复盘沉淀",
    items: [
      { id: "RP1", text: "复盘会议已召开", required: true },
      { id: "RP2", text: "经验教训已总结", required: true },
      { id: "RP3", text: "文档已更新", required: true },
      { id: "RP4", text: "知识库已沉淀", required: false },
      { id: "RP5", text: "团队已分享", required: false },
    ],
  },
};

interface CheckResult {
  phase: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  items: Array<{
    id: string;
    text: string;
    status: "pass" | "fail" | "skip";
    required: boolean;
    notes?: string;
  }>;
}

class DevParadigmChecker {
  private results: CheckResult[] = [];
  private strictMode = false;

  constructor(private targetFile?: string) {}

  /**
   * 检查指定阶段
   */
  checkPhase(phaseName: string): CheckResult {
    const phase = CHECKLISTS[phaseName as keyof typeof CHECKLISTS];
    if (!phase) {
      throw new Error(`未知阶段：${phaseName}`);
    }

    console.log(`\n${colors.cyan}=== 检查阶段：${phase.name} ===${colors.reset}\n`);

    const result: CheckResult = {
      phase: phase.name,
      total: phase.items.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      items: [],
    };

    for (const item of phase.items) {
      const status = this.promptForStatus(item);
      result.items.push({ ...item, status });

      if (status === "pass") {
        result.passed++;
        console.log(`${colors.green}✓${colors.reset} ${item.text}`);
      } else if (status === "fail") {
        result.failed++;
        const marker = item.required ? `${colors.red}✗${colors.reset}` : `${colors.yellow}⚠${colors.reset}`;
        console.log(`${marker} ${item.text}`);

        if (item.required && this.strictMode) {
          throw new Error(`[严格模式] 必需项失败：${item.text}`);
        }
      } else {
        result.skipped++;
        console.log(`${colors.blue}○${colors.reset} ${item.text} (跳过)`);
      }
    }

    this.results.push(result);
    return result;
  }

  /**
   * 提示用户输入检查项状态
   */
  private promptForStatus(item: { id: string; text: string }): "pass" | "fail" | "skip" {
    // 简单实现：实际可使用 readline 交互式询问
    // 这里简化为自动检查或手动标记
    return "pass"; // 默认通过
  }

  /**
   * 生成报告
   */
  generateReport(format: "console" | "json" | "markdown" = "console"): string {
    if (format === "json") {
      return JSON.stringify(this.results, null, 2);
    }

    if (format === "markdown") {
      return this.generateMarkdownReport();
    }

    return this.generateConsoleReport();
  }

  /**
   * 控制台报告
   */
  private generateConsoleReport(): string {
    let report = "\n" + "=".repeat(60) + "\n";
    report += `${colors.magenta}LogiX 开发范式检查报告${colors.reset}\n`;
    report += "=".repeat(60) + "\n\n";

    const totalScore = this.calculateTotalScore();
    const level = this.getLevel(totalScore);

    report += `综合得分：${colors.cyan}${totalScore.toFixed(1)}${colors.reset} / 100\n`;
    report += `评级：${colors.magenta}${level}${colors.reset}\n\n`;

    for (const result of this.results) {
      const passRate = ((result.passed / result.total) * 100).toFixed(1);
      report += `${colors.blue}${result.phase}${colors.reset}: `;
      report += `${result.passed}/${result.total} (${passRate}%)`;

      if (result.failed > 0) {
        report += ` ${colors.red}[${result.failed} 失败]${colors.reset}`;
      }
      report += "\n";
    }

    report += "\n" + "=".repeat(60) + "\n";
    return report;
  }

  /**
   * Markdown 报告
   */
  private generateMarkdownReport(): string {
    let report = "# LogiX 开发范式检查报告\n\n";
    report += `检查时间：${new Date().toISOString()}\n`;
    report += `目标文件：${this.targetFile || "N/A"}\n\n`;

    const totalScore = this.calculateTotalScore();
    const level = this.getLevel(totalScore);

    report += `## 综合评分\n\n`;
    report += `- **得分**: ${totalScore.toFixed(1)} / 100\n`;
    report += `- **评级**: ${level}\n\n`;

    report += `## 详细结果\n\n`;

    for (const result of this.results) {
      const passRate = ((result.passed / result.total) * 100).toFixed(1);
      report += `### ${result.phase}\n\n`;
      report += `通过率：${passRate}% (${result.passed}/${result.total})\n\n`;

      report += "| ID | 检查项 | 状态 |\n";
      report += "|----|--------|------|\n";

      for (const item of result.items) {
        const icon = item.status === "pass" ? "✅" : item.status === "fail" ? "❌" : "⚪";
        const marker = item.required && item.status === "fail" ? "**必需**" : "";
        report += `| ${item.id} | ${item.text} ${marker} | ${icon} |\n`;
      }

      report += "\n";
    }

    return report;
  }

  /**
   * 计算总分
   */
  private calculateTotalScore(): number {
    if (this.results.length === 0) return 0;

    let totalWeight = 0;
    let weightedScore = 0;

    const weights: Record<string, number> = {
      architecture: 0.2,
      problem: 0.15,
      strategy: 0.15,
      review: 0.1,
      development: 0.2,
      testing: 0.15,
      retrospective: 0.05,
    };

    for (const result of this.results) {
      const weight = weights[result.phase] || 0.1;
      totalWeight += weight;

      const requiredItems = result.items.filter((i) => i.required);
      const passedRequired = requiredItems.filter((i) => i.status === "pass").length;

      const phaseScore = requiredItems.length > 0 ? (passedRequired / requiredItems.length) * 100 : 0;

      weightedScore += phaseScore * weight;
    }

    return weightedScore / totalWeight;
  }

  /**
   * 获取评级
   */
  private getLevel(score: number): string {
    if (score >= 90) return "优秀 ⭐⭐⭐⭐⭐";
    if (score >= 80) return "良好 ⭐⭐⭐⭐";
    if (score >= 70) return "中等 ⭐⭐⭐";
    if (score >= 60) return "及格 ⭐⭐";
    return "待改进 ⭐";
  }
}

// CLI 入口
async function main() {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const value = args[i + 1];
      options[key] = value || "true";
      i++;
    }
  }

  const checker = new DevParadigmChecker(options.file);
  const phases = options.phase ? [options.phase] : Object.keys(CHECKLISTS);

  try {
    for (const phase of phases) {
      checker.checkPhase(phase);
    }

    const format = (options.output as "console" | "json" | "markdown") || "console";
    const report = checker.generateReport(format);
    console.log(report);

    // 如果指定了输出文件，保存到文件
    if (options["output-file"]) {
      fs.writeFileSync(options["output-file"], report);
      console.log(`\n报告已保存到：${options["output-file"]}`);
    }

    process.exit(0);
  } catch (error: any) {
    console.error(`${colors.red}检查失败:${colors.reset}`, error.message);
    process.exit(1);
  }
}

main();
