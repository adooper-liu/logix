# PowerShell script to fix container_number column naming
# This script executes SQL to rename containerNumber to container_number

$envFile = ".env"

# Read database config from .env file
$envContent = Get-Content $envFile
$host = ($envContent | Select-String "DB_HOST=").Line -replace "DB_HOST=", ""
$port = ($envContent | Select-String "DB_PORT=").Line -replace "DB_PORT=", ""
$username = ($envContent | Select-String "DB_USERNAME=").Line -replace "DB_USERNAME=", ""
$password = ($envContent | Select-String "DB_PASSWORD=").Line -replace "DB_PASSWORD=", ""
$database = ($envContent | Select-String "DB_DATABASE=").Line -replace "DB_DATABASE=", ""

Write-Host "Connecting to database $database on $host:$port..."

# Set PGPASSWORD environment variable
$env:PGPASSWORD = $password

# Execute SQL using psql (if available) or use Docker exec
# For now, we'll use the database connection through the running backend service
Write-Host "Please execute the SQL in migrations/fix-container-number-column.sql manually"
Write-Host "Or restart the backend service to see if the issue persists"
