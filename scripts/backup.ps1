# Sauvegarde de la base sous Windows (PowerShell). À planifier avec le Planificateur de tâches.
# Exemple : powershell -ExecutionPolicy Bypass -File C:\akn\scripts\backup.ps1
# Prérequis : les outils PostgreSQL (pg_dump, pg_restore) dans le PATH.
param(
  [string]$BackupDir = "$env:USERPROFILE\Sauvegardes\akn",
  [int]$RetentionDays = 30
)
$ErrorActionPreference = "Stop"

# Lit DATABASE_URL depuis le fichier .env du projet si elle n'est pas définie
if (-not $env:DATABASE_URL) {
  $envFile = Join-Path $PSScriptRoot "..\.env"
  Get-Content $envFile | Where-Object { $_ -match '^DATABASE_URL=' } | ForEach-Object {
    $env:DATABASE_URL = ($_ -replace '^DATABASE_URL=', '').Trim('"')
  }
}

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$file = Join-Path $BackupDir "akn-$stamp.dump"

pg_dump --format=custom --no-owner --file="$file" "$env:DATABASE_URL"
if ($LASTEXITCODE -ne 0) { throw "Échec de pg_dump" }
pg_restore --list "$file" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Archive illisible" }

$storage = Join-Path $PSScriptRoot "..\storage"
if (Test-Path $storage) {
  Compress-Archive -Path $storage -DestinationPath (Join-Path $BackupDir "akn-fichiers-$stamp.zip") -Force
}

Get-ChildItem $BackupDir -Filter "akn-*" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } | Remove-Item
Write-Host "Sauvegarde OK : $file"
