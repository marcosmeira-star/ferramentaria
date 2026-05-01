CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    documento VARCHAR(50) NOT NULL UNIQUE,
    telefone VARCHAR(30),
    email VARCHAR(120),
    observacoes TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ferramentas (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    descricao VARCHAR(200) NOT NULL,
    quantidade_total INTEGER NOT NULL CHECK (quantidade_total >= 0),
    quantidade_disponivel INTEGER NOT NULL CHECK (quantidade_disponivel >= 0),
    localizacao VARCHAR(120),
    observacoes TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_ferramenta_qtd CHECK (quantidade_disponivel <= quantidade_total)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_movimentacao') THEN
        CREATE TYPE tipo_movimentacao AS ENUM ('emprestimo', 'devolucao');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS emprestimos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id),
    ferramenta_id INTEGER NOT NULL REFERENCES ferramentas(id),
    quantidade_emprestada INTEGER NOT NULL CHECK (quantidade_emprestada > 0),
    quantidade_devolvida INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_devolvida >= 0),
    data_hora TIMESTAMP NOT NULL,
    observacao TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'aberto',
    CONSTRAINT chk_emprestimo_qtd CHECK (quantidade_devolvida <= quantidade_emprestada)
);

CREATE TABLE IF NOT EXISTS movimentacoes (
    id SERIAL PRIMARY KEY,
    tipo_movimentacao tipo_movimentacao NOT NULL,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id),
    ferramenta_id INTEGER NOT NULL REFERENCES ferramentas(id),
    emprestimo_id INTEGER REFERENCES emprestimos(id),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    data_hora TIMESTAMP NOT NULL,
    observacao TEXT
);

CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_documento ON clientes(documento);
CREATE INDEX IF NOT EXISTS idx_ferramentas_codigo ON ferramentas(codigo);
CREATE INDEX IF NOT EXISTS idx_ferramentas_descricao ON ferramentas(descricao);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data_hora ON movimentacoes(data_hora DESC);
