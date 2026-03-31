<#
.SYNOPSIS
    LogiX Test Data Cleanup Tool
    Deletes imported test data (replenishment orders, containers, and related process/extension tables)

.DESCRIPTION
    This script connects to PostgreSQL database and executes cleanup scripts to delete all test data.
    Supports local development and testing environments.

.PARAMETER Database
    Database name, default is "logix"

.PARAMETER Host
    Database host, default is "localhost"

.PARAMETER Port
    Database port, default is 5432

.PARAMETER Username
    Database username, default is "postgres"

.PARAMETER Password
    Database password (recommend using environment variable LOGIX_DB_PASSWORD)

.PARAMETER SqlFile
    SQL script file path, default is cleanup-test-data.sql in current directory

.PARAMETER DryRun
    Only preview data to be deleted, do not execute

.PARAMETER Force
    Skip confirmation prompt and execute directly

.EXAMPLE
    .\cleanup-test-data.ps1
    Execute cleanup with default parameters

.EXAMPLE
    .\cleanup-test-data.ps1 -Database "logix_test" -Username "admin"
    Specify database and username

.EXAMPLE
    .\cleanup-test-data.ps1 -DryRun
    Preview data to be deleted

.EXAMPLE
    $env:LOGIX_DB_PASSWORD = "your_password"; .\cleanup-test-data.ps1 -Force
    Use environment variable for password and skip confirmation

.NOTES
    Filename: cleanup-test-data.ps1
    Author: LogiX Team
    Version: 1.0.2
    Created: 2026-03-26
    Updated: 2026-03-31

.LINK
    https://github.com/your-org/logix
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(HelpMessage = "Database name")]
    [string]$Database = "logix",

    [Parameter(HelpMessage = "Database host")]
    [string]$DbHost = "localhost",

    [Parameter(HelpMessage = "Database port")]
    [int]$Port = 5432,

    [Parameter(HelpMessage = "Database username")]
    [string]$Username = "postgres",

    [Parameter(HelpMessage = "Database password")]
    [string]$Password = $env:LOGIX_DB_PASSWORD,

    [Parameter(HelpMessage = "SQL script file path")]
    [string]$SqlFile,

    [Parameter(HelpMessage = "Preview only, do not execute")]
    [switch]$DryRun,

    [Parameter(HelpMessage = "Skip confirmation")]
    [switch]$Force
)

# Set default SQL file path if not provided
if (-not $SqlFile) {
    $SqlFile = Join-Path $PSScriptRoot "cleanup-test-data.sql"
}

# Set error handling
$ErrorActionPreference = "Stop"

# Color definitions
$ColorInfo = "Cyan"
$ColorSuccess = "Green"
$ColorWarning = "Yellow"
$ColorError = "Red"

# Output functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $ColorInfo
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $ColorSuccess
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $ColorWarning
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $ColorError
}

# Show script banner
function Show-Banner {
    Write-Host @"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║           LogiX Test Data Cleanup Tool v1.0.2                ║
║                                                              ║
║   WARNING: This operation will delete all test data!         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor $ColorWarning
}

# Check dependencies
function Test-Dependencies {
    Write-Info "Checking dependencies..."

    # Check if psql is installed
    $psqlPath = Get-Command "psql" -ErrorAction SilentlyContinue
    if (-not $psqlPath) {
        Write-Error "psql command not found. Please install PostgreSQL client and add to PATH."
        Write-Info "Download: https://www.postgresql.org/download/"
        exit 1
    }

    Write-Success "psql found: $($psqlPath.Source)"

    # Check if SQL file exists
    if (-not (Test-Path $SqlFile)) {
        Write-Error "SQL file not found: $SqlFile"
        exit 1
    }

    Write-Success "SQL file found: $SqlFile"
}

# Verify database connection
function Test-DatabaseConnection {
    Write-Info "Verifying database connection..."

    $env:PGPASSWORD = $Password
    $connectionString = "postgresql://$Username`:$DbHost`:$Port/$Database"

    try {
        $result = psql -h $DbHost -p $Port -U $Username -d $Database -c "SELECT 1 as connected;" 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Connection failed"
        }
        Write-Success "Database connected: $connectionString"
    }
    catch {
        Write-Error "Database connection failed: $connectionString"
        Write-Error $_.Exception.Message
        exit 1
    }
    finally {
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# Preview data to be deleted
function Show-Preview {
    Write-Info "Previewing data to be deleted..."
    Write-Host ""

    $env:PGPASSWORD = $Password

    $tables = @(
        @{Name = "ext_container_alerts"; Desc = "Container alerts"},
        @{Name = "ext_container_status_events"; Desc = "Container status events"},
        @{Name = "ext_container_loading_records"; Desc = "Container loading records"},
        @{Name = "ext_container_charges"; Desc = "Container charges"},
        @{Name = "ext_demurrage_records"; Desc = "Demurrage records"},
        @{Name = "ext_feituo_status_events"; Desc = "Feituo status events"},
        @{Name = "ext_feituo_places"; Desc = "Feituo places"},
        @{Name = "ext_feituo_vessels"; Desc = "Feituo vessels"},
        @{Name = "sys_data_change_log"; Desc = "System data change log"},
        @{Name = "ext_trucking_return_slot_occupancy"; Desc = "Trucking return slot occupancy"},
        @{Name = "ext_trucking_slot_occupancy"; Desc = "Trucking slot occupancy"},
        @{Name = "ext_warehouse_daily_occupancy"; Desc = "Warehouse daily occupancy"},
        @{Name = "process_port_operations"; Desc = "Port operations"},
        @{Name = "process_trucking_transport"; Desc = "Trucking transport"},
        @{Name = "process_warehouse_operations"; Desc = "Warehouse operations"},
        @{Name = "process_empty_return"; Desc = "Empty container return"},
        @{Name = "biz_replenishment_orders"; Desc = "Replenishment orders"},
        @{Name = "biz_containers"; Desc = "Containers"},
        @{Name = "process_sea_freight"; Desc = "Sea freight"}
    )

    Write-Host "Table Name                                Count       Description" -ForegroundColor $ColorInfo
    Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor $ColorInfo

    $totalRecords = 0

    foreach ($table in $tables) {
        try {
            $count = psql -h $DbHost -p $Port -U $Username -d $Database -t -c "SELECT COUNT(*) FROM $($table.Name);" 2>$null
            $count = $count.Trim()
            if ($count -match '^\d+$') {
                $totalRecords += [int]$count
                $color = if ([int]$count -gt 0) { $ColorWarning } else { $ColorSuccess }
                Write-Host ($table.Name.PadRight(40) + $count.PadRight(12) + $table.Desc) -ForegroundColor $color
            }
        }
        catch {
            Write-Host ($table.Name.PadRight(40) + "N/A".PadRight(12) + $table.Desc) -ForegroundColor $ColorError
        }
    }
    
    Write-Host ""
    Write-Host "Total records: $totalRecords" -ForegroundColor $ColorInfo
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

# Execute SQL script
function Invoke-SqlScript {
    Write-Info "Executing SQL cleanup script..."
    
    $env:PGPASSWORD = $Password
    
    try {
        $result = psql -h $DbHost -p $Port -U $Username -d $Database -f $SqlFile 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "SQL execution failed: $result"
        }
        Write-Success "SQL script executed successfully"
        Write-Host $result
    }
    catch {
        Write-Error "SQL script execution failed"
        Write-Error $_.Exception.Message
        exit 1
    }
    finally {
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# ==================== Main Program ====================

Show-Banner
Test-Dependencies

if ($DryRun) {
    Write-Warning "DRY RUN MODE: Preview only, no deletion will be performed"
    Test-DatabaseConnection
    Show-Preview
    Write-Success "Preview completed. No data was deleted."
    exit 0
}

Test-DatabaseConnection
Show-Preview

Write-Host ""
if (-not $Force) {
    $confirmation = Read-Host "Are you sure you want to delete all test data? This cannot be undone [y/N]"
    if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
        Write-Info "Operation cancelled"
        exit 0
    }
}

Invoke-SqlScript

Write-Success "Test data cleanup completed!"
Write-Info "Use the following command to verify results:"
Write-Host "  psql -h $DbHost -p $Port -U $Username -d $Database -c `"SELECT * FROM cleanup_verification;`""
