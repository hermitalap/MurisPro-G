$Host.UI.RawUI.WindowTitle = "MurisPro Dev Launcher"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MurisPro - Dev Environment Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }
Set-Location $root

# Check backend venv
$pyExe = Join-Path $root "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $pyExe)) {
    Write-Host "[ERROR] Backend venv not found at backend\.venv\" -ForegroundColor Red
    Write-Host "  Run these first:" -ForegroundColor Yellow
    Write-Host "    cd backend" -ForegroundColor Yellow
    Write-Host "    uv venv .venv" -ForegroundColor Yellow
    Write-Host '    uv pip install --python .venv\Scripts\python.exe -r requirements.txt' -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check node_modules
if (-not (Test-Path (Join-Path $root "node_modules"))) {
    Write-Host "[INFO] node_modules not found, running npm install..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] npm install failed" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host ""
}

# Start backend in a new PowerShell window
Write-Host "[1/2] Starting backend Flask (localhost:5000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; & '$pyExe' app.py"

# Wait for backend
Write-Host "      Waiting for backend..." -ForegroundColor DarkGray
Start-Sleep -Seconds 3

# Start frontend
Write-Host "[2/2] Starting frontend Vue dev server (localhost:8080)..." -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:8080" -ForegroundColor White
Write-Host "  Backend:  http://localhost:5000" -ForegroundColor White
Write-Host ""
Write-Host "  Close this window to stop frontend" -ForegroundColor DarkGray
Write-Host "  Close backend window to stop backend" -ForegroundColor DarkGray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

npm run serve
