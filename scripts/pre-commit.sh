#!/usr/bin/env bash
set -uo pipefail

# ============================================================
# Git pre-commit hook
# Bloqueia commit se lint ou testes falham.
# Bloqueia commit direto em main/master.
# Bloqueia commit com arquivos sensiveis.
# ============================================================

# --- Protecao de branch ---
BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
    echo "============================================"
    echo "[pre-commit] COMMIT BLOQUEADO"
    echo "[pre-commit] Branch protegida: '$BRANCH'"
    echo "[pre-commit] Crie uma branch de tarefa:"
    echo "    git checkout -b feat/nome-da-tarefa"
    echo "============================================"
    exit 1
fi

# --- Verificacao de arquivos sensiveis no staging ---
STAGED_FILES=$(git diff --cached --name-only)
SENSITIVE=""

for file in $STAGED_FILES; do
    filename=$(basename "$file")
    lower=$(echo "$filename" | tr '[:upper:]' '[:lower:]')
    case "$lower" in
        .env|.env.*) SENSITIVE="$SENSITIVE\n  - $file" ;;
        *secret*|*credential*|*token*|*.key|*.pem) SENSITIVE="$SENSITIVE\n  - $file" ;;
    esac
done

if [ -n "$SENSITIVE" ]; then
    echo "============================================"
    echo "[pre-commit] COMMIT BLOQUEADO"
    echo "[pre-commit] Arquivos sensiveis detectados:"
    echo -e "$SENSITIVE"
    echo "[pre-commit] Remova do staging ou adicione ao .gitignore"
    echo "============================================"
    exit 1
fi

# --- Filtrar arquivos staged que sao lintaveis/testaveis ---
STAGED_TS=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx|mjs)$' || true)

# --- Lint (somente arquivos staged) ---
if [ -n "$STAGED_TS" ]; then
    echo "[pre-commit] Rodando lint nos arquivos alterados..."
    if ! npx eslint $STAGED_TS 2>&1; then
        echo "============================================"
        echo "[pre-commit] COMMIT BLOQUEADO"
        echo "[pre-commit] Lint falhou. Corrija antes de commitar."
        echo "============================================"
        exit 1
    fi
    echo "[pre-commit] Lint OK."
fi

# --- Testes (somente relacionados aos arquivos alterados) ---
if [ -n "$STAGED_TS" ] && [ -f "package.json" ] && grep -q '"test"' package.json 2>/dev/null; then
    echo "[pre-commit] Rodando testes relacionados..."
    if ! npx vitest run --changed 2>&1; then
        echo "============================================"
        echo "[pre-commit] COMMIT BLOQUEADO"
        echo "[pre-commit] Testes falharam. Corrija antes de commitar."
        echo "============================================"
        exit 1
    fi
    echo "[pre-commit] Testes OK."
fi

echo "[pre-commit] Todas as verificacoes passaram."
exit 0
