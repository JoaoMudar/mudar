def simular_lucro(
    preco_unitario,
    quantidade,
    custo_muda,
    distancia_km,
    custo_km,
    frete_cliente=0,
    perda=0.05
):

    receita_bruta = preco_unitario * quantidade
    receita_real = receita_bruta * (1 - perda)

    custo_producao = custo_muda * quantidade
    custo_entrega = custo_km * distancia_km * 2

    lucro = receita_real + frete_cliente - custo_producao - custo_entrega

    margem = lucro / receita_real if receita_real > 0 else 0

    return {
        "receita": receita_real,
        "custo_producao": custo_producao,
        "custo_entrega": custo_entrega,
        "lucro": lucro,
        "margem": margem
    }