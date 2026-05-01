# Ferramentaria Desktop para Windows

Este projeto foi adaptado para funcionar como **aplicativo desktop nativo para Windows** (janela própria, sem navegador), com geração de instalador e executável.

## Solução escolhida (profissional para Windows)

### Stack final
- **UI Desktop:** Electron (janela nativa, ícone, instalador NSIS, atalho na área de trabalho).
- **Frontend:** HTML/CSS/JS local (carregado no Electron).
- **Backend:** FastAPI empacotado em `backend.exe` (PyInstaller).
- **Banco local:** SQLite em arquivo no perfil do usuário Windows (sem necessidade de instalar PostgreSQL no cliente final).

### Motivos da escolha
- Entrega experiência de “programa comum” no Windows.
- Permite **duplo clique** em atalho e execução imediata.
- Permite empacotar backend e frontend no mesmo instalador.
- Reduz fricção para usuário leigo (sem terminal/manual).

---

## Comportamento do aplicativo

Ao abrir o app:
1. O Electron garante instância única (evita múltiplas janelas duplicadas).
2. O app inicia o `backend.exe` automaticamente em background.
3. O frontend abre em janela própria conectando na API local `127.0.0.1:8000`.
4. O banco SQLite é criado automaticamente no diretório de dados do usuário.

---

## Estrutura principal

```bash
.
├── backend/
│   ├── app/main.py
│   ├── launcher/run_backend.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   └── Dockerfile
├── desktop/
│   ├── main.js
│   ├── preload.js
│   ├── package.json
│   ├── assets/
│   │   ├── app.ico
│   │   └── README.md
│   └── scripts/
│       ├── build-backend.ps1
│       ├── build-desktop.ps1
│       └── build-all.ps1
├── db/init.sql
└── docker-compose.yml
```

---

## Pré-requisitos (máquina de build)

Para gerar o instalador `.exe` em Windows:
- Windows 10/11
- Python 3.11+ no `PATH`
- Node.js 20+ e npm
- PowerShell

> Para usuário final, após instalado, não é necessário abrir terminal.

---

## Ícone do aplicativo

Arquivo usado no build:
- `desktop/assets/app.ico`

Se quiser trocar:
1. Gere um `.ico` multi-resolução (16/32/48/64/128/256).
2. Substitua `desktop/assets/app.ico`.
3. Rode o build novamente.

---

## Como gerar o executável/instalador

### Opção recomendada (tudo automático)
No PowerShell, na raiz do projeto:

```powershell
.\desktop\scripts\build-all.ps1
```

Esse script:
1. cria venv de build do backend;
2. instala dependências Python;
3. gera `backend/dist/backend.exe` (PyInstaller);
4. instala dependências do Electron;
5. gera instalador Windows em `desktop/release/`.

### Opção manual (passo a passo)

#### 1) Gerar backend.exe
```powershell
.\desktop\scripts\build-backend.ps1
```

#### 2) Gerar instalador desktop
```powershell
.\desktop\scripts\build-desktop.ps1
```

---

## Como executar o aplicativo

Após build, execute o instalador em `desktop/release/` (arquivo `.exe` do instalador).

Depois da instalação:
- abra pelo atalho na área de trabalho;
- ou menu iniciar “Ferramentaria”.

O app sobe backend e banco automaticamente.

---

## Distribuição para outros computadores

Entregar para o cliente final:
- **somente o instalador** gerado em `desktop/release/`.

No computador destino:
1. executar instalador;
2. concluir instalação;
3. abrir via atalho.

Não é necessário instalar PostgreSQL, Docker ou rodar comandos.

---

## Execução por Docker (modo desenvolvimento legado)

A estrutura Docker original permanece no repositório para ambiente de desenvolvimento/servidor:

```bash
docker compose up --build
```

---

## Limitações e observações

- O build final deve ser feito em Windows para gerar instalador `.exe` adequadamente.
- O arquivo `desktop/assets/app.ico` atual é placeholder e deve ser substituído por ícone real.
- Para atualizações automáticas (auto-update), assinatura de código e telemetria, recomenda-se evolução futura com pipeline CI/CD e code signing.

---

## Solução para erro no Windows (psycopg2/pyinstaller)

Se aparecer erro de build do `psycopg2-binary` e/ou mensagem `pyinstaller não é reconhecido`:

1. Atualize o projeto para a versão mais recente deste ajuste.
2. Rode novamente:

```powershell
.\desktop\scripts\build-backend.ps1
```

### O que foi corrigido
- `psycopg2-binary` passou a ser instalado apenas fora do Windows (no Windows desktop usamos SQLite local).
- O script agora invoca PyInstaller por `python -m PyInstaller`, evitando problema de PATH do executável `pyinstaller`.
