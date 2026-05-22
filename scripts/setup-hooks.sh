#!/usr/bin/env bash
# Instala o git pre-commit hook a partir de scripts/pre-commit.sh

# Encontrar o diretorio .git/hooks
HOOK_DIR="$(git rev-parse --git-dir 2>/dev/null)/hooks"

if [ ! -d "$HOOK_DIR" ]; then
    echo "[setup-hooks] Diretorio .git/hooks nao encontrado. Pulando instalacao do hook."
    exit 0
fi

# Encontrar o script pre-commit.sh relativo ao root do repo
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
SOURCE="$REPO_ROOT/scripts/pre-commit.sh"

if [ ! -f "$SOURCE" ]; then
    echo "[setup-hooks] scripts/pre-commit.sh nao encontrado. Pulando."
    exit 0
fi

cp "$SOURCE" "$HOOK_DIR/pre-commit"
chmod +x "$HOOK_DIR/pre-commit"
echo "[setup-hooks] Git pre-commit hook instalado com sucesso."
