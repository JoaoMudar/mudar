#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Sincroniza um ano de `financeiro.despesas` com a planilha DESPESAS AAAA.xls.

DRY-RUN POR PADRAO. So escreve com --apply.

Por que existe
--------------
`npm run db:conferir-despesas` mostrou que a planilha de 2026 andou depois do
import: meses inteiros lancados so no Excel, linhas novas no meio dos meses que
ja existem, e — o caso mais silencioso — linhas que entraram no banco **com o
valor vazio**, porque o Gilberto pre-digita os gastos fixos em vermelho no
comeco do mes e so preenche o valor quando a conta chega.

Por que NAO e um DELETE + INSERT
--------------------------------
761 das 1.046 linhas de 2026 ja tem `categoria_id`, e 859 tem `centro_custo`.
Isso e trabalho de curadoria feito no app, nao vem da planilha. Recriar o ano
do zero jogaria fora tudo. Entao a sincronizacao e por linha:

  - casada       -> UPDATE dos 9 campos da planilha; categoria/centro/natureza ficam
  - so no Excel  -> INSERT (sem categoria: cai na fila de /financeiro/pendencias)
  - so no banco  -> soft delete (`excluido_em`), nunca DELETE — e livro-caixa

O casamento e por MES, nao por nome de aba: no arquivo de 2026 as abas dos meses
que ainda nao tinham comecado se chamavam `Mai25..Dez25` na hora do import e
depois foram renomeadas para `Mai26..Dez26`. Casar por mes faz a linha
pre-digitada de maio reencontrar a dela e manter a categoria.

Uso
---
    python scripts/reimportar-despesas-ano.py --ano 2026            # simula
    python scripts/reimportar-despesas-ano.py --ano 2026 --apply    # grava
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import importlib.util
import os
import sys
from collections import defaultdict
from decimal import Decimal
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

# O leitor de planilha e a normalizacao moram no script de conferencia: uma
# fonte da verdade so para "como se le esse Excel". O nome tem hifen, dai o
# import por caminho.
_spec = importlib.util.spec_from_file_location(
    'conferir_despesas', Path(__file__).with_name('conferir-despesas-excel.py'))
cd = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cd)

MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
CAMPOS_PLANILHA = ['data', 'quantidade', 'unidade', 'descricao', 'local',
                   'valor_mc', 'mao_obra', 'equipamento', 'deslocamento']


def mes_da_aba(aba):
    """`Mai26`, `Mai25`, `Mai` -> 5."""
    prefixo = aba.strip()[:3].lower()
    return MESES.index(prefixo) + 1 if prefixo in MESES else None


def carrega_banco_ano(conn, ano):
    """{mes: {linha_excel: linha}} do que esta no banco para o ano."""
    sql = """
        SELECT id, mes, aba, linha_excel, data, quantidade, unidade, descricao,
               local, valor_mc, mao_obra, equipamento, deslocamento,
               eh_totalizador, categoria_id
          FROM financeiro.despesas
         WHERE ano = %s AND excluido_em IS NULL
    """
    por_mes = defaultdict(dict)
    with conn.cursor() as cur:
        cur.execute(sql, [ano])
        for r in cur.fetchall():
            por_mes[r[1]][r[3]] = {
                '_id': r[0], '_aba': r[2], '_linha': r[3],
                'data': r[4],
                'quantidade':   None if r[5] is None else Decimal(str(round(float(r[5]), 3))),
                'unidade':      cd.norm_texto(r[6]),
                'descricao':    cd.norm_texto(r[7]),
                'local':        cd.norm_texto(r[8]),
                'valor_mc':     None if r[9] is None else Decimal(str(round(float(r[9]), 2))),
                'mao_obra':     None if r[10] is None else Decimal(str(round(float(r[10]), 2))),
                'equipamento':  None if r[11] is None else Decimal(str(round(float(r[11]), 2))),
                'deslocamento': None if r[12] is None else Decimal(str(round(float(r[12]), 2))),
                '_totalizador': r[13], '_categoria': r[14],
            }
    return por_mes


def mapa_centro_custo(conn):
    """local -> (centro_custo, natureza), aprendido do proprio banco.

    Linha nova nao pode nascer sem centro de custo: o rateio negocio/pessoal e
    por centro. Em vez de inventar a regra, le a que ja esta aplicada nas
    dezenas de milhares de linhas antigas e usa a predominante de cada `local`.
    """
    sql = """
        SELECT local, centro_custo, natureza, COUNT(*) AS n
          FROM financeiro.despesas
         WHERE local IS NOT NULL AND centro_custo IS NOT NULL
         GROUP BY 1, 2, 3
         ORDER BY local, n DESC
    """
    mapa = {}
    with conn.cursor() as cur:
        cur.execute(sql)
        for local, centro, natureza, _ in cur.fetchall():
            mapa.setdefault(local.lower(), (centro, natureza))
    return mapa


def planeja(excel_por_mes, banco_por_mes):
    """Devolve (updates, inserts, remocoes) sem tocar no banco."""
    updates, inserts, remocoes = [], [], []

    for mes in sorted(set(excel_por_mes) | set(banco_por_mes)):
        ex_mes = dict(excel_por_mes.get(mes, {}))
        bd_mes = dict(banco_por_mes.get(mes, {}))
        resto_ex, resto_bd = dict(ex_mes), dict(bd_mes)
        pares = []

        # 1a passada: mesma linha e mesma descricao.
        for ln in sorted(set(ex_mes) & set(bd_mes)):
            if cd._mesma_identidade(ex_mes[ln], bd_mes[ln]):
                pares.append((ln, ln))
                del resto_ex[ln], resto_bd[ln]

        # 2a passada: repesca por conteudo o que a insercao de linhas desalinhou.
        novos, resto_ex, resto_bd = cd.casa_por_conteudo(resto_ex, resto_bd)
        pares.extend(novos)

        for ln_ex, ln_bd in sorted(pares):
            ex, bd = ex_mes[ln_ex], bd_mes[ln_bd]
            if cd._diferencas(ex, bd) or bd['_aba'] != ex['_aba'] or bd['_linha'] != ln_ex:
                updates.append((bd, ex, ln_ex))

        for ln in sorted(resto_ex):
            inserts.append((mes, ln, resto_ex[ln]))
        for ln in sorted(resto_bd):
            remocoes.append(resto_bd[ln])

    return updates, inserts, remocoes


def le_planilha_ano(arquivo, ano):
    """{mes: {linha_excel: linha}}, com `_aba` carimbado em cada linha."""
    por_mes = defaultdict(dict)
    for aba, linhas in cd.ler_planilha(arquivo).items():
        mes = mes_da_aba(aba)
        if mes is None:
            continue
        for ln, linha in linhas.items():
            linha = dict(linha, _aba=aba, _mes=mes, _ano=ano)
            por_mes[mes][ln] = linha
    return por_mes


def salva_backup(conn, ano, caminho):
    """Snapshot do ano inteiro antes de qualquer escrita."""
    with conn.cursor() as cur:
        cur.execute('SELECT * FROM financeiro.despesas WHERE ano = %s', [ano])
        colunas = [d[0] for d in cur.description]
        linhas = cur.fetchall()
    with open(caminho, 'w', newline='', encoding='utf-8-sig') as fh:
        w = csv.writer(fh, delimiter=';')
        w.writerow(colunas)
        w.writerows(linhas)
    return len(linhas)


def aplica(conn, updates, inserts, remocoes, mapa_centro, ano, autor):
    agora = dt.datetime.now(dt.timezone.utc)
    with conn.cursor() as cur:
        for bd, ex, ln_ex in updates:
            cur.execute("""
                UPDATE financeiro.despesas
                   SET data = %s, quantidade = %s, unidade = %s, descricao = %s,
                       local = %s, valor_mc = %s, mao_obra = %s, equipamento = %s,
                       deslocamento = %s, aba = %s, linha_excel = %s,
                       eh_totalizador = %s, atualizado_em = %s, atualizado_por = %s
                 WHERE id = %s
            """, [ex['data'], ex['quantidade'], ex['unidade'], ex['descricao'],
                  ex['local'], ex['valor_mc'], ex['mao_obra'], ex['equipamento'],
                  ex['deslocamento'], ex['_aba'], ln_ex,
                  cd.eh_totalizador_derivado(ex), agora, autor, bd['_id']])

        for mes, ln, ex in inserts:
            centro, natureza = mapa_centro.get((ex['local'] or '').lower(), (None, None))
            cur.execute("""
                INSERT INTO financeiro.despesas
                    (ano, mes, data, quantidade, unidade, descricao, local,
                     valor_mc, mao_obra, equipamento, deslocamento, fonte, aba,
                     linha_excel, eh_totalizador, centro_custo, natureza,
                     origem_lancamento, criado_por)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'excel',%s)
            """, [ano, mes, ex['data'], ex['quantidade'], ex['unidade'], ex['descricao'],
                  ex['local'], ex['valor_mc'], ex['mao_obra'], ex['equipamento'],
                  ex['deslocamento'], f'DESPESAS {ano}.xls', ex['_aba'], ln,
                  cd.eh_totalizador_derivado(ex), centro, natureza, autor])

        if remocoes:
            cur.execute("""
                UPDATE financeiro.despesas
                   SET excluido_em = %s, excluido_por = %s
                 WHERE id = ANY(%s)
            """, [agora, autor, [r['_id'] for r in remocoes]])


def soma(linha):
    """Valor da linha. Rodape (subtotal por centro / total geral) conta zero: e o
    mesmo dinheiro do detalhe somado de novo, e entraria triplicado no relatorio."""
    if linha['descricao'] is None:
        return Decimal(0)
    return sum((linha[c] for c in cd.CAMPOS_DINHEIRO if isinstance(linha[c], Decimal)),
               Decimal(0))


def relata(updates, inserts, remocoes):
    print(f'  UPDATE  {len(updates):>5} linhas ja no banco, atualizadas com o Excel')
    dinheiro = sum((soma(ex) - soma(bd) for bd, ex, _ in updates), Decimal(0))
    com_cat = sum(1 for bd, _, _ in updates if bd['_categoria'] is not None)
    print(f'          categoria preservada em {com_cat}; variacao de R$ {dinheiro:,.2f}')
    print(f'  INSERT  {len(inserts):>5} linhas novas, R$ {sum((soma(e) for _, _, e in inserts), Decimal(0)):,.2f}')
    com_valor = [r for r in remocoes if soma(r) > 0]
    print(f'  BAIXA   {len(remocoes):>5} linhas que sairam da planilha (soft delete), '
          f'R$ {sum((soma(r) for r in com_valor), Decimal(0)):,.2f} '
          f'em {len(com_valor)} linha(s) com valor')
    for r in sorted(com_valor, key=lambda x: -soma(x))[:15]:
        print(f'            {r["_aba"]:>6} L{r["_linha"]:>4} {(r["descricao"] or "")[:36]:<38}'
              f'R$ {soma(r):>10,.2f}')
    print('          (valores de rodape nao entram nas somas acima)')

    por_mes = defaultdict(lambda: [0, 0, 0])
    for _, ex, _ in updates:
        por_mes[ex['_mes']][0] += 1
    for mes, _, _ in inserts:
        por_mes[mes][1] += 1
    for r in remocoes:
        por_mes[mes_da_aba(r['_aba']) or 0][2] += 1
    print()
    print(f'  {"mes":<6}{"update":>8}{"insert":>8}{"baixa":>8}')
    for mes in sorted(por_mes):
        u, i, b = por_mes[mes]
        print(f'  {MESES[mes - 1]:<6}{u:>8}{i:>8}{b:>8}')


def main():
    p = argparse.ArgumentParser(description='Sincroniza um ano de despesas com a planilha.')
    p.add_argument('--ano', type=int, required=True)
    p.add_argument('--dir', type=Path, default=cd.DIR_PLANILHAS_PADRAO)
    p.add_argument('--apply', action='store_true', help='grava (sem isso, so simula)')
    p.add_argument('--allow-remote', action='store_true')
    args = p.parse_args()

    import psycopg2
    cd.carrega_env()
    url = os.environ.get('DATABASE_URL', '')
    if not url:
        sys.exit('DATABASE_URL nao definida.')
    if 'neon.tech' in url and not args.allow_remote:
        sys.exit('DATABASE_URL aponta para o Neon. Use --allow-remote se for proposital.')

    arquivo = args.dir / f'DESPESAS {args.ano}.xls'
    if not arquivo.exists():
        arquivo = arquivo.with_suffix('.xlsx')
    if not arquivo.exists():
        sys.exit(f'Planilha de {args.ano} nao encontrada em {args.dir}')

    conn = psycopg2.connect(url)
    try:
        excel = le_planilha_ano(arquivo, args.ano)
        banco = carrega_banco_ano(conn, args.ano)
        updates, inserts, remocoes = planeja(excel, banco)

        print()
        print(f'SINCRONIZAR {args.ano} COM {arquivo.name}')
        print('=' * 64)
        relata(updates, inserts, remocoes)
        print()

        if not args.apply:
            print('DRY-RUN — nada foi gravado. Repita com --apply para valer.')
            return 0

        backup = Path(os.environ.get('TEMP', '.')) / f'backup-despesas-{args.ano}.csv'
        n = salva_backup(conn, args.ano, backup)
        print(f'Backup de {n} linhas em {backup}')

        aplica(conn, updates, inserts, remocoes, mapa_centro_custo(conn),
               args.ano, 'reimport-excel')
        conn.commit()
        print('Gravado.')
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return 0


if __name__ == '__main__':
    sys.exit(main())
