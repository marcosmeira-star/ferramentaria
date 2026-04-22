# Sistema Web de Ferramentaria

Sistema completo para controle de empréstimo e devolução de ferramentas, com **frontend web**, **backend API** e **banco SQL (PostgreSQL)**, pronto para subir com Docker Compose.

## Stack escolhida

- **Frontend:** HTML/CSS/JavaScript (SPA simples em Nginx)
- **Backend:** Python + FastAPI + SQLAlchemy
- **Banco:** PostgreSQL 16
- **Orquestração:** Docker Compose

## Funcionalidades implementadas

- Dashboard com indicadores:
  - total de ferramentas ativas
  - total de clientes ativos
  - total de unidades emprestadas
  - total de unidades disponíveis
  - últimas movimentações
- Cadastro de clientes:
  - criar, editar, ativar/desativar, listar, pesquisar por nome/documento
- Cadastro de ferramentas:
  - criar, editar, listar, pesquisar por código/descrição
  - validação para não permitir disponível > total
- Empréstimos:
  - seleção digitável/pesquisável (cliente e ferramenta)
  - validação de saldo disponível
  - baixa automática no estoque disponível
  - grava histórico de movimentação
- Devoluções:
  - vinculadas a empréstimo em aberto
  - validação de quantidade pendente
  - atualização automática do estoque disponível
  - grava histórico
- Histórico completo de movimentações

## Estrutura de pastas

```bash
.
├── backend/
│   ├── app/main.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app.js
│   ├── index.html
│   ├── styles.css
│   └── Dockerfile
├── db/
│   └── init.sql
├── docker-compose.yml
└── README.md
```

## Como executar

### 1) Subir todo o sistema

```bash
docker compose up --build
```

### 2) Acessar aplicação

- Frontend: http://localhost:3000
- Backend (docs): http://localhost:8000/docs
- Health check: http://localhost:8000/health

## Banco de dados

O script `db/init.sql` cria as tabelas principais:

- `clientes`
- `ferramentas`
- `emprestimos`
- `movimentacoes`

Com:

- chaves primárias e estrangeiras
- índices de busca
- constraints para integridade de quantidades

## Regras de negócio cobertas

- Não permite empréstimo com quantidade maior que a disponível.
- Não permite devolução acima da quantidade pendente no empréstimo.
- Atualiza automaticamente saldo disponível nas operações.
- Mantém histórico de movimentações de empréstimo e devolução.
- Valida cliente/ferramenta ativos nas operações de empréstimo.

## Observações

- O backend também aplica `create_all` no startup para garantir criação de tabelas caso necessário.
- Em ambiente de produção, recomenda-se adicionar autenticação/autorização e controle mais robusto de concorrência transacional.
