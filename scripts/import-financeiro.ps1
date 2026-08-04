<#
.SYNOPSIS
  Importa o banco historico `notas_despesas` como o schema `financeiro` do banco do app.

.DESCRIPTION
  O historico fiscal-financeiro (notas fiscais, despesas, controle de notas) vivia num
  banco separado `notas_despesas`, no schema `viveiro`. Este script traz esse schema
  para dentro do banco do app, renomeado para `financeiro`, de forma que:

    banco viveiro
      +-- public      -> tabelas do app (orders, customers, species, ...)
      +-- financeiro  -> historico do BI (notas_fiscais, despesas, ...)

  Fluxo: pg_dump -n viveiro (origem) -> pg_restore no alvo -> ALTER SCHEMA RENAME.

  O rename acontece DEPOIS do restore porque o pg_dump grava o nome do schema dentro
  do dump; renomear na origem seria destrutivo e o sed no dump seria fragil.

  Uso:
    npm run db:import-financeiro
    # ou direto:
    powershell -ExecutionPolicy Bypass -File scripts/import-financeiro.ps1
    powershell -ExecutionPolicy Bypass -File scripts/import-financeiro.ps1 -Force
    powershell -ExecutionPolicy Bypass -File scripts/import-financeiro.ps1 -Target neon -AllowRemote

.PARAMETER SourceDb
  Nome do banco de origem. Padrao: notas_despesas.

.PARAMETER Target
  Qual URL do .env.local usar como alvo: 'local' (DATABASE_URL, padrao) ou 'neon'
  (NEON_DATABASE_URL). Alvo remoto exige -AllowRemote.

.PARAMETER Force
  Se o schema `financeiro` ja existir no alvo, dropa antes de importar.
  SEM esta flag o script aborta em vez de sobrescrever.

.PARAMETER AllowRemote
  Libera alvo fora de localhost. Trava de seguranca para nao escrever no Neon por engano.
#>

param(
    [string]$SourceDb = 'notas_despesas',
    [ValidateSet('local', 'neon')]
    [string]$Target = 'local',
    [switch]$Force,
    [switch]$AllowRemote
)

$ErrorActionPreference = 'Stop'

# Schema como vem na origem e como queremos no destino.
$srcSchema = 'viveiro'
$dstSchema = 'financeiro'

# --- 1. Localizar as ferramentas do PostgreSQL ---
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

if ($Target -eq 'neon') {
    $targetUrl = $envVars['NEON_DATABASE_URL']
    if (-not $targetUrl) { throw "Defina NEON_DATABASE_URL no .env.local" }
} else {
    $targetUrl = $envVars['DATABASE_URL']
    if (-not $targetUrl) { throw "Defina DATABASE_URL no .env.local" }
}

# --- 3. Travas de seguranca ---
$isRemote = $targetUrl -match 'neon\.tech' -or $targetUrl -notmatch '127\.0\.0\.1|localhost'
if ($isRemote -and -not $AllowRemote) {
    throw "O alvo nao e localhost. Se a intencao e mesmo escrever em producao, repita com -AllowRemote."
}

# --- 4. Derivar a URL de origem trocando o nome do banco no final da URL do alvo ---
if ($targetUrl -notmatch '^(?<base>.+)/(?<db>[^/?]+)(?<query>\?.*)?$') {
    throw "Nao consegui interpretar a URL do alvo"
}
$base      = $Matches['base']
$targetDb  = $Matches['db']
$query     = $Matches['query']
$sourceUrl = "$base/$SourceDb$query"

if ($SourceDb -eq $targetDb) { throw "Origem e alvo sao o mesmo banco ($SourceDb). Abortado." }

Write-Host "==> Origem: banco '$SourceDb', schema '$srcSchema'" -ForegroundColor Cyan
Write-Host "==> Alvo:   banco '$targetDb', schema '$dstSchema'" -ForegroundColor Cyan

# --- 5. Conferir que a origem existe e tem o schema esperado ---
$srcCount = & $psql $sourceUrl -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema='$srcSchema';"
if ($LASTEXITCODE -ne 0) { throw "Nao consegui conectar no banco de origem '$SourceDb'" }
if ([int]$srcCount -eq 0) { throw "O schema '$srcSchema' nao existe (ou esta vazio) em '$SourceDb'" }
Write-Host "    origem tem $srcCount tabelas/views em '$srcSchema'" -ForegroundColor DarkGray

# --- 6. Conferir o estado do alvo ---
$dstExists = & $psql $targetUrl -Atc "SELECT count(*) FROM pg_namespace WHERE nspname='$dstSchema';"
if ($LASTEXITCODE -ne 0) { throw "Nao consegui conectar no banco alvo '$targetDb'" }

if ([int]$dstExists -gt 0) {
    if (-not $Force) {
        throw "O schema '$dstSchema' ja existe em '$targetDb'. Use -Force para substituir (isso APAGA o schema atual)."
    }
    Write-Host "==> -Force: removendo o schema '$dstSchema' existente..." -ForegroundColor Yellow
    & $psql $targetUrl -v ON_ERROR_STOP=1 -c "DROP SCHEMA $dstSchema CASCADE;"
    if ($LASTEXITCODE -ne 0) { throw "DROP SCHEMA falhou (exit $LASTEXITCODE)" }
}

# O restore cria o schema com o nome de origem; ele nao pode ja existir no alvo.
$tmpExists = & $psql $targetUrl -Atc "SELECT count(*) FROM pg_namespace WHERE nspname='$srcSchema';"
if ([int]$tmpExists -gt 0) {
    throw "O alvo ja tem um schema '$srcSchema' (sobra de uma importacao interrompida). Remova-o antes: DROP SCHEMA $srcSchema CASCADE;"
}

# --- 7. Dump da origem (somente o schema do BI) ---
$dumpFile = Join-Path $env:TEMP 'viveiro_financeiro.dump'
Write-Host "==> [1/3] Dump do schema '$srcSchema' de '$SourceDb'..." -ForegroundColor Cyan
& $pgDump $sourceUrl --schema=$srcSchema --format=custom --no-owner --no-privileges --file=$dumpFile
if ($LASTEXITCODE -ne 0) { throw "pg_dump falhou (exit $LASTEXITCODE)" }

# --- 8. Restore no alvo ---
Write-Host "==> [2/3] Restaurando em '$targetDb'..." -ForegroundColor Cyan
& $pgRestore --no-owner --no-privileges --dbname=$targetUrl $dumpFile
# pg_restore pode sair com 1 so por warnings; o que vale e a verificacao do passo 9.
if ($LASTEXITCODE -ne 0) { Write-Host "    (pg_restore terminou com avisos)" -ForegroundColor Yellow }

# --- 9. Renomear o schema ---
Write-Host "==> [3/3] Renomeando '$srcSchema' -> '$dstSchema'..." -ForegroundColor Cyan
& $psql $targetUrl -v ON_ERROR_STOP=1 -c "ALTER SCHEMA $srcSchema RENAME TO $dstSchema;"
if ($LASTEXITCODE -ne 0) { throw "ALTER SCHEMA RENAME falhou (exit $LASTEXITCODE)" }

Remove-Item $dumpFile -ErrorAction SilentlyContinue

# --- 10. Conferencia: contagem de linhas das tabelas-fato tem que bater com a origem ---
Write-Host "==> Conferindo contagens..." -ForegroundColor Cyan
$tabelas = @('despesas', 'notas_fiscais', 'itens_nota', 'controle_notas', 'pessoas', 'enderecos')
$falhou = $false
foreach ($t in $tabelas) {
    $antes  = (& $psql $sourceUrl -Atc "SELECT count(*) FROM $srcSchema.$t;").Trim()
    $depois = (& $psql $targetUrl -Atc "SELECT count(*) FROM $dstSchema.$t;").Trim()
    if ($antes -eq $depois) {
        Write-Host ("    OK   {0,-16} {1}" -f $t, $antes) -ForegroundColor DarkGray
    } else {
        Write-Host ("    FALHA {0,-16} origem={1} alvo={2}" -f $t, $antes, $depois) -ForegroundColor Red
        $falhou = $true
    }
}
if ($falhou) { throw "As contagens nao bateram. O schema '$dstSchema' pode estar incompleto." }

Write-Host "==> Pronto! Schema '$dstSchema' importado em '$targetDb'." -ForegroundColor Green
Write-Host "    O banco de origem '$SourceDb' foi apenas lido e continua intacto." -ForegroundColor DarkGray
