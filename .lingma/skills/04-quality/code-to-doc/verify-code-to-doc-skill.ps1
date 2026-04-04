# Code-to-Doc Skill Verification Script
# 用于验证 code-to-doc 技能文件的完整性和规范性

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
Code-to-Doc Skill Verification Script

用法:
  .\verify-code-to-doc-skill.ps1 [-FullCheck] [-Help]

参数:
  -FullCheck  执行完整检查（包括内容验证）
  -Help       显示此帮助信息

示例:
  .\verify-code-to-doc-skill.ps1           # 基础检查
  .\verify-code-to-doc-skill.ps1 -FullCheck # 完整检查
"@
    exit 0
}

# 路径定义
$SkillPath = ".\.lingma\skills\04-quality\code-to-doc\SKILL.md"
$ReadmePath = ".\.lingma\skills\04-quality\code-to-doc\README.md"
$IndexPath = ".\.lingma\skills\INDEX.md"

Write-Info "开始验证 Code-to-Doc 技能文件..."
Write-Host ""

# 检查文件是否存在
$filesExist = $true

if (-not (Test-Path $SkillPath)) {
    Write-Error-Custom "SKILL.md 文件不存在：$SkillPath"
    $filesExist = $false
} else {
    Write-Success "SKILL.md 文件存在"
}

if (-not (Test-Path $ReadmePath)) {
    Write-Error-Custom "README.md 文件不存在：$ReadmePath"
    $filesExist = $false
} else {
    Write-Success "README.md 文件存在"
}

if (-not (Test-Path $IndexPath)) {
    Write-Error-Custom "索引文件不存在：$IndexPath"
    $filesExist = $false
} else {
    Write-Success "索引文件存在"
}

if (-not $filesExist) {
    Write-Host ""
    Write-Error-Custom "文件检查失败，请确认技能文件已正确创建"
    exit 1
}

Write-Host ""
Write-Info "所有必需文件都存在"
Write-Host ""

# 完整检查
if ($FullCheck) {
    Write-Info "执行完整内容检查..."
    Write-Host ""
    
    # 检查 SKILL.md 的 frontmatter
    $skillContent = Get-Content $SkillPath -Raw
    
    if ($skillContent -match "^---\s*name:\s*code-to-doc") {
        Write-Success "Frontmatter name 字段正确"
    } else {
        Write-Error-Custom "Frontmatter name 字段缺失或错误"
    }
    
    if ($skillContent -match "description:.*基于代码自动生成") {
        Write-Success "Frontmatter description 字段正确"
    } else {
        Write-Error-Custom "Frontmatter description 字段缺失或错误"
    }
    
    # 检查是否包含关键章节
    $requiredSections = @(
        "## 目标",
        "## 核心原则",
        "## 文档结构标准",
        "## 执行流程",
        "## 质量检查清单"
    )
    
    foreach ($section in $requiredSections) {
        if ($skillContent -match [regex]::Escape($section)) {
            Write-Success "包含章节：$section"
        } else {
            Write-Error-Custom "缺少章节：$section"
        }
    }
    
    Write-Host ""
    
    # 检查是否使用 Emoji
    $emojiPattern = '[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}]'
    $hasEmoji = $false
    try {
        if ($skillContent -match $emojiPattern) {
            $hasEmoji = $true
        }
    } catch {
        # PowerShell 版本不支持 Unicode 范围，跳过检查
        Write-Info "跳过 Emoji 检查（PowerShell 版本限制）"
    }
    
    if ($hasEmoji) {
        Write-Warning-Custom "发现 Emoji 表情（建议移除）"
    } else {
        Write-Success "未使用 Emoji 表情（符合 SKILL 原则）"
    }
    
    Write-Host ""
    
    # 检查索引文件是否包含新技能
    $indexContent = Get-Content $IndexPath -Raw
    if ($indexContent -match "code-to-doc") {
        Write-Success "索引文件已包含 code-to-doc 技能引用"
    } else {
        Write-Warning-Custom "索引文件未包含 code-to-doc 技能引用"
    }
    
    Write-Host ""
    
    # 统计行数
    $skillLines = (Get-Content $SkillPath).Count
    $readmeLines = (Get-Content $ReadmePath).Count
    
    Write-Info "文件统计:"
    Write-Host "  SKILL.md 行数：$skillLines"
    Write-Host "  README.md 行数：$readmeLines"
    
    if ($skillLines -gt 500) {
        Write-Warning-Custom "SKILL.md 超过 500 行（建议精简）"
    } else {
        Write-Success "SKILL.md 行数符合要求（≤500 行）"
    }
    
    Write-Host ""
    
    # 检查目录结构
    Write-Info "目录结构:"
    $parentDir = Split-Path $SkillPath -Parent
    $files = Get-ChildItem $parentDir
    
    foreach ($file in $files) {
        Write-Host "  - $($file.Name)"
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
Write-Success "Code-to-Doc 技能验证完成"
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Info "下一步："
Write-Host "  1. 测试技能调用：调用 code-to-doc 技能，分析某个模块"
Write-Host "  2. 生成示例文档：选择一个 Service 文件进行试分析"
Write-Host "  3. 验证输出格式：检查生成的文档是否符合预期"
Write-Host ""
