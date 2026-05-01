from datetime import datetime
import os
from typing import Literal, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
    func,
    or_,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ferramentaria.db")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class Cliente(Base):
    __tablename__ = "clientes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    documento: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    telefone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    observacoes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Ferramenta(Base):
    __tablename__ = "ferramentas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    codigo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    descricao: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    quantidade_total: Mapped[int] = mapped_column(Integer, nullable=False)
    quantidade_disponivel: Mapped[int] = mapped_column(Integer, nullable=False)
    localizacao: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    observacoes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Emprestimo(Base):
    __tablename__ = "emprestimos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id"), nullable=False)
    ferramenta_id: Mapped[int] = mapped_column(ForeignKey("ferramentas.id"), nullable=False)
    quantidade_emprestada: Mapped[int] = mapped_column(Integer, nullable=False)
    quantidade_devolvida: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    data_hora: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    observacao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="aberto", nullable=False)

    cliente: Mapped[Cliente] = relationship()
    ferramenta: Mapped[Ferramenta] = relationship()


class Movimentacao(Base):
    __tablename__ = "movimentacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tipo_movimentacao: Mapped[str] = mapped_column(
        Enum("emprestimo", "devolucao", name="tipo_movimentacao"), nullable=False
    )
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id"), nullable=False)
    ferramenta_id: Mapped[int] = mapped_column(ForeignKey("ferramentas.id"), nullable=False)
    emprestimo_id: Mapped[Optional[int]] = mapped_column(ForeignKey("emprestimos.id"), nullable=True)
    quantidade: Mapped[int] = mapped_column(Integer, nullable=False)
    data_hora: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    observacao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class ClienteBase(BaseModel):
    nome: str = Field(..., min_length=2)
    documento: str = Field(..., min_length=3)
    telefone: Optional[str] = None
    email: Optional[EmailStr] = None
    observacoes: Optional[str] = None
    ativo: bool = True


class ClienteOut(ClienteBase):
    id: int

    class Config:
        from_attributes = True


class FerramentaBase(BaseModel):
    codigo: str
    descricao: str
    quantidade_total: int = Field(..., ge=0)
    quantidade_disponivel: int = Field(..., ge=0)
    localizacao: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: bool = True


class FerramentaOut(FerramentaBase):
    id: int

    class Config:
        from_attributes = True


class EmprestimoIn(BaseModel):
    cliente_id: int
    ferramenta_id: int
    quantidade: int = Field(..., gt=0)
    data_hora: datetime
    observacao: Optional[str] = None


class DevolucaoIn(BaseModel):
    emprestimo_id: int
    quantidade: int = Field(..., gt=0)
    data_hora: datetime
    observacao: Optional[str] = None


app = FastAPI(title="Ferramentaria API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/clientes", response_model=list[ClienteOut])
def listar_clientes(
    q: Optional[str] = Query(None),
    include_inativos: bool = Query(False),
    db: Session = Depends(get_db),
):
    query = db.query(Cliente)
    if not include_inativos:
        query = query.filter(Cliente.ativo.is_(True))
    if q:
        filtro = f"%{q}%"
        query = query.filter(or_(Cliente.nome.ilike(filtro), Cliente.documento.ilike(filtro)))
    return query.order_by(Cliente.nome.asc()).all()


@app.post("/clientes", response_model=ClienteOut)
def criar_cliente(payload: ClienteBase, db: Session = Depends(get_db)):
    existente = db.query(Cliente).filter(Cliente.documento == payload.documento).first()
    if existente:
        raise HTTPException(status_code=400, detail="Documento já cadastrado")
    cliente = Cliente(**payload.model_dump())
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente


@app.put("/clientes/{cliente_id}", response_model=ClienteOut)
def editar_cliente(cliente_id: int, payload: ClienteBase, db: Session = Depends(get_db)):
    cliente = db.get(Cliente, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    duplicado = (
        db.query(Cliente)
        .filter(Cliente.documento == payload.documento, Cliente.id != cliente_id)
        .first()
    )
    if duplicado:
        raise HTTPException(status_code=400, detail="Documento já em uso")
    for key, value in payload.model_dump().items():
        setattr(cliente, key, value)
    db.commit()
    db.refresh(cliente)
    return cliente


@app.patch("/clientes/{cliente_id}/status", response_model=ClienteOut)
def status_cliente(cliente_id: int, ativo: bool, db: Session = Depends(get_db)):
    cliente = db.get(Cliente, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    cliente.ativo = ativo
    db.commit()
    db.refresh(cliente)
    return cliente


@app.get("/ferramentas", response_model=list[FerramentaOut])
def listar_ferramentas(
    q: Optional[str] = Query(None),
    include_inativas: bool = Query(False),
    db: Session = Depends(get_db),
):
    query = db.query(Ferramenta)
    if not include_inativas:
        query = query.filter(Ferramenta.ativo.is_(True))
    if q:
        filtro = f"%{q}%"
        query = query.filter(or_(Ferramenta.codigo.ilike(filtro), Ferramenta.descricao.ilike(filtro)))
    return query.order_by(Ferramenta.codigo.asc()).all()


@app.post("/ferramentas", response_model=FerramentaOut)
def criar_ferramenta(payload: FerramentaBase, db: Session = Depends(get_db)):
    if payload.quantidade_disponivel > payload.quantidade_total:
        raise HTTPException(status_code=400, detail="Disponível não pode ser maior que total")
    existente = db.query(Ferramenta).filter(Ferramenta.codigo == payload.codigo).first()
    if existente:
        raise HTTPException(status_code=400, detail="Código já cadastrado")
    ferramenta = Ferramenta(**payload.model_dump())
    db.add(ferramenta)
    db.commit()
    db.refresh(ferramenta)
    return ferramenta


@app.put("/ferramentas/{ferramenta_id}", response_model=FerramentaOut)
def editar_ferramenta(ferramenta_id: int, payload: FerramentaBase, db: Session = Depends(get_db)):
    ferramenta = db.get(Ferramenta, ferramenta_id)
    if not ferramenta:
        raise HTTPException(status_code=404, detail="Ferramenta não encontrada")
    if payload.quantidade_disponivel > payload.quantidade_total:
        raise HTTPException(status_code=400, detail="Disponível não pode ser maior que total")
    duplicado = (
        db.query(Ferramenta)
        .filter(Ferramenta.codigo == payload.codigo, Ferramenta.id != ferramenta_id)
        .first()
    )
    if duplicado:
        raise HTTPException(status_code=400, detail="Código já em uso")
    for key, value in payload.model_dump().items():
        setattr(ferramenta, key, value)
    db.commit()
    db.refresh(ferramenta)
    return ferramenta


@app.post("/emprestimos")
def registrar_emprestimo(payload: EmprestimoIn, db: Session = Depends(get_db)):
    cliente = db.get(Cliente, payload.cliente_id)
    ferramenta = db.get(Ferramenta, payload.ferramenta_id)
    if not cliente or not cliente.ativo:
        raise HTTPException(status_code=400, detail="Cliente inválido/inativo")
    if not ferramenta or not ferramenta.ativo:
        raise HTTPException(status_code=400, detail="Ferramenta inválida/inativa")
    if payload.quantidade > ferramenta.quantidade_disponivel:
        raise HTTPException(status_code=400, detail="Quantidade maior que saldo disponível")

    ferramenta.quantidade_disponivel -= payload.quantidade
    emprestimo = Emprestimo(
        cliente_id=payload.cliente_id,
        ferramenta_id=payload.ferramenta_id,
        quantidade_emprestada=payload.quantidade,
        quantidade_devolvida=0,
        data_hora=payload.data_hora,
        observacao=payload.observacao,
        status="aberto",
    )
    db.add(emprestimo)
    db.flush()

    mov = Movimentacao(
        tipo_movimentacao="emprestimo",
        cliente_id=payload.cliente_id,
        ferramenta_id=payload.ferramenta_id,
        emprestimo_id=emprestimo.id,
        quantidade=payload.quantidade,
        data_hora=payload.data_hora,
        observacao=payload.observacao,
    )
    db.add(mov)
    db.commit()
    return {"message": "Empréstimo registrado com sucesso", "emprestimo_id": emprestimo.id}


@app.get("/emprestimos/abertos")
def emprestimos_abertos(db: Session = Depends(get_db)):
    rows = (
        db.query(Emprestimo, Cliente.nome, Ferramenta.codigo, Ferramenta.descricao)
        .join(Cliente, Cliente.id == Emprestimo.cliente_id)
        .join(Ferramenta, Ferramenta.id == Emprestimo.ferramenta_id)
        .filter(Emprestimo.status == "aberto")
        .order_by(Emprestimo.data_hora.desc())
        .all()
    )
    data = []
    for e, cliente_nome, codigo, descricao in rows:
        data.append(
            {
                "id": e.id,
                "cliente_id": e.cliente_id,
                "cliente_nome": cliente_nome,
                "ferramenta_id": e.ferramenta_id,
                "ferramenta_label": f"{codigo} - {descricao}",
                "quantidade_emprestada": e.quantidade_emprestada,
                "quantidade_devolvida": e.quantidade_devolvida,
                "quantidade_pendente": e.quantidade_emprestada - e.quantidade_devolvida,
                "data_hora": e.data_hora,
            }
        )
    return data


@app.post("/devolucoes")
def registrar_devolucao(payload: DevolucaoIn, db: Session = Depends(get_db)):
    emprestimo = db.get(Emprestimo, payload.emprestimo_id)
    if not emprestimo:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado")
    if emprestimo.status != "aberto":
        raise HTTPException(status_code=400, detail="Empréstimo já finalizado")

    pendente = emprestimo.quantidade_emprestada - emprestimo.quantidade_devolvida
    if payload.quantidade > pendente:
        raise HTTPException(status_code=400, detail="Devolução maior que quantidade pendente")

    ferramenta = db.get(Ferramenta, emprestimo.ferramenta_id)
    if not ferramenta:
        raise HTTPException(status_code=400, detail="Ferramenta não encontrada")

    ferramenta.quantidade_disponivel += payload.quantidade
    if ferramenta.quantidade_disponivel > ferramenta.quantidade_total:
        raise HTTPException(status_code=400, detail="Estoque inválido após devolução")

    emprestimo.quantidade_devolvida += payload.quantidade
    if emprestimo.quantidade_devolvida == emprestimo.quantidade_emprestada:
        emprestimo.status = "fechado"

    mov = Movimentacao(
        tipo_movimentacao="devolucao",
        cliente_id=emprestimo.cliente_id,
        ferramenta_id=emprestimo.ferramenta_id,
        emprestimo_id=emprestimo.id,
        quantidade=payload.quantidade,
        data_hora=payload.data_hora,
        observacao=payload.observacao,
    )
    db.add(mov)
    db.commit()
    return {"message": "Devolução registrada com sucesso"}


@app.get("/movimentacoes")
def listar_movimentacoes(
    tipo: Optional[Literal["emprestimo", "devolucao"]] = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(
            Movimentacao,
            Cliente.nome.label("cliente_nome"),
            Ferramenta.codigo.label("ferramenta_codigo"),
            Ferramenta.descricao.label("ferramenta_descricao"),
        )
        .join(Cliente, Cliente.id == Movimentacao.cliente_id)
        .join(Ferramenta, Ferramenta.id == Movimentacao.ferramenta_id)
    )
    if tipo:
        query = query.filter(Movimentacao.tipo_movimentacao == tipo)
    rows = query.order_by(Movimentacao.data_hora.desc()).all()
    return [
        {
            "id": mov.id,
            "tipo_movimentacao": mov.tipo_movimentacao,
            "cliente_nome": cliente_nome,
            "ferramenta": f"{f_codigo} - {f_desc}",
            "quantidade": mov.quantidade,
            "data_hora": mov.data_hora,
            "observacao": mov.observacao,
            "emprestimo_id": mov.emprestimo_id,
        }
        for mov, cliente_nome, f_codigo, f_desc in rows
    ]


@app.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    total_ferramentas = db.query(func.count(Ferramenta.id)).filter(Ferramenta.ativo.is_(True)).scalar() or 0
    total_clientes = db.query(func.count(Cliente.id)).filter(Cliente.ativo.is_(True)).scalar() or 0
    total_disponiveis = (
        db.query(func.coalesce(func.sum(Ferramenta.quantidade_disponivel), 0))
        .filter(Ferramenta.ativo.is_(True))
        .scalar()
        or 0
    )
    total_emprestadas = (
        db.query(func.coalesce(func.sum(Ferramenta.quantidade_total - Ferramenta.quantidade_disponivel), 0))
        .filter(Ferramenta.ativo.is_(True))
        .scalar()
        or 0
    )

    ultimas = (
        db.query(
            Movimentacao,
            Cliente.nome.label("cliente_nome"),
            Ferramenta.codigo.label("ferramenta_codigo"),
            Ferramenta.descricao.label("ferramenta_descricao"),
        )
        .join(Cliente, Cliente.id == Movimentacao.cliente_id)
        .join(Ferramenta, Ferramenta.id == Movimentacao.ferramenta_id)
        .order_by(Movimentacao.data_hora.desc())
        .limit(10)
        .all()
    )

    return {
        "total_ferramentas": total_ferramentas,
        "total_clientes": total_clientes,
        "total_emprestadas": total_emprestadas,
        "total_disponiveis": total_disponiveis,
        "ultimas_movimentacoes": [
            {
                "id": mov.id,
                "tipo_movimentacao": mov.tipo_movimentacao,
                "cliente_nome": cliente_nome,
                "ferramenta": f"{f_cod} - {f_desc}",
                "quantidade": mov.quantidade,
                "data_hora": mov.data_hora,
            }
            for mov, cliente_nome, f_cod, f_desc in ultimas
        ],
    }
