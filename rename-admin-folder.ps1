# Script to rename admin folder to admin-portal
# Run this script in PowerShell (as Administrator if needed)

Write-Host "Attempting to rename admin folder to admin-portal..."

# Check if admin folder exists
if (Test-Path "app\admin") {
    Write-Host "Found admin folder. Attempting rename..."
    
    # Try to rename
    try {
        Rename-Item -Path "app\admin" -NewName "admin-portal" -Force -ErrorAction Stop
        Write-Host "SUCCESS: Folder renamed to admin-portal!" -ForegroundColor Green
        Write-Host "Now run: git add app/admin-portal && git commit -m 'Rename admin folder to admin-portal' && git push"
    } catch {
        Write-Host "ERROR: Could not rename folder. Error: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please try:" -ForegroundColor Yellow
        Write-Host "1. Close all IDEs (VS Code, Cursor, etc.)" -ForegroundColor Yellow
        Write-Host "2. Stop any dev servers (Ctrl+C in terminal)" -ForegroundColor Yellow
        Write-Host "3. Close any file explorers with the folder open" -ForegroundColor Yellow
        Write-Host "4. Manually rename 'app\admin' to 'app\admin-portal' in Windows Explorer" -ForegroundColor Yellow
        Write-Host "5. Then run: git add app/admin-portal && git commit -m 'Rename admin folder' && git push" -ForegroundColor Yellow
    }
} else {
    Write-Host "Admin folder not found. It may already be renamed." -ForegroundColor Yellow
}


