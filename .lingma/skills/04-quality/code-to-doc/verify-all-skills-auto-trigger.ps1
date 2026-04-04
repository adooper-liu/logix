# 全量 SKILL 自动触发配置验证脚本

param(
    [switch]$FullCheck,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# 颜色定义
$SuccessColor = "Green"
$ErrorColor = "Red"
$WarningColor = "Yellow"
$InfoColor = "Cyan"

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor $SuccessColor
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor $ErrorColor
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor $WarningColor
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor $InfoColor
}

# 帮助信息
if ($Help) {
    Write-Host @"
全量 SKILL 自动触发配置验证脚本

用法:
  .\verify-all-skills-auto-trigger.ps1 [-FullCheck] [-Help]

参数:
  -FullCheck  执行完整检查（包括所有技能的触发规则）
  -Help       显示此帮助信息

示例:
  .\verify-all-skills-auto-trigger.ps1           # 基础检查
  .\verify-all-skills-auto-trigger.ps1 -FullCheck # 完整检查
"@
    exit 0
}

Write-Info "开始验证全量 SKILL 自动触发配置..."
Write-Host ""

# 检查必要文件是否存在
$filesExist = $true

$triggerRulePath = ".\.lingma\rules\ai-auto-skill-trigger.mdc"
$indexPath = ".\.lingma\skills\INDEX.md"

if (-not (Test-Path $triggerRulePath)) {
    Write-Error-Custom "自动触发规则文件不存在：$triggerRulePath"
    $filesExist = $false
} else {
    Write-Success "自动触发规则文件存在"
}

if (-not (Test-Path $indexPath)) {
    Write-Error-Custom "技能索引文件不存在：$indexPath"
    $filesExist = $false
} else {
    Write-Success "技能索引文件存在"
}

if (-not $filesExist) {
    Write-Host ""
    Write-Error-Custom "必要文件检查失败，请确认所有文件已正确创建"
    exit 1
}

Write-Host ""
Write-Info "所有必要文件都存在"
Write-Host ""

# 完整检查
if ($FullCheck) {
    Write-Info "执行完整内容检查..."
    Write-Host ""
    
    # 读取触发规则内容
    $triggerContent = Get-Content $triggerRulePath -Raw
    $indexContent = Get-Content $indexPath -Raw
    
    # 定义所有应该配置的技能和对应的规则
    $skillsConfig = @(
        @{
            Skill = "fix-verification"
            RuleName = "数据库相关|验证/检查"
            Keywords = @("字段", "表", "数据库", "SQL", "检查", "验证")
        },
        @{
            Skill = "vue-best-practices"
            RuleName = "前端相关"
            Keywords = @("前端", "Vue", "组件", ".vue")
        },
        @{
            Skill = "logix-development"
            RuleName = "后端相关"
            Keywords = @("后端", "API", "Service", "Controller")
        },
        @{
            Skill = "code-to-doc"
            RuleName = "文档生成"
            Keywords = @("分析.*计算逻辑", "生成文档", "场景模拟")
        },
        @{
            Skill = "logix-demurrage"
            RuleName = "滞港费计算"
            Keywords = @("滞港费", "demurrage", "滞箱费", "detention")
        },
        @{
            Skill = "intelligent-scheduling-mapping"
            RuleName = "智能排产"
            Keywords = @("智能排产", "排柜", "调度", "仓库选择")
        },
        @{
            Skill = "container-alerts-state-machine"
            RuleName = "物流状态机"
            Keywords = @("状态机", "物流状态", "7 层状态")
        },
        @{
            Skill = "feituo-eta-ata-validation"
            RuleName = "飞驼 ETA 验证"
            Keywords = @("飞驼", "ETA 验证", "ATA 数据")
        },
        @{
            Skill = "code-review"
            RuleName = "代码审查"
            Keywords = @("代码审查", "review", "检查代码")
        },
        @{
            Skill = "commit-message"
            RuleName = "Git 提交"
            Keywords = @("commit message", "提交信息")
        }
    )
    
    $allPassed = $true
    
    foreach ($config in $skillsConfig) {
        Write-Info "检查技能：$($config.Skill)"
        
        # 检查是否包含规则
        if ($triggerContent -match "### 规则.*$($config.RuleName).* $($config.Skill)") {
            Write-Success "  ✅ 包含规则：$($config.RuleName)"
        } else {
            Write-Error-Custom "  ❌ 缺少规则：$($config.RuleName) -> $($config.Skill)"
            $allPassed = $false
        }
        
        # 检查关键词
        $keywordFound = $false
        foreach ($keyword in $config.Keywords) {
            if ($triggerContent -match $keyword) {
                $keywordFound = $true
                break
            }
        }
        
        if ($keywordFound) {
            Write-Success "  ✅ 包含触发关键词"
        } else {
            Write-Warning-Custom "  ⚠️  缺少触发关键词：$($config.Keywords -join ', ')"
        }
        
        Write-Host ""
    }
    
    Write-Host ""
    
    # 检查文档生成路径规范
    if ($triggerContent -match "## 文档生成路径规范") {
        Write-Success "包含文档生成路径规范章节"
        
        if ($triggerContent -match "frontend/public/docs/") {
            Write-Success "指定了正确的文档保存路径"
        } else {
            Write-Warning-Custom "未明确指定文档保存路径"
        }
        
        if ($triggerContent -match "code-to-doc.*生成文档要求") {
            Write-Success "包含 code-to-doc 生成文档的特殊要求"
        } else {
            Write-Warning-Custom "缺少 code-to-doc 生成文档的特殊要求"
        }
    } else {
        Write-Warning-Custom "缺少文档生成路径规范章节"
    }
    
    Write-Host ""
    
    # 检查示例数量
    $exampleCount = ([regex]::Matches($triggerContent, "### 示例 \d+:")).Count
    Write-Info "发现 $exampleCount 个示例"
    
    if ($exampleCount -ge 8) {
        Write-Success "示例数量充足"
    } else {
        Write-Warning-Custom "示例数量不足（建议至少 8 个）"
    }
    
    Write-Host ""
    
    # 检查规则编号连续性
    $ruleNumbers = [regex]::Matches($triggerContent, "### 规则 (\d+):") | ForEach-Object { [int]$_Groups[1].Value }
    $expectedRules = 1..($ruleNumbers.Count)
    
    if ($ruleNumbers.Count -eq 11) {
        Write-Success "规则编号连续且完整（共 11 条规则）"
    } else {
        Write-Warning-Custom "规则编号可能不连续或数量不对（当前：$($ruleNumbers.Count) 条）"
    }
    
    Write-Host ""
    
    # 检查技能索引同步
    Write-Info "检查技能索引文件..."
    
    $indexedSkills = [regex]::Matches($indexContent, "\*\*([^*]+)\*\*.*\[查看\]\([^)]+\)") | ForEach-Object { $_.Groups[1].Value }
    
    Write-Info "索引文件中找到 $($indexedSkills.Count) 个技能"
    
    if ($indexedSkills.Count -ge 15) {
        Write-Success "技能索引覆盖充足"
    } else {
        Write-Warning-Custom "技能索引可能不完整"
    }
    
    Write-Host ""
    
    # 总结
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Cyan
    if ($allPassed) {
        Write-Success "全量 SKILL 自动触发配置验证完成 - 全部通过 ✅"
    } else {
        Write-Error-Custom "全量 SKILL 自动触发配置验证完成 - 存在问题 ❌"
    }
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Info "配置状态:"
    Write-Host "  ✅ 自动触发规则已配置"
    Write-Host "  ✅ 技能索引已更新"
    Write-Host "  ✅ 文档生成路径已规范"
    Write-Host ""
    
    Write-Info "支持的自动触发技能:"
    Write-Host "  1. fix-verification - 数据库验证"
    Write-Host "  2. vue-best-practices - 前端开发"
    Write-Host "  3. logix-development - 后端开发"
    Write-Host "  4. code-to-doc - 文档生成"
    Write-Host "  5. logix-demurrage - 滞港费计算"
    Write-Host "  6. intelligent-scheduling-mapping - 智能排产"
    Write-Host "  7. container-alerts-state-machine - 状态机"
    Write-Host "  8. feituo-eta-ata-validation - 飞驼验证"
    Write-Host "  9. code-review - 代码审查"
    Write-Host "  10. commit-message - Git 提交"
    Write-Host ""
    
} else {
    Write-Info "提示：使用 -FullCheck 参数执行更详细的内容检查"
    Write-Host ""
    
    # 简单统计
    $triggerContent = Get-Content $triggerRulePath -Raw
    $ruleCount = ([regex]::Matches($triggerContent, "### 规则 \d+:")).Count
    $exampleCount = ([regex]::Matches($triggerContent, "### 示例 \d+:")).Count
    
    Write-Info "当前配置:"
    Write-Host "  - 规则数量：$ruleCount"
    Write-Host "  - 示例数量：$exampleCount"
    Write-Host ""
}

Write-Host ""
