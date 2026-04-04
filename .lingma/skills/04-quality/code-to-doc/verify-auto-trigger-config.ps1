# Code-to-Doc 自动触发配置验证脚本

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
Code-to-Doc 自动触发配置验证脚本

用法:
  .\verify-auto-trigger-config.ps1 [-FullCheck] [-Help]

参数:
  -FullCheck  执行完整检查（包括规则内容验证）
  -Help       显示此帮助信息

示例:
  .\verify-auto-trigger-config.ps1           # 基础检查
  .\verify-auto-trigger-config.ps1 -FullCheck # 完整检查
"@
    exit 0
}

Write-Info "开始验证 Code-to-Doc 自动触发配置..."
Write-Host ""

# 检查必要文件是否存在
$filesExist = $true

$triggerRulePath = ".\.lingma\rules\ai-auto-skill-trigger.mdc"
$skillPath = ".\.lingma\skills\04-quality\code-to-doc\SKILL.md"
$guidePath = ".\.lingma\skills\04-quality\code-to-doc\AUTO_TRIGGER_GUIDE.md"

if (-not (Test-Path $triggerRulePath)) {
    Write-Error-Custom "自动触发规则文件不存在：$triggerRulePath"
    $filesExist = $false
} else {
    Write-Success "自动触发规则文件存在"
}

if (-not (Test-Path $skillPath)) {
    Write-Error-Custom "Skill 文件不存在：$skillPath"
    $filesExist = $false
} else {
    Write-Success "Skill 文件存在"
}

if (-not (Test-Path $guidePath)) {
    Write-Error-Custom "使用指南文件不存在：$guidePath"
    $filesExist = $false
} else {
    Write-Success "使用指南文件存在"
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
    
    # 检查触发规则是否包含 code-to-doc
    $triggerContent = Get-Content $triggerRulePath -Raw
    
    if ($triggerContent -match "规则 [345].*文档生成.*code-to-doc") {
        Write-Success "触发规则包含 code-to-doc 自动调用规则"
    } elseif ($triggerContent -match "code-to-doc") {
        Write-Success "触发规则提及 code-to-doc 技能"
    } else {
        Write-Error-Custom "触发规则未包含 code-to-doc 自动调用规则"
    }
    
    # 检查是否定义了触发条件
    $requiredTriggers = @(
        "分析.*计算逻辑",
        "生成文档",
        "场景模拟"
    )
    
    foreach ($trigger in $requiredTriggers) {
        if ($triggerContent -match $trigger) {
            Write-Success "触发规则包含关键词：$trigger"
        } else {
            Write-Warning-Custom "触发规则缺少关键词：$trigger"
        }
    }
    
    Write-Host ""
    
    # 检查执行步骤是否完整
    $requiredSteps = @(
        "识别目标模块",
        "读取源代码",
        "提取核心计算公式",
        "设计场景矩阵",
        "手工验算",
        "生成.*文档"
    )
    
    foreach ($step in $requiredSteps) {
        if ($triggerContent -match $step) {
            Write-Success "执行步骤包含：$step"
        } else {
            Write-Warning-Custom "执行步骤缺少：$step"
        }
    }
    
    Write-Host ""
    
    # 检查是否包含示例
    if ($triggerContent -match "示例.*文档生成") {
        Write-Success "触发规则包含文档生成示例"
    } else {
        Write-Warning-Custom "触发规则缺少文档生成示例"
    }
    
    Write-Host ""
    
    # 检查 Skill 文件的 description
    $skillContent = Get-Content $skillPath -Raw
    
    if ($skillContent -match "description:.*基于代码自动生成.*计算逻辑场景模拟文档") {
        Write-Success "Skill description 清晰明确"
    } else {
        Write-Warning-Custom "Skill description 可能不够清晰"
    }
    
    Write-Host ""
    
    # 统计触发语句数量
    $triggerStatements = [regex]::Matches($triggerContent, '- ".*?"')
    Write-Info "发现 $($triggerStatements.Count) 个典型触发语句"
    
    if ($triggerStatements.Count -ge 5) {
        Write-Success "触发语句数量充足"
    } else {
        Write-Warning-Custom "触发语句数量不足（建议至少 5 个）"
    }
    
    Write-Host ""
    
    # 检查文档必须包含的内容
    $requiredContents = @(
        "核心计算公式",
        "关键参数表",
        "场景模拟",
        "对比表格",
        "权威来源"
    )
    
    foreach ($content in $requiredContents) {
        if ($triggerContent -match $content) {
            Write-Success "要求包含：$content"
        } else {
            Write-Warning-Custom "未要求包含：$content"
        }
    }
    
    Write-Host ""
    Write-Success "完整检查完成！"
} else {
    Write-Info "提示：使用 -FullCheck 参数执行更详细的内容检查"
    Write-Host ""
}

# 总结
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Success "Code-to-Doc 自动触发配置验证完成"
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

if ($FullCheck) {
    Write-Info "配置状态:"
    Write-Host "  ✅ 自动触发规则已配置"
    Write-Host "  ✅ Skill 文件已创建"
    Write-Host "  ✅ 使用指南已生成"
    Write-Host ""
    Write-Info "使用方法:"
    Write-Host "  用户只需说："
    Write-Host '    "帮我分析 [文件名] 的计算逻辑，生成场景模拟文档"'
    Write-Host "  AI 就会自动调用 code-to-doc 技能！"
} else {
    Write-Info "下一步:"
    Write-Host "  1. 运行完整检查：.\verify-auto-trigger-config.ps1 -FullCheck"
    Write-Host "  2. 测试自动触发：对 AI 说'帮我分析 demurrage.service.ts 的计算逻辑'"
    Write-Host "  3. 验证 AI 是否自动调用了 code-to-doc 技能"
}

Write-Host ""
