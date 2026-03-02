@echo off
setlocal enabledelayedexpansion

echo 🚀 开始代码质量检查...

set CHECK_ALL=true
set CHECK_TS=false
set CHECK_LINT=false
set CHECK_FORMAT=false

:parse_args
if "%1"=="" goto start_check
if "%1"=="--ts" (
    set CHECK_TS=true
    set CHECK_ALL=false
    shift
    goto parse_args
)
if "%1"=="--lint" (
    set CHECK_LINT=true
    set CHECK_ALL=false
    shift
    goto parse_args
)
if "%1"=="--format" (
    set CHECK_FORMAT=true
    set CHECK_ALL=false
    shift
    goto parse_args
)
echo 未知参数: %1
exit /b 1

:start_check

REM TypeScript类型检查
if "%CHECK_ALL%"=="true" if "%CHECK_TS%"=="true" (
    echo 🔍 TypeScript类型检查...
    
    echo   → 检查后端...
    cd backend && npm run type-check
    if errorlevel 1 (
        echo ❌ 后端TypeScript检查失败
        exit /b 1
    )
    
    echo   → 检查前端...
    cd ..\frontend && npm run type-check
    if errorlevel 1 (
        echo ❌ 前端TypeScript检查失败
        exit /b 1
    )
    
    echo ✅ TypeScript检查通过
)

REM ESLint代码规范检查
if "%CHECK_ALL%"=="true" if "%CHECK_LINT%"=="true" (
    echo 🔍 ESLint代码规范检查...
    
    echo   → 检查后端...
    cd ..\backend && npm run lint
    if errorlevel 1 (
        echo ❌ 后端ESLint检查失败
        exit /b 1
    )
    
    echo   → 检查前端...
    cd ..\frontend && npm run lint
    if errorlevel 1 (
        echo ❌ 前端ESLint检查失败
        exit /b 1
    )
    
    echo ✅ ESLint检查通过
)

REM 代码格式化检查
if "%CHECK_ALL%"=="true" if "%CHECK_FORMAT%"=="true" (
    echo 🔍 代码格式化检查...
    
    echo   → 格式化后端...
    cd ..\backend && npm run format
    
    echo   → 格式化前端...
    cd ..\frontend && npm run format
    
    echo ✅ 代码格式化完成
)

echo 🎉 所有代码质量检查通过！