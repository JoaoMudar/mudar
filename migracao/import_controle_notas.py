import pandas as pd
import os
from db import inserir_dataframe
import re

PASTA = "dados/controle_notas"

# =========================
# LEITURA
# =========================
def ler_abas(caminho):
    if caminho.endswith(".xls"):
        return pd.read_excel(caminho, sheet_name=None, dtype=str, engine="xlrd")
    else:
        return pd.read_excel(caminho, sheet_name=None, dtype=str)

# =========================
# FILTRO DE ABAS
# =========================
ABAS_VALIDAS = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
]

def aba_valida(nome):
    nome = nome.strip()
    return any(nome.startswith(mes) for mes in ABAS_VALIDAS)

MESES_MAP = {
    "jan": 1, "fev": 2, "mar": 3, "abr": 4,
    "mai": 5, "jun": 6, "jul": 7, "ago": 8,
    "set": 9, "out": 10, "nov": 11, "dez": 12
}

def extrair_mes(nome_aba):
    nome = nome_aba.strip().lower()
    for k in MESES_MAP:
        if nome.startswith(k):
            return MESES_MAP[k]
    return None

# =========================
# AJUSTE DE CABEÇALHO
# =========================
def ajustar_cabecalho(df):
    if df.empty:
        return df

    max_linhas = min(5, len(df))

    for i in range(max_linhas):
        try:
            temp = df.copy()

            # evita erro de índice
            linha = temp.iloc[i]

            # garante que não é linha vazia
            if linha.isna().all():
                continue

            temp.columns = linha
            temp = temp[i+1:]

            # normaliza nomes para comparação
            cols = [str(c).strip().lower() for c in temp.columns]

            if any("data" in c for c in cols):
                return temp

        except Exception as e:
            print(f"Erro ao ajustar cabeçalho linha {i}: {e}")
            continue

    return df  # fallback seguro

# =========================
# LIMPEZA
# =========================
def limpar_df(df):
    df = df.dropna(how="all")

    df = df[
        ~df.astype(str)
        .apply(lambda x: x.str.contains("total", case=False, na=False))
        .any(axis=1)
    ]

    return df

# =========================
# NORMALIZAÇÃO FLEXÍVEL
# =========================
def encontrar_coluna(df, nomes):
    for col in df.columns:
        col_lower = str(col).lower()
        for nome in nomes:
            if nome in col_lower:
                return col
    return None

def normalizar_padrao(df, arquivo):
    print(f"Processando: {arquivo}")

    df = ajustar_cabecalho(df)

    # Normaliza nomes
    df.columns = [str(c).strip() for c in df.columns]

    # Mapeamento direto (se existir)
    rename_map = {
        "Data": "data",
        "DATA": "data",
        "Quant.": "quantidade",
        "Quant": "quantidade",
        "Tipo": "produto_descricao",
        "R$": "valor_bruto",
        "Nota": "numero_nota",
        "Nro. Nota": "numero_nota",
    }

    df = df.rename(columns=rename_map)

    # Verifica colunas mínimas
    obrigatorias = ["data", "valor_bruto"]
    for col in obrigatorias:
        if col not in df.columns:
            raise Exception(f"Coluna obrigatória ausente: {col}")

    df = limpar_df(df)

    # =========================
    # DATA
    # =========================
    df["data"] = pd.to_datetime(df["data"], errors="coerce")
    df["valor_bruto"] = pd.to_numeric(df["valor_bruto"], errors="coerce").fillna(0)

    ano_arquivo = int(re.search(r"\d{4}", arquivo).group())
    
    df["data"] = df["data"].apply(
        lambda d: d.replace(year=ano_arquivo)
        if pd.notna(d)
        else d
    )

    # =========================
    # VALOR (CORRIGIDO)
    # =========================
    def parse_valor(v):
        if pd.isna(v):
            return None

        v = str(v).strip()

        # remove lixo
        v = v.replace("R$", "").replace(" ", "")

        # padrão BR
        if "," in v:
            v = v.replace(".", "").replace(",", ".")

        try:
            return float(v)
        except:
            return None

    df["valor_bruto"] = df["valor_bruto"].apply(parse_valor)

    # =========================
    # QUANTIDADE
    # =========================
    if "quantidade" in df.columns:
        df["quantidade"] = pd.to_numeric(df["quantidade"], errors="coerce")
    else:
        df["quantidade"] = None

    # =========================
    # FILTRO CRÍTICO (ANTI-LIXO)
    # =========================
    # df = df[
    #     (df["valor_bruto"].notna()) &
    #     (df["valor_bruto"] > 0) &
    #     (df["valor_bruto"] < 1_000_000_000)  # evita absurdos
    # ]

    # remove linhas sem data (opcional, mas recomendado)
    df = df[df["data"].notna()]

    # =========================
    # METADADOS
    # =========================
    df["fonte"] = arquivo
    df["linha_excel"] = df.index + 2

    # garante colunas finais
    for col in ["numero_nota", "produto_descricao"]:
        if col not in df.columns:
            df[col] = None

    return df[[
        "data",
        "numero_nota",
        "produto_descricao",
        "valor_bruto",
        "quantidade",
        "fonte",
        "linha_excel"
    ]]

# =========================
# EXCEÇÃO 2005
# =========================
def tratar_2005(df, arquivo, nome_aba):
    df = df.dropna(how="all")
    registros = []

    # pegar ano e mês
    ano = int("".join(filter(str.isdigit, arquivo)))
    mes_map = {
        "Jan": 1, "Fev": 2, "Mar": 3, "Abr": 4, "Mai": 5, "Jun": 6,
        "Jul": 7, "Ago": 8, "Set": 9, "Out": 10, "Nov": 11, "Dez": 12
    }
    mes = mes_map.get(nome_aba[:3], 1)

    data_fixa = pd.to_datetime(f"{ano}-{mes:02d}-01")

    for idx, row in df.iterrows():
        try:
            # pega pelos índices fixos
            qtd_nat = pd.to_numeric(row.iloc[0], errors="coerce")
            val_nat = pd.to_numeric(str(row.iloc[1]).replace(",", "."), errors="coerce")

            qtd_euc = pd.to_numeric(row.iloc[2], errors="coerce")
            val_euc = pd.to_numeric(str(row.iloc[3]).replace(",", "."), errors="coerce")

            qtd_pin = pd.to_numeric(row.iloc[4], errors="coerce")
            val_pin = pd.to_numeric(str(row.iloc[5]).replace(",", "."), errors="coerce")

            # soma total
            valor_total = sum(filter(pd.notna, [val_nat, val_euc, val_pin]))
            quantidade_total = sum(filter(pd.notna, [qtd_nat, qtd_euc, qtd_pin]))

            # ignora linhas vazias de verdade
            if pd.isna(valor_total) or valor_total == 0:
                continue

            registros.append({
                "data": data_fixa,
                "produto_descricao": "Nativas + Eucalyptus + Pinus",
                "quantidade": quantidade_total,
                "valor_bruto": valor_total,
                "numero_nota": None,
                "fonte": arquivo,
                "linha_excel": idx + 2
            })

        except Exception as e:
            print(f"Erro linha 2005 ({arquivo} - {nome_aba}): {e}")

    return pd.DataFrame(registros)
# =========================
# LOOP PRINCIPAL
# =========================
def main():
    todos = []

    print("Arquivos encontrados:")
    print(os.listdir(PASTA))

    for arquivo in os.listdir(PASTA):
        caminho = os.path.join(PASTA, arquivo)

        if not arquivo.endswith((".xls", ".xlsx")):
            continue

        print(f"\nProcessando: {arquivo}")

        abas = ler_abas(caminho)

        for nome_aba, df in abas.items():

            if not aba_valida(nome_aba):
                print(f"  Aba IGNORADA: {nome_aba} | Linhas: {len(df)}")
                continue
            print(f"  Aba: {nome_aba} | Linhas: {len(df)}")

            df = ajustar_cabecalho(df)

            try:
                if "2005" in arquivo:
                    df_final = tratar_2005(df, arquivo , nome_aba)
                else:
                    df_final = normalizar_padrao(df, arquivo)

                if not df_final.empty:
                    todos.append(df_final)

            except Exception as e:
                print(f"Erro em {arquivo} - aba {nome_aba}: {e}")

    if not todos:
        raise Exception("Nenhum dado foi processado.")

    final = pd.concat(todos, ignore_index=True)

    print("\nInserindo no banco...")
    inserir_dataframe(final, "controle_notas")

    print("Finalizado.")

if __name__ == "__main__":
    main()