import os
import hashlib
import re
from lxml import etree
from sqlalchemy import create_engine, text
from datetime import datetime
import traceback

# =========================
# CONFIG
# =========================

PASTA = r"C:\Users\jppir\Documents\Viveiro\dashboard\dados\danfes\Danfes 2025"
DB_URL = "postgresql://postgres:123@localhost/viveiro"

engine = create_engine(DB_URL)

# =========================
# HELPERS
# =========================

def hash_file(path):
    with open(path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()


def extrair_numero_pdf(nome):
    match = re.search(r"\d+", nome)
    return match.group(0) if match else None


def get_float(node, tag, ns):
    el = node.find(tag, ns)
    return float(el.text) if el is not None and el.text else 0.0


def parse_xml(path):
    tree = etree.parse(path)
    root = tree.getroot()

    ns = {"nfe": "http://www.portalfiscal.inf.br/nfe"}

    inf = root.find(".//nfe:infNFe", ns)
    ide = inf.find("nfe:ide", ns)
    dest = inf.find("nfe:dest", ns)
    total = inf.find(".//nfe:ICMSTot", ns)

    # tipo da nota
    tpNF = ide.find("nfe:tpNF", ns).text
    tipo_nota = "saida_empresa" if tpNF == "1" else "entrada_fornecedor"

    numero = ide.find("nfe:nNF", ns).text
    serie = ide.find("nfe:serie", ns).text

    data_str = ide.find("nfe:dhEmi", ns).text[:10]
    data = datetime.strptime(data_str, "%Y-%m-%d").date()

    valor_total = get_float(total, "nfe:vNF", ns)
    valor_produtos = get_float(total, "nfe:vProd", ns)
    valor_frete = get_float(total, "nfe:vFrete", ns)
    valor_icms = get_float(total, "nfe:vICMS", ns)

    chave = inf.attrib.get("Id", "").replace("NFe", "")

    cliente_nome = None
    if dest is not None:
        nome_el = dest.find("nfe:xNome", ns)
        if nome_el is not None:
            cliente_nome = nome_el.text

    return {
        "numero": numero,
        "serie": serie,
        "data": data,
        "valor_total": valor_total,
        "valor_produtos": valor_produtos,
        "valor_frete": valor_frete,
        "valor_icms": valor_icms,
        "chave": chave,
        "cliente_nome": cliente_nome,
        "tipo_nota": tipo_nota
    }


def inserir_nota(dados, pdf_path, xml_path):
    if not dados.get("numero") or not dados.get("data") or not dados.get("tipo_nota"):
        print(f"Pulando nota inválida: {pdf_path}")
        return

    sql = """
    INSERT INTO notas_fiscais (
        numero, serie, data_emissao,
        tipo_nota, valor_produtos,
        valor_frete, valor_icms,
        valor_total,
        arquivo_pdf, arquivo_xml,
        hash_arquivo, hash_xml,
        chave_acesso
    )
    VALUES (
        :numero, :serie, :data,
        :tipo_nota, :valor_produtos,
        :valor_frete, :valor_icms,
        :valor_total,
        :pdf, :xml,
        :hash_pdf, :hash_xml,
        :chave
    )
    ON CONFLICT DO NOTHING
    """

    params = {
        "numero": dados["numero"],
        "serie": dados["serie"],
        "data": dados["data"],
        "valor_produtos": dados["valor_produtos"],
        "valor_frete": dados["valor_frete"],
        "valor_icms": dados["valor_icms"],
        "valor_total": dados["valor_total"],
        "tipo_nota": dados["tipo_nota"],
        "pdf": pdf_path,
        "xml": xml_path,
        "hash_pdf": hash_file(pdf_path),
        "hash_xml": hash_file(xml_path),
        "chave": dados["chave"]
    }

    with engine.begin() as conn:
        conn.execute(text(sql), params)


# =========================
# INDEXAR XMLs
# =========================

xmls_por_numero = {}

for file in os.listdir(PASTA):
    if file.lower().endswith(".xml"):
        path = os.path.join(PASTA, file)
        try:
            dados = parse_xml(path)
            xmls_por_numero[dados["numero"]] = path
        except Exception as e:
            print(f"Erro ao ler XML {file}: {e}")

# =========================
# PROCESSAR PDFs
# =========================

pdf_sem_xml = []

for file in os.listdir(PASTA):

    if not file.lower().endswith(".pdf"):
        continue

    pdf_path = os.path.join(PASTA, file)
    numero_pdf = extrair_numero_pdf(file)

    xml_path = xmls_por_numero.get(numero_pdf)

    try:
        if xml_path:
            dados = parse_xml(xml_path)
            inserir_nota(dados, pdf_path, xml_path)
        else:
            pdf_sem_xml.append(pdf_path)



    except Exception as e:
        print(f"\nERRO COMPLETO:")
        print(e)
        traceback.print_exc()

# =========================
# RELATÓRIO FINAL
# =========================

print("\n=== PDFs SEM XML ===")
for p in pdf_sem_xml:
    print(p)

with open("faltando_xml.txt", "w") as f:
    for p in pdf_sem_xml:
        f.write(p + "\n")

print(f"\nTotal sem XML: {len(pdf_sem_xml)}")