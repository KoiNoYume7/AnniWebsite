# AnniLog -- Reusable PowerShell Logging Module
$script:AnniLogState = @{ LogFilePath = $null; LogLevel = "INFO"; Stopwatch = $null; Initialised = $false }
$script:LevelPriority = @{ "ERROR" = 0; "WARNING" = 1; "INFO" = 2; "SUCCESS" = 2; "DEBUG" = 3 }
$script:LevelColour   = @{ "ERROR" = "Red"; "WARNING" = "Yellow"; "INFO" = "White"; "SUCCESS" = "Green"; "DEBUG" = "Cyan" }

function Initialize-AnniLog {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)][string]$LogFilePath,
        [ValidateSet("ERROR", "WARNING", "INFO", "SUCCESS", "DEBUG")][string]$LogLevel = "INFO",
        [switch]$EnableStopwatch
    )
    $logDir = Split-Path -Parent $LogFilePath
    if ($logDir -and -not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
    $script:AnniLogState.LogFilePath = $LogFilePath; $script:AnniLogState.LogLevel = $LogLevel; $script:AnniLogState.Initialised = $true
    if ($EnableStopwatch) { $script:AnniLogState.Stopwatch = [System.Diagnostics.Stopwatch]::StartNew() }
    "--- Log session started at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ---" | Out-File -FilePath $LogFilePath -Append -Encoding utf8
}

function Write-AnniLog {
    [CmdletBinding()]
    param(
        [ValidateSet("ERROR", "WARNING", "INFO", "SUCCESS", "DEBUG")][string]$Level = "INFO",
        [Parameter(Mandatory = $true)][string]$Message
    )
    if (-not $script:AnniLogState.Initialised) { Write-Warning "AnniLog: not initialised."; return }
    if ($script:LevelPriority[$Level] -gt $script:LevelPriority[$script:AnniLogState.LogLevel]) { return }
    $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    Write-Host "[$Level] $Message" -ForegroundColor $script:LevelColour[$Level]
    if ($script:AnniLogState.LogFilePath) { "$ts [$Level] $Message" | Out-File -FilePath $script:AnniLogState.LogFilePath -Append -Encoding utf8 }
}

function Close-AnniLog {
    [CmdletBinding()]
    param()
    if (-not $script:AnniLogState.Initialised) { return }
    if ($script:AnniLogState.Stopwatch) {
        $script:AnniLogState.Stopwatch.Stop()
        Write-AnniLog -Level INFO -Message ("Total elapsed time: {0:hh\:mm\:ss\.fff}" -f $script:AnniLogState.Stopwatch.Elapsed)
    }
    if ($script:AnniLogState.LogFilePath) { "--- Log session ended at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ---" | Out-File -FilePath $script:AnniLogState.LogFilePath -Append -Encoding utf8 }
    $script:AnniLogState.LogFilePath = $null; $script:AnniLogState.LogLevel = "INFO"; $script:AnniLogState.Stopwatch = $null; $script:AnniLogState.Initialised = $false
}

Export-ModuleMember -Function Initialize-AnniLog, Write-AnniLog, Close-AnniLog
