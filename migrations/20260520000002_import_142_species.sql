-- Importação de 142 espécies de data/seeds/mudas_export_corrigido.json
-- Gerado em: 2026-05-20

BEGIN;

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Acácia-mimosa', 'Acacia podalyriifolia A.Cunn. ex G.Don', 'pioneira', 'Fins: Exótica, Sombreamento, Ornamental, Floração
Folha: Perenifólia
Altura: 5-7m
Regiões: Cultivada em todo o Brasil.
Floração: julho-agosto
Cor da flor: amarela', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Acácia-mimosa'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Acácia-negra', 'Acacia mearnsii De Wild.', 'madeira', 'Fins: Exótica, Ornamental, Industrial
Folha: Semidecídua
Altura: 8-15m
Regiões: Cultivada no RS, SC e PR.
Floração: setembro-novembro
Cor da flor: amarelo-claro', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Acácia-negra'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Açoita-cavalo', 'Luehea divaricata Mart.', 'restauracao', 'Fins: Nativa, Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Decídua
Altura: 15-25m
Regiões: Sul da BA, RJ, SP, MG, GO, MS até o RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Açoita-cavalo'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Agulheiro', 'Seguieria langsdorffii Moq.', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 8-16m
Regiões: Sul da BA, MG até SC.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Agulheiro'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Alecrim', 'Holocalyx balansae Micheli', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Sombreamento, Ornamental
Folha: Semidecídua
Altura: 15-25m
Regiões: SP até o RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Alecrim'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Amora-preta', 'Morus nigra L.', 'frutifera', 'Fins: Exótica, Frutífera, Frutífera (fauna), Ornamental
Folha: Decídua
Altura: 7-12m
Regiões: Cultivada no Sul e Sudeste do Brasil.
Frutificação: a partir de setembro', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Amora-preta'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Angico-branco', 'Anadenanthera colubrina (Vell.) Brenan', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Floração, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Decídua
Altura: 12-15m
Regiões: MA até o PR e GO. É cultivado em SC e RS.
Floração: novembro-janeiro
Cor da flor: branca', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Angico-branco'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Angico-vermelho', 'Parapiptadenia rigida (Benth.) Brenan', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Decídua
Altura: 20-30m
Regiões: MG, MS, SP até o RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Angico-vermelho'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Aperta-goela', 'Myrcia hebepetala DC.', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Restauração Mata Ciliar
Folha: Semidecídua
Altura: 4-6m
Regiões: MG, SP até o RS.
Frutificação: junho-outubro', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Aperta-goela'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Araçá-amarelo', 'Psidium cattleyanum Sabine', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 3-6m
Regiões: BA até o RS.
Frutificação: setembro-março', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Araçá-amarelo'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Araçá-da-serra', 'Calycorectes acutatus (Miq.) Toledo', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Ornamental, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 6-14m
Regiões: MG, SP e PR. É cultivado no RS e SC.
Frutificação: dezembro-janeiro', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Araçá-da-serra'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Araçá-piranga', 'Eugenia leitonii D.Legrand', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Ornamental, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 8-14m
Regiões: Sul da Ba até o PR. É cultivado no RS e SC.
Frutificação: fevereiro-março', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Araçá-piranga'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Araçá-vermelho', 'Eugenia multicostata D.Legrand', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 10-30m
Regiões: Sul de SP ao RS.
Frutificação: outubro-novembro', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Araçá-vermelho'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Araribá-amarelo', 'Centrolobium robustum (Vell.) Mart. ex Benth.', 'restauracao', 'Fins: Nativa, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 18-25m
Regiões: Sul da BA até SC.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Araribá-amarelo'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Aroeira-branca', 'Schinus lentiscifolius Marchand', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 5-8m
Regiões: Regiões de altitude do Rj até o RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Aroeira-branca'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Aroeira-piriquita', 'Schinus molle L.', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 4-8m
Regiões: MG até o RS, em campos de altitude.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Aroeira-piriquita'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Aroeira-vermelha', 'Schinus terebinthifolius Raddi', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 5-10m
Regiões: PE, MS até RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Aroeira-vermelha'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Baga-de-macaco', 'Posoqueria latifolia (Rudge) Roem. & Schult.', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 6-15m
Regiões: Sul da BA até SC.
Frutificação: junho-julho', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Baga-de-macaco'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Baguaçu', 'Magnolia ovata (A.St.-Hil.) Spreng.', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 20-30m
Regiões: Sul de MG até o norte do RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Baguaçu'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Bracatinga', 'Mimosa scabrella Benth.', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental, Industrial, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 5-15m
Regiões: SP até RS, em regiões de altitudes na floresta de pinhais', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Bracatinga'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Butiá', 'Butia eriospatha (Mart. ex Drude) Becc.', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Ornamental, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 4-6m
Regiões: PR, SC e RS.
Frutificação: janeiro-março', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Butiá'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Cabreúva', 'Myrocarpus frondosus Allemão', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental
Folha: Decídua
Altura: 20-30m
Regiões: Sul da BA ao RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Cabreúva'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Calistemone', 'Callistemon viminalis (Sol. ex Gaertn.) G.Don', 'ornamental', 'Fins: Exótica, Ornamental, Floração
Folha: Perenifólia
Altura: 5-7m
Regiões: Cultivado em todo o Brasil.
Floração: junho-setembro
Cor da flor: vermelha', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Calistemone'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Camboatá-vermelho', 'Cupania vernalis Cambess.', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 10-22m
Regiões: MG, MS, SP até o RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Camboatá-vermelho'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Canafístula', 'Peltophorum dubium (Spreng.) Taub.', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Sombreamento, Ornamental, Floração, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Decídua
Altura: 15-25m
Regiões: BA, MS, MG, GO, RJ até o PR. Cultivada em SC e RS.
Floração: dezembro-fevereiro
Cor da flor: amarela', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Canafístula'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Canela-de-tempero', 'Cinnamomum verum J.Presl', 'ornamental', 'Fins: Exótica, Ornamental
Folha: Perenifólia
Altura: 8-12m
Regiões: Cultivada em todo o Brasil, porém suscetível a geada.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Canela-de-tempero'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Canela-fogo', 'Cryptocarya aschersoniana Mez', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Sombreamento, Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 15-30m
Regiões: MG ao RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Canela-fogo'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Canela-garuva', 'Nectandra rigida (Kunth) Nees', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental, Restauração Mata Ciliar
Folha: Perenifólia
Altura: 15-20m
Regiões: Desde a região Amazônica até o RS, exceto Nordeste.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Canela-garuva'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Canela-guaicá', 'Ocotea puberula (Rich.) Nees', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 15-25m
Regiões: RJ, MG, MS até o RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Canela-guaicá'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Canela-imbuia', 'Nectandra megapotamica (Spreng.) Mez', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 15-25m
Regiões: SP ao RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Canela-imbuia'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Canela-preta', 'Ocotea catharinensis Mez', 'restauracao', 'Fins: Nativa, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 25-30m
Regiões: SP ao RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Canela-preta'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Canela-sassafrás', 'Ocotea odorifera (Vell.) Rohwer', 'restauracao', 'Fins: Nativa, Sombreamento, Ornamental
Folha: Perenifólia
Altura: 15-25m
Regiões: Sul da BA ao RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Canela-sassafrás'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Canjerana', 'Cabralea canjerana (Vell.) Mart.', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Sombreamento, Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Decídua
Altura: 20-30m
Regiões: MG, MS até o RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Canjerana'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Capororoca', 'Myrsine ferruginea Spreng.', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 6-12m
Regiões: Todo o Brasil.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Capororoca'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Capororocão', 'Myrsine umbellata Mart.', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Ornamental, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 5-15m
Regiões: MG ao RS.
Frutificação: março-abril e outubro-novembro', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Capororocão'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Caroba', 'Jacaranda micrantha Cham.', 'restauracao', 'Fins: Nativa, Sombreamento, Ornamental, Floração, Restauração Mata Ciliar
Folha: Decídua
Altura: 10-25m
Regiões: MG ao RS.
Floração: outubro-dezembro
Cor da flor: lilás', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Caroba'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Carvalho-europeu', 'Quercus robur L.', 'ornamental', 'Fins: Exótica, Ornamental
Folha: Decídua
Altura: 20-30m
Regiões: Cultivada nas regiões de altitude do RS, SC e PR.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Carvalho-europeu'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Castanha-da-praia', 'Pachira glabra Pasq.', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Ornamental, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 4-6m
Regiões: PE ao RJ. É cultivada em SC.
Frutificação: janeiro-fevereiro', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Castanha-da-praia'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Cedro-rosa', 'Cedrela fissilis Vell.', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Sombreamento, Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Decídua
Altura: 20-35m
Regiões: MG ao RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Cedro-rosa'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Cereja-australiana', 'Eugenia reinwardtiana (Blume) DC.', 'frutifera', 'Fins: Exótica, Frutífera, Ornamental
Folha: Perenifólia
Altura: 2-5m
Regiões: Cultivada na região Sudeste, e SC.
Frutificação: a partir de setembro', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Cereja-australiana'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Cereja-do-rio-grande', 'Eugenia involucrata DC.', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Decídua
Altura: 5-8m (10-15m na mata)
Regiões: MG ao RS.
Frutificação: outubro-dezembro', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Cereja-do-rio-grande'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Chal-Chal', 'Allophylus edulis (A.St.-Hil., A.Juss. & Cambess.) Hieron. ex Niederl.', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 6-10m
Regiões: Região Amazônica até o Ceará, MS, MG, BA, RJ até o RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Chal-Chal'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Cinamomo', 'Melia azedarach L.', 'pioneira', 'Fins: Exótica, Sombreamento, Ornamental, Floração
Folha: Decídua
Altura: 15-20m
Regiões: Cultivado nas regiões sul e sudeste do Brasil.
Floração: setembro-novembro
Cor da flor: lilás-rósea', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Cinamomo'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Cipreste-português', 'Cupressus lusitanica Mill.', 'madeira', 'Fins: Exótica, Ornamental, Industrial
Folha: Perenifólia
Altura: 20-30m
Regiões: Cultivado em todo o Brasil.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Cipreste-português'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Cocão', 'Erythroxylum argentinum O.E.Schulz', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 5-7m
Regiões: SP ao RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Cocão'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Cortiça-crespa', 'Annona sylvatica A.St.-Hil.', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 6-8m
Regiões: PE ao RS, MG, GO e MS.
Frutificação: janeiro-abril', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Cortiça-crespa'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Cortiça-lisa', 'Annona cacans Warm.', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Decídua
Altura: 12-16m
Regiões: MG, RJ até o RS.
Frutificação: janeiro-março', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Cortiça-lisa'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Cotoneaster', 'Cotoneaster franchetii Bois', 'ornamental', 'Fins: Exótica, Ornamental, Floração
Folha: Decídua
Altura: 3-4m
Regiões: Cultivada nas regiões de altitude do sul e sudeste do Brasil.
Floração: setembro-outubro
Cor da flor: branco-rósea', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Cotoneaster'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Dedaleiro', 'Lafoensia pacari A.St.-Hil.', 'restauracao', 'Fins: Nativa, Ornamental, Restauração Áreas Degradadas
Folha: Decídua
Altura: 10-18m
Regiões: MG, SP, MS até SC.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Dedaleiro'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Embaúba', 'Cecropia glaziovii Snethl.', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 8-16m
Regiões: BA até o PR. É cultivada no RS e SC.
Frutificação: janeiro-fevereiro', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Embaúba'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Erva-mate', 'Ilex paraguariensis A.St.-Hil.', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental, Industrial, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 4-8m
Regiões: MS, SP até o RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Erva-mate'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Espatódea', 'Spathodea campanulata P.Beauv.', 'restauracao', 'Fins: Exótica, Ornamental, Floração, Restauração Mata Ciliar
Folha: Decídua
Altura: 15-20m
Regiões: Cultivada em todo o Brasil.
Floração: novembro-abril
Cor da flor: vermelho-alaranjada', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Espatódea'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Espinheira-santa', 'Monteverdia ilicifolia (Mart. ex Reissek) Biral', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental
Folha: Perenifólia
Altura: 4-5m
Regiões: RS, SC, PR, SP e MS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Espinheira-santa'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Eucalipto-limão', 'Corymbia citriodora (Hook.) K.D.Hill & L.A.S.Johnson', 'madeira', 'Fins: Exótica, Ornamental, Industrial
Folha: Perenifólia
Altura: 15-30m
Regiões: Cultivado no PR, SC e RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Eucalipto-limão'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Eucalipto-cidra', 'Eucalyptus dunnii Maiden', 'madeira', 'Fins: Exótica, Ornamental, Industrial
Folha: Perenifólia
Altura: 30-35m
Regiões: Cultivado no PR, SC e RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Eucalipto-cidra'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Eucalipto-rosa', 'Eucalyptus grandis W.Hill ex Maiden', 'madeira', 'Fins: Exótica, Industrial
Folha: Perenifólia
Altura: 20-40m
Regiões: Cultivado em todo o Brasil.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Eucalipto-rosa'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Falsa-canela', 'Cinnamomum burmannii (Nees & T.Nees) Blume', 'ornamental', 'Fins: Exótica, Ornamental
Folha: Perenifólia
Altura: 6-8m
Regiões: Cultivada em todo o Brasil.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Falsa-canela'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Falso-barbatimão', 'Senna leptophylla (Vogel) H.S.Irwin & Barneby', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental, Floração, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 8-10m
Regiões: PR e SC. É cultivado no RS.
Floração: novembro-janeiro
Cor da flor: amarela', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Falso-barbatimão'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Farinha-seca', 'Machaerium stipitatum (DC.) Vogel', 'restauracao', 'Fins: Nativa, Ornamental, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 10-20m
Regiões: RJ, SP, MG, MS até o RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Farinha-seca'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Figueira-folha-fina', 'Ficus enormis (Mart. ex Miq.) Miq.', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Sombreamento, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 6-14m
Regiões: Todo o Brasil.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Figueira-folha-fina'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Figueira-mata-pau', 'Ficus guaranitica Chodat', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Sombreamento, Ornamental, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 10-20m
Regiões: RJ, MG, MS, GO, SP e PR. É cultivada em SC.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Figueira-mata-pau'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Flamboyant', 'Delonix regia (Bojer ex Hook.) Raf.', 'pioneira', 'Fins: Exótica, Sombreamento, Ornamental, Floração
Folha: Decídua
Altura: 10-12m
Regiões: Cultivado em todo o Brasil.
Floração: outubro-janeiro
Cor da flor: vermelha', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Flamboyant'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Gerivá', 'Syagrus romanzoffiana (Cham.) Glassm.', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 10-20m
Regiões: ES, RJ, MG, GO , MS até o RS.
Frutificação: fevereiro-agosto', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Gerivá'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Goiaba', 'Psidium guajava L.', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 3-6m
Regiões: RJ ao RS.
Frutificação: dezembro-março', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Goiaba'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Goiaba-da-serra', 'Acca sellowiana (O.Berg) Burret', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 3-4m
Regiões: Norte do RS até o PR.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Goiaba-da-serra'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Grandiúva', 'Trema micrantha (L.) Blume', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 5-12m
Regiões: RJ, MG, GO, MS até o RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Grandiúva'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Grevílea', 'Grevillea robusta A.Cunn. ex R.Br.', 'madeira', 'Fins: Exótica, Sombreamento, Ornamental, Industrial, Floração
Folha: Semidecídua
Altura: 15-20m
Regiões: É cultivada em SP, PR, SC e RS.
Floração: agosto-dezembro
Cor da flor: amarelo-alaranjada', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Grevílea'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Grevílea-anã', 'Grevillea banksii R.Br.', 'frutifera', 'Fins: Exótica, Frutífera (fauna), Ornamental, Floração
Folha: Perenifólia
Altura: 3-6m
Regiões: Cultivada nas regiões Sul e Sudeste do Brasil.
Floração: maio-setembro
Cor da flor: róseo-avermelhada', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Grevílea-anã'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Grumixama', 'Eugenia brasiliensis Lam.', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Ornamental, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 10-15m
Regiões: Sul da BA até SC.
Frutificação: novembro-dezembro', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Grumixama'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Guabiju', 'Myrcianthes pungens (O.Berg) D.Legrand', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Ornamental, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 15-20m
Regiões: SP até o RS.
Frutificação: janeiro-fevereiro', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Guabiju'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Guabiroba', 'Campomanesia xanthocarpa O.Berg', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Decídua
Altura: 10-20m
Regiões: MG, SP, MS até o RS.
Frutificação: novembro-dezembro', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Guabiroba'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Guabiroba-crespa', 'Campomanesia reitziana D. Legrand', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Decídua
Altura: 10-20m
Regiões: MG, SP, MS até o RS.
Frutificação: outubro-novembro', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Guabiroba-crespa'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Guaçatunga', 'Casearia sylvestris Sw.', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 4-6m
Regiões: Todo o Brasil.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Guaçatunga'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Guamirim-folha-larga', 'Calyptranthes grandifolia O.Berg', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 5-14m
Regiões: RJ até o RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Guamirim-folha-larga'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Guapuruvu', 'Schizolobium parahyba (Vell.) Blake', 'restauracao', 'Fins: Nativa, Sombreamento, Ornamental, Floração, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Decídua
Altura: 20-30m
Regiões: BA até SC. É cultivada também no RS.
Floração: agosto-outubro
Cor da flor: amarela', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Guapuruvu'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Ingá-anão', 'Inga vera Willd.', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Sombreamento, Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 5-10m
Regiões: SP ao RS.
Frutificação: dezembro a março', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Ingá-anão'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Ingá-banana', 'Inga uruguensis Hook. & Arn.', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 5-10m
Regiões: SP até o RS.
Frutificação: dezembro-fevereiro', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Ingá-banana'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Ingá-de-metro', 'Inga edulis Mart.', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 6-25m
Regiões: Região amazônica, toda orla litorânea desde o RN até norte de SC.
Frutificação: a partir de maio', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Ingá-de-metro'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Ingá-feijão', 'Inga marginata Willd.', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 5-15m
Regiões: Todo o Brasil.
Frutificação: março-maio', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Ingá-feijão'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Ingá-macaco', 'Inga sessilis (Vell.) Mart.', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 12-20m
Regiões: MG até o RS.
Frutificação: julho-janeiro', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Ingá-macaco'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Ingá-quatro-quinas', 'Inga striata Benth.', 'frutifera', 'Fins: Nativa, Frutífera (fauna)
Folha: Semidecídua
Altura: 25-30m
Regiões: AM até AL. É cultivada em MG até SC.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Ingá-quatro-quinas'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Ipê-roxo', 'Handroanthus impetiginosus (Mart. ex DC.) Mattos', 'restauracao', 'Fins: Nativa, Sombreamento, Ornamental, Floração, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Decídua
Altura: 20-35m
Regiões: MA até o RS.
Floração: junho-agosto
Cor da flor: rosa', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Ipê-roxo'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Ipê-amarelo', 'Handroanthus chrysotrichus (Mart. ex DC.) Mattos', 'restauracao', 'Fins: Nativa, Sombreamento, Ornamental, Floração, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Decídua
Altura: 4-10m
Regiões: ES até SC. É cultivada no RS.
Floração: agosto-setembro
Cor da flor: amarela', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Ipê-amarelo'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Ipê-amarelo-da-serra', 'Handroanthus alba (Cham.) Mattos', 'restauracao', 'Fins: Nativa, Sombreamento, Ornamental, Floração, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Decídua
Altura: 20-30m
Regiões: RJ, MG até o RS.
Floração: julho-setembro
Cor da flor: amarela', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Ipê-amarelo-da-serra'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Ipê-amarelo-de-jardim', 'Tecoma stans (L.) Juss. ex Kunth.', 'ornamental', 'Fins: Exótica, Ornamental, Floração
Folha: Semidecídua
Altura: 5-7m
Regiões: Cultivado em todo o Brasil.
Floração: abril-setembro
Cor da flor: amarela', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Ipê-amarelo-de-jardim'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Ipê-branco', 'Handroanthus roseo-albus (Ridl.) Mattos', 'restauracao', 'Fins: Nativa, Ornamental, Floração, Restauração Áreas Degradadas
Folha: Decídua
Altura: 7-16m
Regiões: Norte de SP, MG, MS e GO. É cultivado no PR, SC e RS.
Floração: agosto-outubro
Cor da flor: róseo-branca', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Ipê-branco'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Ipê-rosa', 'Handroanthus heptaphyllus (Vell.) Mattos', 'restauracao', 'Fins: Nativa, Ornamental, Floração, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Decídua
Altura: 10-20m
Regiões: Sul da BA, ES, MG, RJ e SP. É cultivado no PR, SC e RS.
Floração: julho-setembro
Cor da flor: rosa', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Ipê-rosa'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Jabuticaba', 'Plinia trunciflora (O.Berg) Kausel', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 10-15m
Regiões: MG, MS, SP até o RS.
Frutificação: agosto-setembro e janeiro-fevereiro', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Jabuticaba'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Jacarandá mimoso', 'Jacaranda mimosifolia D. Don', 'madeira', 'Fins: Exótica, Ornamental, Industrial, Floração
Folha: Decídua
Altura: 12-15m
Regiões: Cultivado em todo o Brasil.
Floração: dezembro-março
Cor da flor: azul-violeta', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Jacarandá mimoso'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Jambolão', 'Syzygium cumini (L.) Skeels', 'frutifera', 'Fins: Exótica, Frutífera, Frutífera (fauna), Ornamental
Folha: Perenifólia
Altura: 15-20m
Regiões: Cultivado em todo o Brasil.
Frutificação: a partir de setembro', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Jambolão'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Leucena', 'Leucaena leucocephala (Lam.) R. de Wit', 'ornamental', 'Fins: Exótica, Ornamental
Folha: Semidecídua
Altura: 5-7m
Regiões: Pode ser cultivada em todo Brasil, contudo é sensível a geadas.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Leucena'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Ligustro', 'Ligustrum lucidum W. T. Aiton', 'pioneira', 'Fins: Exótica, Sombreamento, Ornamental
Folha: Perenifólia
Altura: 7-10m
Regiões: Cultivado no Sul e Sudeste do Brasil.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Ligustro'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Limoeiro-do-mato', 'Randia armata (Sw.) DC.', 'restauracao', 'Fins: Nativa, Restauração Áreas Degradadas
Regiões: PR, SC e RS.
Frutificação: junho', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Limoeiro-do-mato'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Louro-cravo', 'Pimenta pseudocaryophyllus (Gomes) L. R. Landrum', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 4-10m
Regiões: BA, MG, GO até SC. É cultivada também no RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Louro-cravo'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Louro-pardo', 'Cordia trichotoma (Vell.) Arráb. ex Steud.', 'restauracao', 'Fins: Nativa, Ornamental, Industrial, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Decídua
Altura: 20-30m
Regiões: CE até o RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Louro-pardo'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Magnólia-amarela', 'Magnolia champaca (L.) Baill. ex Pierre', 'ornamental', 'Fins: Exótica, Ornamental, Floração
Folha: Perenifólia
Altura: 7-10m
Regiões: Cultivada no PR, SC e RS.
Floração: outubro-novembro
Cor da flor: amarela', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Magnólia-amarela'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Mamica-de-porca', 'Zanthoxylum rhoifolium Lam.', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Sombreamento, Ornamental, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 6-12m
Regiões: Todo o Brasil.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Mamica-de-porca'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Manacá-da-serra', 'Pleroma mutabile (Vell.) Triana', 'restauracao', 'Fins: Nativa, Ornamental, Floração, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 7-12m
Regiões: RJ até SC.
Floração: novembro-fevereiro
Cor da flor: branco-rósea', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Manacá-da-serra'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Manduirana', 'Senna macranthera (Collad.) H.S.Irwin & Barneby', 'restauracao', 'Fins: Nativa, Ornamental, Floração, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 6-8m
Regiões: CE até SP e MG. É cultivada no PR, SC e RS.
Floração: dezembro-abril
Cor da flor: amarela', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Manduirana'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Maracujá-doce', 'Passiflora alata Curtis', 'frutifera', 'Fins: Nativa, Frutífera
Folha: Semidecídua
Altura: trepadeira
Regiões: BA até o RS.
Frutificação: dezembro-maio', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Maracujá-doce'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Maracujá-amarelo', 'Passiflora edulis Sims', 'frutifera', 'Fins: Nativa, Frutífera
Folha: Semidecídua
Altura: trepadeira
Regiões: Todo o Brasil.
Frutificação: dezembro-maio', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Maracujá-amarelo'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Maria-preta', 'Diospyros inconstans Jacq.', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Sombreamento, Ornamental, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 6-9m
Regiões: MG até o RS.
Frutificação: a partir de janeiro', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Maria-preta'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Monjoleiro', 'Senegalia polyphylla (DC.) Britton & Rose', 'restauracao', 'Fins: Nativa, Sombreamento, Ornamental, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 15-20m
Regiões: Região amazônica até o PR e SP. Cultivada em SC e no RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Monjoleiro'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Mogno', 'Swietenia macrophylla King', 'restauracao', 'Fins: Nativa, Ornamental, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 25-30m
Regiões: Toda região Amazônica. É cultivada na região centro-sul do país.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Mogno'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Mulungu-do-litoral', 'Erythrina speciosa Andrews', 'restauracao', 'Fins: Nativa, Ornamental, Floração, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Decídua
Altura: 3-5m
Regiões: ES, MG até SC.
Floração: junho-setembro
Cor da flor: vermelha', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Mulungu-do-litoral'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Murta', 'Myrtus communis L.', 'ornamental', 'Fins: Exótica, Ornamental, Floração
Folha: Perenifólia
Altura: 5-7m
Regiões: Cultivada em todo território brasileiro.
Floração: no decorre de todo ano
Cor da flor: branca', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Murta'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Olandi', 'Calophyllum brasiliense Cambess.', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 20-30m
Regiões: Região Amazônica até o norte de SC.
Frutificação: novembro-dezembro', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Olandi'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Paineira-rosa', 'Ceiba speciosa (A.St.-Hil.) Ravenna', 'restauracao', 'Fins: Nativa, Sombreamento, Ornamental, Floração, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Decídua
Altura: 15-30m
Regiões: RJ, MG, GO, SP, MS e norte do PR. É cultivada no RS e SC.
Floração: dezembro-abril
Cor da flor: rosa', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Paineira-rosa'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Buriti-palito', 'Trithrinax brasiliensis Mart.', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental
Folha: Perenifólia
Altura: 2-13m
Regiões: PR, SC e RS.
Frutificação: a partir de setembro', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Buriti-palito'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Palmeira-real', 'Archontophoenix alexandrae (F.Muell.) H.Wendl. & Drude', 'frutifera', 'Fins: Exótica, Frutífera, Ornamental, Industrial
Folha: Perenifólia
Altura: 18-22m
Regiões: É cultivada no Sudeste e Sul do Brasil.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Palmeira-real'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Palmiteiro', 'Euterpe edulis Mart.', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental, Industrial, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 10-20m
Regiões: Sul da BA, MS, MG até o RS.
Frutificação: abril-agosto', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Palmiteiro'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Pata-de-vaca', 'Bauhinia forficata Link', 'restauracao', 'Fins: Nativa, Sombreamento, Ornamental, Floração, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Decídua
Altura: 5-9m
Regiões: RJ, MG até o RS.
Floração: outubro-janeiro
Cor da flor: branca', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Pata-de-vaca'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Pau-brasil', 'Paubrasilia echinata (Lam.) Gagnon, H.C.Lima & G.P.Lewis', 'restauracao', 'Fins: Nativa, Ornamental, Floração, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 8-12m
Regiões: CE até o RJ. Pode ser cultivado como curiosidade em SP, PR, SC e RS.
Floração: setembro-outubro
Cor da flor: amarela', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Pau-brasil'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Pau-cigarra', 'Senna multijuga (Rich.) H.S.Irwin & Barneby', 'restauracao', 'Fins: Nativa, Sombreamento, Ornamental, Floração, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Decídua
Altura: 6-10m
Regiões: Todo o Brasil.
Floração: dezembro-abril
Cor da flor: amarela', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Pau-cigarra'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Pau-ferro', 'Libidibia ferrea var. leiostachya (Benth.) L.P.Queiroz', 'restauracao', 'Fins: Nativa, Sombreamento, Ornamental, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 20-30m
Regiões: PI até SP. É cultivada no PR, SC.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Pau-ferro'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Pau-formiga', 'Triplaris brasiliana Cham.', 'restauracao', 'Fins: Nativa, Ornamental, Floração, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 10-20m
Regiões: MT, MS, SP. É cultivada no PR, SC e RS.
Floração: agosto-outubro
Cor da flor: rosa', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Pau-formiga'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Pau-jacaré', 'Piptadenia gonoacantha (Mart.) J.F.Macbr.', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 10-20m
Regiões: RJ, MG, MS até SC.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Pau-jacaré'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Pau-óleo', 'Copaifera trapezifolia Hayne', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 10-25m
Regiões: BA, MG, PE, PR, RS, SC e SP.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Pau-óleo'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Peroba', 'Aspidosperma parvifolium A.DC.', 'restauracao', 'Fins: Nativa, Ornamental
Folha: Semidecídua
Altura: 10-15m
Regiões: Sul da BA até o RS, MG, GO e MS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Peroba'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Pinheiro-alemão', 'Cunninghamia lanceolata (Lamb.) Hook.', 'ornamental', 'Fins: Exótica, Ornamental
Folha: Perenifólia
Altura: 25-45m
Regiões: Cultivado no Sul do Brasil.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Pinheiro-alemão'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Pinheiro-brasileiro', 'Araucaria angustifolia (Bertol.) Kuntze', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Ornamental, Industrial, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 20-50m
Regiões: MG, RJ até o RS.
Frutificação: abril-maio', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Pinheiro-brasileiro'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Pinheiro-de-natal', 'Araucaria columnaris (G.Forst.) Hook.', 'ornamental', 'Fins: Exótica, Ornamental
Folha: Perenifólia
Altura: 40-60m
Regiões: Cultivado no PR, SC e RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Pinheiro-de-natal'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Pinus', 'Pinus taeda L.', 'madeira', 'Fins: Exótica, Sombreamento, Ornamental, Industrial
Folha: Perenifólia
Altura: 25-30m
Regiões: Cultivado principalmente no RS e SC.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Pinus'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Pitanga', 'Eugenia uniflora L.', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 6-12m
Regiões: MG até o RS.
Frutificação: outubro-janeiro', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Pitanga'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Plátano', 'Platanus × acerifolia (Aiton) Willd.', 'pioneira', 'Fins: Exótica, Sombreamento, Ornamental
Folha: Decídua
Altura: 20-30m
Regiões: Cultivado no Sul do Brasil.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Plátano'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Quaresmeira', 'Tibouchina granulosa (Desr.) Cogn.', 'restauracao', 'Fins: Nativa, Sombreamento, Ornamental, Floração, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 8-12m
Regiões: BA, RJ, SP e MG. É cultivada em SC.
Floração: junho-agosto e dezembro-março
Cor da flor: lilás', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Quaresmeira'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Romã', 'Punica granatum L.', 'frutifera', 'Fins: Exótica, Frutífera, Ornamental, Floração
Folha: Semidecídua
Altura: 3-4m
Regiões: Cultivado em todo o Brasil.
Floração: a partir de setembro
Cor da flor: vermelho-alaranjada', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Romã'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Salgueiro-chorão', 'Salix babylonica L.', 'ornamental', 'Fins: Exótica, Ornamental
Folha: Decídua
Altura: 10-20m
Regiões: Cultivado nas regiões de altitude do Sul do Brasil.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Salgueiro-chorão'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Sete-capotes', 'Campomanesia guazumifolia (Cambess.) O.Berg', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Ornamental, Restauração Áreas Degradadas
Folha: Decídua
Altura: 6-10m
Regiões: RJ, MG, SP, MS até o RS.
Frutificação: março-maio', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Sete-capotes'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Sibipiruna', 'Cenostigma pluviosum var. peltophoroides (Benth.) Gagnon & G.P.Lewis', 'restauracao', 'Fins: Nativa, Sombreamento, Ornamental, Floração, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 8-16m
Regiões: RJ, BA e MS. É cultivada em SP, PR, SC e RS.
Floração: agosto-novembro
Cor da flor: amarela', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Sibipiruna'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Sombreiro', 'Clitoria fairchildiana R.A.Howard', 'restauracao', 'Fins: Nativa, Sombreamento, Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Decídua
Altura: 6-12m
Regiões: AM, PA, MA e TO. É cultivado como ornamental nos estados do Sul e Sudeste do Brasil', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Sombreiro'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Tanheiro', 'Alchornea triplinervia (Spreng.) Müll.Arg.', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Sombreamento, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 15-30m
Regiões: BA ao RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Tanheiro'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Tarumã', 'Vitex megapotamica (Spreng.) Moldenke', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 5-20m
Regiões: MG, MS até o RS.
Frutificação: janeiro-março', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Tarumã'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Timbaúva', 'Enterolobium contortisiliquum (Vell.) Morong', 'restauracao', 'Fins: Nativa, Sombreamento, Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Decídua
Altura: 20-35m
Regiões: PA, MA, PI até MS e RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Timbaúva'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Timbó', 'Ateleia glazioviana Baill.', 'restauracao', 'Fins: Nativa, Sombreamento, Ornamental, Restauração Áreas Degradadas
Folha: Decídua
Altura: 8-18m
Regiões: PR ao RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Timbó'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Tipuana', 'Tipuana tipu (Benth.) Kuntze', 'pioneira', 'Fins: Exótica, Sombreamento, Ornamental, Floração
Folha: Decídua
Altura: 12-15m
Regiões: Cultivada nas regiões Sul e Sudeste do Brasil.
Floração: setembro-dezembro
Cor da flor: amarela', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Tipuana'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Tucaneira', 'Citharexylum myrianthum Cham.', 'frutifera', 'Fins: Nativa, Frutífera (fauna), Ornamental, Restauração Mata Ciliar, Restauração Áreas Degradadas
Folha: Decídua
Altura: 8-20m
Regiões: BA ao RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Tucaneira'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Tuia', 'Thuja occidentalis L.', 'ornamental', 'Fins: Exótica, Ornamental
Folha: Perenifólia
Altura: 15-20m
Regiões: Cultivada nas regiões Sul e Sudeste do Brasil.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Tuia'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Urucum', 'Bixa orellana L.', 'frutifera', 'Fins: Nativa, Frutífera, Ornamental, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 3-5m
Regiões: Região amazônica até a BA. É cultivada nos demais estados.
Frutificação: final do verão e no início do outono', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Urucum'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Uva-do-japão', 'Hovenia dulcis Thunb.', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Sombreamento, Ornamental, Industrial
Folha: Decídua
Altura: 10-15m
Regiões: Cultivada principalmente no Sul, e em todas regiões do Brasil como curiosidade.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Uva-do-japão'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Uvaia', 'Eugenia pyriformis Cambess.', 'frutifera', 'Fins: Nativa, Frutífera, Frutífera (fauna), Ornamental, Restauração Áreas Degradadas
Folha: Semidecídua
Altura: 6-13m
Regiões: SP ao RS.
Frutificação: setembro-janeiro', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Uvaia'));

INSERT INTO species (common_name, scientific_name, category, notes, active)
  SELECT 'Vassourão-preto', 'Vernonanthura discolor (Spreng.) H.Rob.', 'restauracao', 'Fins: Nativa, Restauração Áreas Degradadas
Folha: Perenifólia
Altura: 10-15m
Regiões: MG ao RS.', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM species WHERE LOWER(common_name) = LOWER('Vassourão-preto'));

COMMIT;
