<#
.SYNOPSIS
  Espelha o banco do Neon (producao) para o Postgres local, recriando-o do zero.

.DESCRIPTION
  Le NEON_DATABASE_URL (fonte) e LOCAL_DATABASE_URL (alvo) do .env.local.
  Fluxo: pg_dump do Neon (so leitura) -> DROP/CREATE do banco local -> pg_restore.
  Resultado: copia fresca dos dados de producao para testar sem tocar no banco real.

  Uso:
    npm run db:refresh-local
    # ou direto:
    powershell -ExecutionPolicy Bypass -File scripts/refresh-local-db.ps1
#>

$ErrorActionPreference = 'Stop'

# --- 1. Localizar as ferramentas do PostgreSQL (pg_dump / psql / pg_restore) ---
$pgBin = $null
foreach ($v in 17, 16, 15, 14) {
    $candidate = "C:\Program Files\PostgreSQL\$v\bin"
    if (Test-Path (Join-Path $candidate 'pg_dump.exe')) { $pgBin = $candidate; break }
}
if (-not $pgBin) { throw "Nao encontrei pg_dump em C:\Program Files\PostgreSQL\<versao>\bin" }

$pgDump    = Join-Path $pgBin 'pg_dump.exe'
$psql      = Join-Path $pgBin 'psql.exe'
$pgRestore = Join-Path $pgBin 'pg_restore.exe'

# --- 2. Ler as URLs do .env.local ---
$envPath = Join-Path $PSScriptRoot '..\.env.local'
if (-not (Test-Path $envPath)) { throw ".env.local nao encontrado em $envPath" }

$envVars = @{}
foreach ($line in Get-Content $envPath) {
    $t = $line.Trim()
    if (-not $t -or $t.StartsWith('#')) { continue }
    $idx = $t.IndexOf('=')
    if ($idx -lt 0) { continue }
    $envVars[$t.Substring(0, $idx).Trim()] = $t.Substring($idx + 1).Trim()
}

$source = $envVars['NEON_DATABASE_URL']
$target = $envVars['LOCAL_DATABASE_URL']
if (-not $source) { throw "Defina NEON_DATABASE_URL no .env.local" }
if (-not $target) { throw "Defina LOCAL_DATABASE_URL no .env.local" }

# --- 3. Travas de seguranca (nunca escrever no Neon por engano) ---
if ($source -notmatch 'neon\.tech')      { throw "NEON_DATABASE_URL nao parece ser do Neon. Abortado por seguranca." }
if ($target -match 'neon\.tech')         { throw "LOCAL_DATABASE_URL aponta para o Neon! Abortado para nao destruir producao." }
if ($target -notmatch '127\.0\.0\.1|localhost') { throw "LOCAL_DATABASE_URL nao e localhost. Abortado por seguranca." }

# --- 4. Extrair nome do banco e montar a conexao de manutencao (banco 'postgres') ---
if ($target -notmatch '^(?<base>.+)/(?<db>[^/?]+)(?<query>\?.*)?$') {
    throw "Nao consegui interpretar LOCAL_DATABASE_URL"
}
$base    = $Matches['base']
$localDb = $Matches['db']
$adminUrl = "$base/postgres"   # conecta no banco padrao para poder dropar/criar o local

$dumpFile = Join-Path $env:TEMP 'viveiro_neon.dump'

Write-Host "==> Banco alvo local: $localDb" -ForegroundColor Cyan

# --- 5. Dump do Neon (somente leitura na producao) ---
Write-Host "==> [1/3] Baixando dump do Neon..." -ForegroundColor Cyan
& $pgDump $source --format=custom --no-owner --no-privileges --file=$dumpFile
if ($LASTEXITCODE -ne 0) { throw "pg_dump falhou (exit $LASTEXITCODE)" }

# --- 6. Recriar o banco local do zero ---
Write-Host "==> [2/3] Recriando banco local '$localDb' do zero..." -ForegroundColor Cyan
& $psql $adminUrl -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $localDb WITH (FORCE);"
if ($LASTEXITCODE -ne 0) { throw "DROP DATABASE falhou (exit $LASTEXITCODE)" }
& $psql $adminUrl -v ON_ERROR_STOP=1 -c "CREATE DATABASE $localDb;"
if ($LASTEXITCODE -ne 0) { throw "CREATE DATABASE falhou (exit $LASTEXITCODE)" }

# --- 7. Restaurar o dump no banco local ---
Write-Host "==> [3/3] Restaurando dados no local..." -ForegroundColor Cyan
& $pgRestore --no-owner --no-privileges --dbname=$target $dumpFile
# pg_restore pode retornar exit code 1 com apenas warnings; tratamos como aviso.
if ($LASTEXITCODE -ne 0) { Write-Host "   (pg_restore terminou com avisos - geralmente inofensivos)" -ForegroundColor Yellow }

Remove-Item $dumpFile -ErrorAction SilentlyContinue
Write-Host "==> Pronto! Banco local '$localDb' atualizado com os dados do Neon." -ForegroundColor Green
