# Momentum 项目部署脚本
# 使用方法: .\deploy.ps1

Write-Host "🚀 开始部署 Momentum 项目到 Netlify..." -ForegroundColor Green

# 检查是否安装了必要的工具
Write-Host "📋 检查依赖..." -ForegroundColor Yellow
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 错误: 未找到 npm，请先安装 Node.js" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command netlify -ErrorAction SilentlyContinue)) {
    Write-Host "📦 安装 Netlify CLI..." -ForegroundColor Yellow
    npm install -g netlify-cli
}

# 安装依赖
Write-Host "📦 安装项目依赖..." -ForegroundColor Yellow
npm install

# 构建项目
Write-Host "🔨 构建项目..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 构建失败！" -ForegroundColor Red
    exit 1
}

# 检查是否已登录 Netlify
Write-Host "🔐 检查 Netlify 登录状态..." -ForegroundColor Yellow
$netlifyStatus = netlify status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "🔑 需要登录 Netlify..." -ForegroundColor Yellow
    netlify login
}

# 部署到生产环境
Write-Host "🚀 部署到 Netlify..." -ForegroundColor Yellow
netlify deploy --prod --dir=dist

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 部署成功！" -ForegroundColor Green
    Write-Host "🌐 访问地址: https://momentumctdp.netlify.app" -ForegroundColor Cyan
} else {
    Write-Host "❌ 部署失败！" -ForegroundColor Red
    exit 1
}
