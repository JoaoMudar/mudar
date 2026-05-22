#!/usr/bin/env bash
set -uo pipefail

# ============================================================
# Auto-commit hook para Claude Code (evento Stop)
# Roda automaticamente quando o Claude Code termina de responder.
# ============================================================

# Ler JSON do stdin (enviado pelo Claude Code)
INPUT=$(cat)

# Tentar extrair o campo "cwd" do JSON de entrada
if command -v node > /dev/null 2>&1; then
    CWD=$(echo "$INPUT" | node -e "
        let d='';
        process.stdin.on('data',c=>d+=c);
        process.stdin.on('end',()=>{
            try{console.log(JSON.parse(d).cwd||'')}
            catch(e){console.log('')}
        });
    " 2>/dev/null)
else
    CWD=$(echo "$INPUT" | grep -o '"cwd"\s*:\s*"[^"]*"' | head -1 | sed 's/.*"cwd"\s*:\s*"//;s/"$//')
fi

# Se obteve cwd, navegar ate la
if [ -n "$CWD" ]; then
    cd "$CWD" || exit 0
fi

# ------------------------------------------------------------
# Verificacao: estamos dentro de um repositorio Git?
# ------------------------------------------------------------
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    exit 0
fi

# ------------------------------------------------------------
# Verificacao: branch atual
# ------------------------------------------------------------
BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")

if [ -z "$BRANCH" ]; then
    echo "[hook] Nao foi possivel determinar a branch atual."
    exit 0
fi

if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
    echo "============================================"
    echo "[hook] AUTO-COMMIT BLOQUEADO"
    echo "[hook] Branch protegida: '$BRANCH'"
    echo "[hook] Crie uma branch de tarefa primeiro:"
    echo "       git checkout -b feat/nome-da-tarefa"
    echo "============================================"
    exit 0
fi

# ------------------------------------------------------------
# Verificacao: ha alteracoes?
# ------------------------------------------------------------
STAGED=$(git diff --cached --name-only 2>/dev/null)
UNSTAGED=$(git diff --name-only 2>/dev/null)
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null)

if [ -z "$STAGED" ] && [ -z "$UNSTAGED" ] && [ -z "$UNTRACKED" ]; then
    exit 0
fi

# ------------------------------------------------------------
# Verificacao: arquivos sensiveis
# ------------------------------------------------------------
ALL_CHANGED=$(printf '%s\n%s\n%s' "$STAGED" "$UNSTAGED" "$UNTRACKED" | sort -u | grep -v '^$')
SENSITIVE_FOUND=""

while IFS= read -r file; do
    [ -z "$file" ] && continue
    filename=$(basename "$file")
    case "$filename" in
        .env|.env.*)
            SENSITIVE_FOUND="$SENSITIVE_FOUND\n  - $file"
            ;;
    esac
    lower_filename=$(echo "$filename" | tr '[:upper:]' '[:lower:]')
    case "$lower_filename" in
        *secret*|*credential*|*token*|*.key|*.pem)
            SENSITIVE_FOUND="$SENSITIVE_FOUND\n  - $file"
            ;;
    esac
done <<< "$ALL_CHANGED"

if [ -n "$SENSITIVE_FOUND" ]; then
    echo "============================================"
    echo "[hook] AUTO-COMMIT BLOQUEADO"
    echo "[hook] Arquivos sensiveis detectados:"
    echo -e "$SENSITIVE_FOUND"
    echo ""
    echo "[hook] Remova esses arquivos ou adicione ao .gitignore."
    echo "============================================"
    exit 1
fi

# ------------------------------------------------------------
# Filtrar arquivos alterados que sao lintaveis/testaveis
# ------------------------------------------------------------
CHANGED_TS=$(printf '%s\n' $ALL_CHANGED | grep -E '\.(ts|tsx|js|jsx|mjs)$' || true)

# ------------------------------------------------------------
# Validacao: rodar lint somente nos arquivos alterados
# ------------------------------------------------------------
if [ -n "$CHANGED_TS" ]; then
    echo "[hook] Rodando lint nos arquivos alterados..."
    if ! npx eslint $CHANGED_TS 2>&1; then
        echo "============================================"
        echo "[hook] AUTO-COMMIT BLOQUEADO"
        echo "[hook] Lint falhou. Corrija os erros antes."
        echo "============================================"
        exit 1
    fi
    echo "[hook] Lint OK."
fi

# ------------------------------------------------------------
# Validacao: rodar testes relacionados aos arquivos alterados
# ------------------------------------------------------------
if [ -n "$CHANGED_TS" ] && [ -f "package.json" ] && grep -q '"test"' package.json 2>/dev/null; then
    echo "[hook] Rodando testes relacionados..."
    if ! npx vitest run --changed 2>&1; then
        echo "============================================"
        echo "[hook] AUTO-COMMIT BLOQUEADO"
        echo "[hook] Testes falharam. Corrija antes."
        echo "============================================"
        exit 1
    fi
    echo "[hook] Testes OK."
fi

# ------------------------------------------------------------
# Stage e commit
# ------------------------------------------------------------
git add .

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
FILE_LIST=$(git diff --cached --name-only 2>/dev/null | head -30)
FILE_COUNT=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')

if [ "$FILE_COUNT" = "0" ]; then
    exit 0
fi

COMMIT_MSG="auto(claude): commit automatico na branch $BRANCH

Branch: $BRANCH
Data: $TIMESTAMP
Arquivos alterados ($FILE_COUNT):
$FILE_LIST

[commit automatico gerado pelo Claude Code]"

git commit -m "$COMMIT_MSG"

echo "============================================"
echo "[hook] Commit criado na branch '$BRANCH'"
echo "[hook] $FILE_COUNT arquivo(s) alterado(s)"
echo "============================================"

# ------------------------------------------------------------
# Push opcional (controlado por variavel de ambiente)
# Defina CLAUDE_AUTO_PUSH=false para desabilitar
# ------------------------------------------------------------
CLAUDE_AUTO_PUSH="${CLAUDE_AUTO_PUSH:-true}"

if [ "$CLAUDE_AUTO_PUSH" = "true" ]; then
    if git remote get-url origin > /dev/null 2>&1; then
        if git push -u origin "$BRANCH" 2>/dev/null; then
            echo "[hook] Push realizado para origin/$BRANCH"
        else
            echo "[hook] Push falhou (nao critico). Faca manualmente:"
            echo "       git push -u origin $BRANCH"
        fi
    fi
fi

exit 0