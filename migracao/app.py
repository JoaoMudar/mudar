import streamlit as st
import db
from modelo import simular_lucro
import requests
import time

def buscar_cep(cep: str) -> dict | None:
    cep = ''.join(filter(str.isdigit, cep))  # remove hífen se houver
    if len(cep) != 8:
        return None
    try:
        r = requests.get(f"https://viacep.com.br/ws/{cep}/json/", timeout=5)
        data = r.json()
        return None if "erro" in data else data
    except Exception:
        return None

st.set_page_config(layout="wide")

st.title("Sistema de Gestão - Viveiro")

menu = st.sidebar.selectbox("Menu", [
    "Dashboard",
    "Cadastrar Cliente",
    "Registrar Venda",
    "Simulação"
])

# =========================
# DASHBOARD
# =========================
if menu == "Dashboard":

    st.header("Lucro por venda")

    df = db.query("SELECT * FROM vw_lucro_venda ORDER BY data DESC")

    st.dataframe(df)

# =========================
# CADASTRAR CLIENTE
# =========================

# --- UI ---
elif menu == "Cadastrar Cliente":
    st.header("Novo Cliente")

    nome     = st.text_input("Nome")
    documento = st.text_input("CPF / CNPJ")
    contato  = st.text_input("Contato (WhatsApp)")
    tipo     = st.selectbox("Tipo", ["atacado", "varejo", "governo", "ong"])

    st.subheader("Endereço")
    cep_input = st.text_input("CEP", placeholder="00000-000")

    # Estado inicial dos campos de endereço
    logradouro = cidade = estado = bairro = ibge = ""

    if cep_input:
        cep_limpo = ''.join(filter(str.isdigit, cep_input))
        if len(cep_limpo) == 8:
            with st.spinner("Buscando CEP..."):
                dados = buscar_cep(cep_limpo)
            if dados:
                logradouro = dados.get("logradouro", "")
                bairro     = dados.get("bairro", "")
                cidade     = dados.get("localidade", "")
                estado     = dados.get("uf", "")
                ibge       = dados.get("ibge", "")
                st.success(f"✅ {cidade} - {estado}")
            else:
                st.error("CEP não encontrado.")

    # Campos preenchidos automaticamente mas editáveis
    col1, col2 = st.columns([3, 1])
    with col1:
        logradouro = st.text_input("Logradouro", value=logradouro)
    with col2:
        numero = st.text_input("Número")

    col3, col4 = st.columns(2)
    with col3:
        bairro = st.text_input("Bairro", value=bairro)
    with col4:
        complemento = st.text_input("Complemento")

    col5, col6 = st.columns([3, 1])
    with col5:
        cidade = st.text_input("Cidade", value=cidade, disabled=bool(cidade))
    with col6:
        estado = st.text_input("Estado", value=estado, disabled=bool(estado))

    if st.button("Salvar Cliente"):
        if not nome:
            st.warning("Nome é obrigatório.")
        else:
            endereco_id = db.inserir_endereco(
                cep=cep_limpo, logradouro=logradouro, numero=numero,
                complemento=complemento, bairro=bairro,
                cidade=cidade, estado=estado, ibge_codigo=ibge
            )
            db.inserir_cliente(nome, documento, contato, tipo, endereco_id)
            st.success("Cliente cadastrado com sucesso!")

# =========================
# REGISTRAR VENDA
# =========================
elif menu == "Registrar Venda":

    st.header("Nova Venda")

    clientes = db.query("SELECT id, nome FROM clientes")
    cliente = st.selectbox("Cliente", clientes["nome"])

    cliente_id = clientes[clientes["nome"] == cliente]["id"].values[0]

    if st.button("Criar venda"):
        db.inserir_venda(cliente_id)
        st.success("Venda criada")

    vendas = db.query("SELECT id FROM vendas ORDER BY id DESC LIMIT 10")
    venda_id = st.selectbox("Venda", vendas["id"])

    especies = db.query("SELECT id, nome_comum FROM especies")
    especie = st.selectbox("Espécie", especies["nome_comum"])
    especie_id = especies[especies["nome_comum"] == especie]["id"].values[0]

    qtd = st.number_input("Quantidade", 1)
    preco = st.number_input("Preço unitário", 0.0)

    if st.button("Adicionar item"):
        db.inserir_item_venda(venda_id, especie_id, qtd, preco)
        st.success("Item adicionado")

    distancia = st.number_input("Distância (km)")
    custo = st.number_input("Custo entrega")

    if st.button("Registrar entrega"):
        db.inserir_entrega(venda_id, distancia, custo)
        st.success("Entrega registrada")

# =========================
# SIMULAÇÃO
# =========================
elif menu == "Simulação":

    st.header("Simulação de Pedido")

    preco = st.number_input("Preço por muda", 2.5)
    quantidade = st.number_input("Quantidade", 1000)
    custo_muda = st.number_input("Custo por muda", 1.5)

    distancia = st.number_input("Distância", 30)
    custo_km = st.number_input("Custo por km", 3.0)

    frete = st.number_input("Frete pago", 0.0)
    perda = st.slider("Perda (%)", 0.0, 0.5, 0.05)

    if st.button("Simular"):

        r = simular_lucro(
            preco,
            quantidade,
            custo_muda,
            distancia,
            custo_km,
            frete,
            perda
        )

        st.write(f"Receita: R$ {r['receita']:.2f}")
        st.write(f"Lucro: R$ {r['lucro']:.2f}")
        st.write(f"Margem: {r['margem']*100:.2f}%")

        if r["lucro"] > 0:
            st.success("VIÁVEL")
        else:
            st.error("PREJUÍZO")