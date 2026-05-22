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

## Pre-commit hook (testes e lint obrigatorios)

Alem do hook do Claude Code (Stop), este projeto tem um Git pre-commit hook que roda em **todo commit** (manual ou automatico):

1. Bloqueia commits na branch main/master
2. Detecta arquivos sensiveis no staging
3. Roda `npm run lint`
4. Roda `npm test` (Vitest)

Se qualquer verificacao falhar, o commit e bloqueado.

### Instalacao do hook

O hook e instalado automaticamente ao rodar `npm install` (via script `prepare`).
Para instalar manualmente:

```bash
bash scripts/setup-hooks.sh
```

## Por que nao trabalhar direto na main

- A `main` e a branch estavel do projeto
- Se o Claude Code introduzir um bug, ele fica isolado na branch de tarefa
- Voce pode revisar, testar e ate descartar a branch inteira sem afetar o projeto
- Facilita code review e historico limpo

## Trabalho paralelo com multiplos terminais (worktrees)

Quando voce roda 2 ou mais terminais com Claude Code no mesmo projeto, cada um **deve** trabalhar em seu proprio worktree com sua propria branch. O Git so permite uma branch ativa por diretorio — se dois terminais compartilham o mesmo diretorio, eles pisam um no outro.

### Criar um worktree para cada terminal

```bash
# Terminal 1: trabalha no diretorio principal
git checkout -b feat/tarefa-a

# Terminal 2: cria um worktree separado com sua branch
git worktree add ../viveiro-tarefa-b feat/tarefa-b
cd ../viveiro-tarefa-b
npm install
```

Cada worktree:
- Tem seu proprio diretorio com arquivos independentes
- Tem sua propria branch ativa
- Compartilha o mesmo historico Git (commits, remotes, tags)
- Precisa de seu proprio `npm install` (cada um tem seu `node_modules`)
- Os hooks e configs do repo ja estao disponiveis

### Regras importantes

- **Duas worktrees nao podem estar na mesma branch** — o Git bloqueia isso automaticamente
- Sempre crie a branch junto com o worktree (`git worktree add <caminho> <branch>`)
- Depois do merge, limpe o worktree para nao acumular diretorios

### Limpar worktrees apos o merge

```bash
# Listar worktrees ativos
git worktree list

# Remover um worktree (volta ao diretorio principal primeiro)
git worktree remove ../viveiro-tarefa-b

# Se o diretorio ja foi deletado manualmente
git worktree prune
```

### Fluxo resumido para 2 terminais

```
Terminal 1 (diretorio principal):
  git checkout -b feat/tarefa-a
  # abre claude code, trabalha normalmente

Terminal 2 (worktree separado):
  git worktree add ../viveiro-tarefa-b feat/tarefa-b
  cd ../viveiro-tarefa-b && npm install
  # abre claude code, trabalha normalmente

Depois:
  # volta ao principal, faz merge de cada branch
  git checkout main
  git merge feat/tarefa-a
  git merge feat/tarefa-b
  git worktree remove ../viveiro-tarefa-b
```

## Como usar (terminal unico)

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

# Reverter um commit especifico (cria um novo commit de reversao)
git revert <hash-do-commit>
```

### 7. Desativar hooks temporariamente

**Pre-commit hook** (bypass para um commit):
```bash
git commit --no-verify -m "mensagem"
```

**Hook do Claude Code** — renomear o arquivo:
```bash
mv .claude/hooks/auto-commit-stop.sh .claude/hooks/auto-commit-stop.sh.disabled
```

Para reativar:
```bash
mv .claude/hooks/auto-commit-stop.sh.disabled .claude/hooks/auto-commit-stop.sh
```

### 8. Desabilitar auto-push (manter so o commit)

Defina a variavel de ambiente antes de abrir o Claude Code:

```bash
export CLAUDE_AUTO_PUSH=false
```

Ou adicione ao seu `.bashrc`/`.zshrc` para tornar permanente.

## Testes automatizados

### Rodar testes

```bash
# Rodar uma vez (usado pelo pre-commit hook)
npm test

# Rodar em modo watch (para desenvolvimento)
npm run test:watch
```

### Criar novos testes

Testes ficam em pastas `__tests__/` ao lado do codigo testado:

```
src/
  lib/
    auth.ts
    __tests__/
      auth.test.ts    <-- testes para auth.ts
  middleware.ts
  __tests__/
    middleware.test.ts <-- testes para middleware.ts
```

Para codigo que importa `next/headers`, `@/lib/db`, ou outras dependencias externas, use `vi.mock`:

```typescript
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/db', () => ({ default: { query: vi.fn() } }))
```

## Estrutura de arquivos do fluxo

```
.claude/
  settings.json              # Configuracao dos hooks do Claude Code
  hooks/
    auto-commit-stop.sh      # Script executado ao final de cada resposta

.git/hooks/
  pre-commit                 # Hook que bloqueia commits sem lint/testes

scripts/
  pre-commit.sh              # Copia rastreada do hook (versionada no Git)
  setup-hooks.sh             # Script que instala o hook em .git/hooks/

CLAUDE.md                    # Regras de comportamento para o Claude Code
docs/
  fluxo-claude-code-git.md   # Este documento
.gitignore                   # Protege arquivos sensiveis
vitest.config.ts             # Configuracao do Vitest
```

## Compatibilidade com Windows

Os scripts bash (`.sh`) rodam via Git Bash, que e instalado junto com Git for Windows.
O Claude Code no Windows usa Git Bash por padrao, entao os hooks funcionam automaticamente.

## Troubleshooting

### Hook nao esta rodando
- Verifique se o hook tem permissao de execucao: `chmod +x .git/hooks/pre-commit`
- Reinstale: `bash scripts/setup-hooks.sh`

### Testes falham e bloqueiam o commit
- Corrija os testes primeiro: `npm run test:watch`
- Bypass temporario (usar com cautela): `git commit --no-verify -m "mensagem"`

### Lint falha e bloqueia o commit
- Corrija os erros de lint: `npm run lint`

### Push falha
- Verifique se o remote esta configurado: `git remote -v`
- Faca push manual: `git push -u origin nome-da-branch`
