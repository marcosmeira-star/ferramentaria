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
