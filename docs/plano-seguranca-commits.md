# Plano de Implementacao - Seguranca de Commits com Claude Code

## Visao Geral

Implementar um fluxo seguro de versionamento automatico para uso com Claude Code.
O objetivo e que toda tarefa feita pelo Claude Code seja registrada em Git, em branch separada, com commits automaticos ao final da tarefa. A branch `main` permanece protegida e o merge nunca e automatico.

## Pre-requisitos

- O projeto deve ser um repositorio Git inicializado (`git init` se necessario)
- Node.js instalado (para rodar lint/tests)
- Git Bash ou WSL no Windows (o script hook e bash)

---

## Tarefa 1 - Criar CLAUDE.md na raiz do projeto

Criar o arquivo `CLAUDE.md` na raiz com o seguinte conteudo exato:

```markdown
# Regras para Claude Code neste projeto

## Regras de branch

- NUNCA trabalhe diretamente na branch `main` ou `master`.
- Antes de alterar qualquer arquivo, verifique a branch atual com `git branch --show-current`.
- Se estiver na `main` ou `master`, PARE e oriente o usuario a criar uma branch de tarefa:
  ```
  git checkout -b feat/nome-da-tarefa
  ```
- NUNCA faca merge para `main` sem autorizacao explicita do usuario.

## Regras de commit

- Nunca commite arquivos `.env`, credenciais, tokens, dumps sensiveis ou arquivos privados.
- Use mensagens de commit objetivas e descritivas.
- O hook automatico (`Stop`) cuida do commit ao final da tarefa. Nao faca commits manuais a menos que o usuario peca.

## Ao finalizar uma tarefa

Sempre apresente um resumo contendo:
- O que foi feito
- Arquivos alterados
- Decisoes tecnicas tomadas
- Pendencias (se houver)
- Comandos importantes executados

## Seguranca

- Nunca execute `git push --force` em nenhuma branch.
- Nunca execute `git reset --hard` sem autorizacao.
- Nunca delete branches sem autorizacao.
- Nunca modifique `.claude/settings.json` ou os hooks sem autorizacao.
```

---

## Tarefa 2 - Criar a pasta .claude/hooks/

```bash
mkdir -p .claude/hooks
```

---

## Tarefa 3 - Criar o script de hook

Criar o arquivo `.claude/hooks/auto-commit-stop.sh` com o seguinte conteudo:

```bash
#!/usr/bin/env bash
set -uo pipefail

# ============================================================
# Auto-commit hook para Claude Code (evento Stop)
# Roda automaticamente quando o Claude Code termina de responder.
# ============================================================

# Ler JSON do stdin (enviado pelo Claude Code)
INPUT=$(cat)

# Tentar extrair o campo "cwd" do JSON de entrada
# Usa node.js que esta disponivel em projetos Next.js
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
    # Fallback: extrair com grep
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
    # Nenhuma alteracao, sair silenciosamente
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
    # Verificar padroes no nome do arquivo (case-insensitive)
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
# Validacao: rodar lint se existir
# ------------------------------------------------------------
if [ -f "package.json" ] && grep -q '"lint"' package.json 2>/dev/null; then
    echo "[hook] Rodando lint..."
    if ! npm run lint --silent 2>&1; then
        echo "============================================"
        echo "[hook] AUTO-COMMIT BLOQUEADO"
        echo "[hook] Lint falhou. Corrija os erros antes."
        echo "============================================"
        exit 1
    fi
    echo "[hook] Lint OK."
fi

# ------------------------------------------------------------
# Validacao: rodar testes se existirem
# ------------------------------------------------------------
if [ -f "package.json" ] && grep -q '"test"' package.json 2>/dev/null; then
    echo "[hook] Rodando testes..."
    if ! npm test --silent 2>&1; then
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

# Verificar se ha algo staged apos o git add
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
```

Depois de criar, tornar executavel:

```bash
chmod +x .claude/hooks/auto-commit-stop.sh
```

---

## Tarefa 4 - Criar .claude/settings.json

Criar o arquivo `.claude/settings.json` com o seguinte conteudo:

```json
{
  "hooks": {
    "Stop": [
      {
        "type": "command",
        "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/auto-commit-stop.sh\"",
        "timeout": 120
      }
    ]
  }
}
```

> **Nota:** Se `$CLAUDE_PROJECT_DIR` nao funcionar no seu ambiente, substitua pelo caminho absoluto do projeto ou por caminho relativo: `bash .claude/hooks/auto-commit-stop.sh`

---

## Tarefa 5 - Atualizar .gitignore

Verificar se o `.gitignore` existente ja cobre os padroes abaixo. Adicionar os que faltarem ao **final** do arquivo:

```gitignore
# === Seguranca: arquivos sensiveis ===
.env
.env.*
*.pem
*.key
*.log

# === Seguranca: padroes de nomes sensiveis ===
*secret*
*credential*
*token*.json

# === Build/cache ===
/.next/
/out/
/build/
/dist/
/node_modules/
/.cache/
.vercel
*.tsbuildinfo
```

**Importante:** Nao duplicar entradas que ja existem. Revisar o `.gitignore` atual antes de adicionar.

---

## Tarefa 6 - Criar documentacao do fluxo

Criar o diretorio e arquivo `docs/fluxo-claude-code-git.md`:

```bash
mkdir -p docs
```

Conteudo do arquivo:

```markdown
# Fluxo de Seguranca Git com Claude Code

## O que esse fluxo faz

Este projeto possui um sistema automatizado de versionamento para uso com Claude Code.
Quando o Claude Code termina de responder (evento `Stop`), um hook automaticamente:

1. Verifica se voce esta em uma branch de tarefa (nunca na `main`)
2. Verifica se nao ha arquivos sensiveis nas alteracoes
3. Roda lint (se disponivel)
4. Roda testes (se disponiveis)
5. Cria um commit automatico com todas as alteracoes
6. Faz push para o remote (se configurado)

O merge para `main` NUNCA e automatico. Voce sempre revisa e decide.

## Por que nao trabalhar direto na main

- A `main` e a branch estavel do projeto
- Se o Claude Code introduzir um bug, ele fica isolado na branch de tarefa
- Voce pode revisar, testar e ate descartar a branch inteira sem afetar o projeto
- Facilita code review e historico limpo

## Como usar

### 1. Criar uma branch antes de pedir tarefa ao Claude Code

```bash
git checkout main
git pull origin main
git checkout -b feat/nome-da-tarefa
```

### 2. Abrir o Claude Code e trabalhar normalmente

O hook `Stop` cuida do commit automaticamente.

### 3. Revisar os commits

```bash
# Ver historico da branch
git log --oneline

# Ver alteracoes de um commit especifico
git show <hash-do-commit>

# Ver diff completo entre sua branch e main
git diff main...HEAD
```

### 4. Comparar a branch com a main

```bash
# Ver quais arquivos mudaram
git diff main --stat

# Ver as diferencas completas
git diff main

# No GitHub, abra um Pull Request para visualizar melhor
```

### 5. Fazer merge manual

```bash
git checkout main
git pull origin main
git merge feat/nome-da-tarefa

# Ou via Pull Request no GitHub (recomendado)
```

### 6. Desfazer um commit (se necessario)

```bash
# Desfazer o ultimo commit mantendo as alteracoes
git reset --soft HEAD~1

# Desfazer o ultimo commit descartando as alteracoes (CUIDADO)
git reset --hard HEAD~1

# Reverter um commit especifico (cria um novo commit de reversao)
git revert <hash-do-commit>
```

### 7. Desativar hooks temporariamente

Opcao 1 - Renomear o arquivo de hook:

```bash
mv .claude/hooks/auto-commit-stop.sh .claude/hooks/auto-commit-stop.sh.disabled
```

Para reativar:

```bash
mv .claude/hooks/auto-commit-stop.sh.disabled .claude/hooks/auto-commit-stop.sh
```

Opcao 2 - Remover o hook do settings.json temporariamente:

Edite `.claude/settings.json` e remova ou comente a entrada do hook `Stop`.

### 8. Verificar hooks configurados

Dentro do Claude Code, use o comando:

```
/hooks
```

Isso mostra todos os hooks ativos na sessao atual.

### 9. Desabilitar auto-push (manter so o commit)

Defina a variavel de ambiente antes de abrir o Claude Code:

```bash
export CLAUDE_AUTO_PUSH=false
```

Ou adicione ao seu `.bashrc`/`.zshrc` para tornar permanente.

## Estrutura de arquivos do fluxo

```
.claude/
  settings.json          # Configuracao dos hooks do Claude Code
  hooks/
    auto-commit-stop.sh  # Script executado ao final de cada resposta

CLAUDE.md                # Regras de comportamento para o Claude Code
docs/
  fluxo-claude-code-git.md  # Este documento
.gitignore               # Protege arquivos sensiveis
```

## Compatibilidade com Windows

O script `auto-commit-stop.sh` e um script Bash. No Windows, ele roda via:

- **Git Bash** (instalado junto com Git for Windows) -- recomendado
- **WSL** (Windows Subsystem for Linux)

O Claude Code no Windows usa Git Bash por padrao, entao o hook deve funcionar automaticamente.

## Troubleshooting

### Hook nao esta rodando
- Verifique se o arquivo tem permissao de execucao: `chmod +x .claude/hooks/auto-commit-stop.sh`
- Verifique se `.claude/settings.json` esta correto com `/hooks` no Claude Code
- Verifique se o caminho no settings.json esta correto

### Commit nao foi criado
- Verifique se voce esta em uma branch de tarefa (nao na main)
- Verifique se ha alteracoes (`git status`)
- Verifique se nao ha arquivos sensiveis bloqueando

### Lint falha e bloqueia o commit
- Corrija os erros de lint
- Faca commit manual: `git add . && git commit -m "descricao"`

### Push falha
- Verifique se o remote esta configurado: `git remote -v`
- Verifique se voce tem permissao de push
- Faca push manual: `git push -u origin nome-da-branch`
```

---

## Tarefa 7 - Validacao final

Apos criar todos os arquivos, executar estas verificacoes:

```bash
# 1. Verificar se o JSON e valido
node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); console.log('settings.json OK')"

# 2. Verificar sintaxe do script bash
bash -n .claude/hooks/auto-commit-stop.sh && echo "Script OK"

# 3. Verificar se os arquivos existem
ls -la CLAUDE.md .claude/settings.json .claude/hooks/auto-commit-stop.sh docs/fluxo-claude-code-git.md .gitignore

# 4. Verificar permissao de execucao do hook
test -x .claude/hooks/auto-commit-stop.sh && echo "Executavel OK" || echo "Falta chmod +x"
```

---

## Tarefa 8 - Comandos manuais apos implementacao

Rodar estes comandos manualmente depois que tudo estiver criado:

```bash
# Se o projeto ainda nao for um repo Git:
git init
git add .
git commit -m "chore: setup inicial do projeto"

# Criar a branch main se nao existir:
git branch -M main

# Conectar ao remote (se tiver):
git remote add origin <URL-DO-REPOSITORIO>
git push -u origin main

# Criar primeira branch de tarefa:
git checkout -b feat/primeira-tarefa
```

---

## Resumo da estrutura final

```
projeto/
  .claude/
    settings.json              # Hook Stop configurado
    hooks/
      auto-commit-stop.sh     # Script de auto-commit (bash, executavel)
  docs/
    fluxo-claude-code-git.md  # Documentacao do fluxo em portugues
  CLAUDE.md                    # Regras de comportamento para o Claude Code
  .gitignore                   # Atualizado com padroes de seguranca
  plano-seguranca-commits.md   # Este arquivo (pode ser removido depois)
```

## Fluxo de uso diario

```
1. git checkout main && git pull
2. git checkout -b feat/nome-da-tarefa
3. Abrir Claude Code e pedir a tarefa
4. (Hook Stop cria commit automatico)
5. Revisar: git log, git diff main
6. Merge manual ou Pull Request
```
