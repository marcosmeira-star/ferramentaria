const API = window.__API_BASE__ || 'http://127.0.0.1:8000';
let cache = { clientes: [], ferramentas: [], emprestimosAbertos: [] };

const views = ['dashboard', 'clientes', 'ferramentas', 'emprestimos', 'devolucoes', 'historico'];
document.querySelectorAll('.sidebar button').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.background = isError ? '#b91c1c' : '#111827';
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2500);
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'Erro na requisição');
  return data;
}

function switchView(view) {
  views.forEach(v => document.getElementById(v).classList.toggle('hidden', v !== view));
  if (view === 'dashboard') renderDashboard();
  if (view === 'clientes') renderClientes();
  if (view === 'ferramentas') renderFerramentas();
  if (view === 'emprestimos') renderEmprestimos();
  if (view === 'devolucoes') renderDevolucoes();
  if (view === 'historico') renderHistorico();
}

async function carregarCaches() {
  [cache.clientes, cache.ferramentas, cache.emprestimosAbertos] = await Promise.all([
    api('/clientes'),
    api('/ferramentas'),
    api('/emprestimos/abertos').catch(() => []),
  ]);
}

function datalistOptions(items, toLabel) {
  return items.map(i => `<option value="${toLabel(i).replaceAll('"', '&quot;')}"></option>`).join('');
}

function findByLabel(items, input, toLabel) {
  return items.find(i => toLabel(i) === input.trim());
}

async function renderDashboard() {
  const el = document.getElementById('dashboard');
  const data = await api('/dashboard');
  el.innerHTML = `
    <h2>Dashboard</h2>
    <div class="grid cols-4">
      <div class="card"><strong>${data.total_ferramentas}</strong><div class="muted">Ferramentas ativas</div></div>
      <div class="card"><strong>${data.total_clientes}</strong><div class="muted">Clientes ativos</div></div>
      <div class="card"><strong>${data.total_emprestadas}</strong><div class="muted">Unidades emprestadas</div></div>
      <div class="card"><strong>${data.total_disponiveis}</strong><div class="muted">Unidades disponíveis</div></div>
    </div>
    <div class="card">
      <h3>Últimas movimentações</h3>
      <table><thead><tr><th>Tipo</th><th>Cliente</th><th>Ferramenta</th><th>Qtd</th><th>Data</th></tr></thead>
      <tbody>
        ${data.ultimas_movimentacoes.map(m => `<tr><td>${m.tipo_movimentacao}</td><td>${m.cliente_nome}</td><td>${m.ferramenta}</td><td>${m.quantidade}</td><td>${new Date(m.data_hora).toLocaleString('pt-BR')}</td></tr>`).join('') || '<tr><td colspan="5">Sem movimentações.</td></tr>'}
      </tbody></table>
    </div>`;
}

async function renderClientes() {
  await carregarCaches();
  const el = document.getElementById('clientes');
  el.innerHTML = `
    <h2>Clientes</h2>
    <div class="card">
      <form id="form-cliente" class="grid cols-2">
        <input name="id" type="hidden" />
        <input name="nome" placeholder="Nome" required />
        <input name="documento" placeholder="Documento" required />
        <input name="telefone" placeholder="Telefone" />
        <input name="email" type="email" placeholder="E-mail" />
        <select name="ativo"><option value="true">Ativo</option><option value="false">Inativo</option></select>
        <textarea name="observacoes" placeholder="Observações"></textarea>
        <button class="primary" type="submit">Salvar cliente</button>
      </form>
    </div>
    <div class="card">
      <input id="busca-cliente" placeholder="Buscar por nome ou documento" />
      <div id="tbl-clientes"></div>
    </div>`;

  document.getElementById('form-cliente').addEventListener('submit', salvarCliente);
  document.getElementById('busca-cliente').addEventListener('input', preencherTabelaClientes);
  preencherTabelaClientes();
}

function preencherTabelaClientes() {
  const q = document.getElementById('busca-cliente').value.toLowerCase();
  const rows = cache.clientes.filter(c => (`${c.nome} ${c.documento}`).toLowerCase().includes(q));
  document.getElementById('tbl-clientes').innerHTML = `<table><thead><tr><th>Nome</th><th>Documento</th><th>Contato</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows.map(c => `<tr>
    <td>${c.nome}</td><td>${c.documento}</td><td>${c.telefone || ''}<br>${c.email || ''}</td><td>${c.ativo ? 'Ativo' : 'Inativo'}</td>
    <td><button onclick='editarCliente(${JSON.stringify(c)})'>Editar</button> <button class='danger' onclick='toggleCliente(${c.id}, ${!c.ativo})'>${c.ativo ? 'Desativar' : 'Ativar'}</button></td>
  </tr>`).join('')}</tbody></table>`;
}

window.editarCliente = (cliente) => {
  const f = document.getElementById('form-cliente');
  Object.keys(cliente).forEach(k => { if (f[k]) f[k].value = cliente[k] ?? ''; });
};

window.toggleCliente = async (id, ativo) => {
  try {
    await api(`/clientes/${id}/status?ativo=${ativo}`, { method: 'PATCH' });
    toast('Status atualizado');
    renderClientes();
  } catch (e) { toast(e.message, true); }
};

async function salvarCliente(e) {
  e.preventDefault();
  const f = e.target;
  const payload = {
    nome: f.nome.value,
    documento: f.documento.value,
    telefone: f.telefone.value || null,
    email: f.email.value || null,
    observacoes: f.observacoes.value || null,
    ativo: f.ativo.value === 'true',
  };
  try {
    if (f.id.value) await api(`/clientes/${f.id.value}`, { method: 'PUT', body: JSON.stringify(payload) });
    else await api('/clientes', { method: 'POST', body: JSON.stringify(payload) });
    toast('Cliente salvo');
    renderClientes();
  } catch (err) { toast(err.message, true); }
}

async function renderFerramentas() {
  await carregarCaches();
  const el = document.getElementById('ferramentas');
  el.innerHTML = `
    <h2>Ferramentas</h2>
    <div class="card">
      <form id="form-ferramenta" class="grid cols-2">
        <input name="id" type="hidden" />
        <input name="codigo" placeholder="Código" required />
        <input name="descricao" placeholder="Descrição" required />
        <input name="quantidade_total" type="number" min="0" placeholder="Quantidade total" required />
        <input name="quantidade_disponivel" type="number" min="0" placeholder="Quantidade disponível" required />
        <input name="localizacao" placeholder="Localização" />
        <select name="ativo"><option value="true">Ativo</option><option value="false">Inativo</option></select>
        <textarea name="observacoes" placeholder="Observações"></textarea>
        <button class="primary" type="submit">Salvar ferramenta</button>
      </form>
    </div>
    <div class="card">
      <input id="busca-ferramenta" placeholder="Buscar por código ou descrição" />
      <div id="tbl-ferramentas"></div>
    </div>`;
  document.getElementById('form-ferramenta').addEventListener('submit', salvarFerramenta);
  document.getElementById('busca-ferramenta').addEventListener('input', preencherTabelaFerramentas);
  preencherTabelaFerramentas();
}

function preencherTabelaFerramentas() {
  const q = document.getElementById('busca-ferramenta').value.toLowerCase();
  const rows = cache.ferramentas.filter(f => (`${f.codigo} ${f.descricao}`).toLowerCase().includes(q));
  document.getElementById('tbl-ferramentas').innerHTML = `<table><thead><tr><th>Código</th><th>Descrição</th><th>Total</th><th>Disponível</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows.map(f => `<tr>
    <td>${f.codigo}</td><td>${f.descricao}</td><td>${f.quantidade_total}</td><td>${f.quantidade_disponivel}</td><td>${f.ativo ? 'Ativo' : 'Inativo'}</td>
    <td><button onclick='editarFerramenta(${JSON.stringify(f)})'>Editar</button></td>
  </tr>`).join('')}</tbody></table>`;
}

window.editarFerramenta = (ferramenta) => {
  const f = document.getElementById('form-ferramenta');
  Object.keys(ferramenta).forEach(k => { if (f[k]) f[k].value = ferramenta[k] ?? ''; });
};

async function salvarFerramenta(e) {
  e.preventDefault();
  const f = e.target;
  const payload = {
    codigo: f.codigo.value,
    descricao: f.descricao.value,
    quantidade_total: Number(f.quantidade_total.value),
    quantidade_disponivel: Number(f.quantidade_disponivel.value),
    localizacao: f.localizacao.value || null,
    observacoes: f.observacoes.value || null,
    ativo: f.ativo.value === 'true',
  };
  try {
    if (f.id.value) await api(`/ferramentas/${f.id.value}`, { method: 'PUT', body: JSON.stringify(payload) });
    else await api('/ferramentas', { method: 'POST', body: JSON.stringify(payload) });
    toast('Ferramenta salva');
    renderFerramentas();
  } catch (err) { toast(err.message, true); }
}

async function renderEmprestimos() {
  await carregarCaches();
  const el = document.getElementById('emprestimos');
  const toolLabel = (f) => `${f.codigo} - ${f.descricao} (disp: ${f.quantidade_disponivel})`;
  const clientLabel = (c) => `${c.nome} - ${c.documento}`;
  el.innerHTML = `
    <h2>Empréstimos</h2>
    <div class="card">
      <form id="form-emprestimo" class="grid cols-2">
        <div><input list="dl-ferramentas" id="emprestimo-ferramenta" placeholder="Ferramenta (código/descrição)" required /><datalist id="dl-ferramentas">${datalistOptions(cache.ferramentas, toolLabel)}</datalist><small id="saldo-info" class="muted">Selecione uma ferramenta</small></div>
        <div><input list="dl-clientes" id="emprestimo-cliente" placeholder="Cliente" required /><datalist id="dl-clientes">${datalistOptions(cache.clientes, clientLabel)}</datalist></div>
        <input id="emprestimo-quantidade" type="number" min="1" placeholder="Quantidade" required />
        <input id="emprestimo-data" type="datetime-local" required />
        <textarea id="emprestimo-observacao" placeholder="Observação"></textarea>
        <button class="primary" type="submit">Registrar empréstimo</button>
      </form>
    </div>
    <div class="card"><h3>Empréstimos em aberto</h3><div id="tbl-abertos"></div></div>`;

  document.getElementById('emprestimo-ferramenta').addEventListener('input', () => {
    const tool = findByLabel(cache.ferramentas, document.getElementById('emprestimo-ferramenta').value, toolLabel);
    document.getElementById('saldo-info').textContent = tool ? `Disponível: ${tool.quantidade_disponivel}` : 'Ferramenta não encontrada';
  });

  document.getElementById('form-emprestimo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ferramenta = findByLabel(cache.ferramentas, document.getElementById('emprestimo-ferramenta').value, toolLabel);
    const cliente = findByLabel(cache.clientes, document.getElementById('emprestimo-cliente').value, clientLabel);
    const quantidade = Number(document.getElementById('emprestimo-quantidade').value);
    if (!ferramenta || !cliente) return toast('Selecione cliente e ferramenta válidos', true);
    if (quantidade > ferramenta.quantidade_disponivel) return toast('Quantidade maior que saldo disponível', true);
    try {
      await api('/emprestimos', { method: 'POST', body: JSON.stringify({
        cliente_id: cliente.id,
        ferramenta_id: ferramenta.id,
        quantidade,
        data_hora: new Date(document.getElementById('emprestimo-data').value).toISOString(),
        observacao: document.getElementById('emprestimo-observacao').value || null,
      }) });
      toast('Empréstimo registrado');
      renderEmprestimos();
    } catch (err) { toast(err.message, true); }
  });

  const abertos = await api('/emprestimos/abertos');
  document.getElementById('tbl-abertos').innerHTML = `<table><thead><tr><th>ID</th><th>Cliente</th><th>Ferramenta</th><th>Pendente</th><th>Data</th></tr></thead><tbody>${abertos.map(e => `<tr><td>${e.id}</td><td>${e.cliente_nome}</td><td>${e.ferramenta_label}</td><td>${e.quantidade_pendente}</td><td>${new Date(e.data_hora).toLocaleString('pt-BR')}</td></tr>`).join('') || '<tr><td colspan="5">Sem empréstimos abertos</td></tr>'}</tbody></table>`;
}

async function renderDevolucoes() {
  await carregarCaches();
  const abertos = await api('/emprestimos/abertos');
  const emprestimoLabel = (e) => `#${e.id} | ${e.cliente_nome} | ${e.ferramenta_label} | pendente: ${e.quantidade_pendente}`;
  const el = document.getElementById('devolucoes');
  el.innerHTML = `
    <h2>Devoluções</h2>
    <div class="card">
      <form id="form-devolucao" class="grid cols-2">
        <div><input list="dl-emprestimos" id="devolucao-emprestimo" placeholder="Selecione empréstimo aberto" required /><datalist id="dl-emprestimos">${datalistOptions(abertos, emprestimoLabel)}</datalist></div>
        <input id="devolucao-quantidade" type="number" min="1" placeholder="Quantidade devolvida" required />
        <input id="devolucao-data" type="datetime-local" required />
        <textarea id="devolucao-observacao" placeholder="Observação"></textarea>
        <button class="primary" type="submit">Registrar devolução</button>
      </form>
      <small id="devolucao-pendente" class="muted">Selecione um empréstimo para ver quantidade pendente.</small>
    </div>`;

  document.getElementById('devolucao-emprestimo').addEventListener('input', () => {
    const emp = findByLabel(abertos, document.getElementById('devolucao-emprestimo').value, emprestimoLabel);
    document.getElementById('devolucao-pendente').textContent = emp ? `Quantidade pendente: ${emp.quantidade_pendente}` : 'Empréstimo não encontrado';
  });

  document.getElementById('form-devolucao').addEventListener('submit', async (e) => {
    e.preventDefault();
    const emp = findByLabel(abertos, document.getElementById('devolucao-emprestimo').value, emprestimoLabel);
    const quantidade = Number(document.getElementById('devolucao-quantidade').value);
    if (!emp) return toast('Selecione um empréstimo válido', true);
    if (quantidade > emp.quantidade_pendente) return toast('Quantidade maior que a pendente', true);
    try {
      await api('/devolucoes', { method: 'POST', body: JSON.stringify({
        emprestimo_id: emp.id,
        quantidade,
        data_hora: new Date(document.getElementById('devolucao-data').value).toISOString(),
        observacao: document.getElementById('devolucao-observacao').value || null,
      }) });
      toast('Devolução registrada');
      renderDevolucoes();
    } catch (err) { toast(err.message, true); }
  });
}

async function renderHistorico() {
  const el = document.getElementById('historico');
  const movs = await api('/movimentacoes');
  el.innerHTML = `
    <h2>Histórico de movimentações</h2>
    <div class="card">
      <table><thead><tr><th>ID</th><th>Tipo</th><th>Cliente</th><th>Ferramenta</th><th>Qtd</th><th>Data/Hora</th><th>Obs</th></tr></thead><tbody>
      ${movs.map(m => `<tr><td>${m.id}</td><td>${m.tipo_movimentacao}</td><td>${m.cliente_nome}</td><td>${m.ferramenta}</td><td>${m.quantidade}</td><td>${new Date(m.data_hora).toLocaleString('pt-BR')}</td><td>${m.observacao || ''}</td></tr>`).join('') || '<tr><td colspan="7">Sem movimentações.</td></tr>'}
      </tbody></table>
    </div>`;
}

switchView('dashboard');
