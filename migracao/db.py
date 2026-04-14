from sqlalchemy import create_engine, text
import pandas as pd

DB_URL = "postgresql://postgres:123@localhost/viveiro"

engine = create_engine(DB_URL)



def query(sql):
    with engine.connect() as conn:
        return pd.read_sql(text(sql), conn)


def execute(sql, params=None):
    with engine.connect() as conn:
        conn.execute(text(sql), params or {})
        conn.commit()



# excluir depois de passar os dados das planilhas
def inserir_dataframe(df, tabela):
    df.to_sql(tabela, engine, if_exists='append', index=False)

# =========================
# INSERTS
# =========================

def inserir_cliente(nome, cidade, tipo):
    execute("""
        INSERT INTO clientes (nome, cidade, tipo)
        VALUES (:nome, :cidade, :tipo)
    """, {"nome": nome, "cidade": cidade, "tipo": tipo})


def inserir_venda(cliente_id):
    execute("""
        INSERT INTO vendas (data, cliente_id, status)
        VALUES (CURRENT_DATE, :cliente_id, 'confirmado')
    """, {"cliente_id": cliente_id})


def inserir_item_venda(venda_id, especie_id, quantidade, preco):
    execute("""
        INSERT INTO itens_venda (venda_id, especie_id, quantidade, preco_unitario)
        VALUES (:venda_id, :especie_id, :quantidade, :preco)
    """, {
        "venda_id": venda_id,
        "especie_id": especie_id,
        "quantidade": quantidade,
        "preco": preco
    })


def inserir_entrega(venda_id, distancia, custo):
    execute("""
        INSERT INTO entregas (venda_id, data_agendada, distancia_km, custo_total)
        VALUES (:venda_id, CURRENT_DATE, :distancia, :custo)
    """, {
        "venda_id": venda_id,
        "distancia": distancia,
        "custo": custo
    })