# LuxeRoutes content workspace

Ta mapa je namenjena urejanju ponudb brez iskanja po dolgih HTML datotekah. Vsebina je razdeljena najprej po državi, nato po tipu vsebine:

- `offers/<country>/accommodation/` za nastanitvene ponudbe.
- `offers/<country>/trips/` za route/trip ideje.
- `offers/_templates/` za prazne predloge, ki jih kopiraš pri dodajanju nove ponudbe.

## Priporočen workflow

1. Izberi državo, npr. `content/offers/slovenia/`.
2. Izberi, ali dodajaš nastanitev (`accommodation`) ali potovanje (`trips`).
3. Izberi podkategorijo, npr. `villas`, `boutique-hotels` ali `signature-routes`.
4. Kopiraj ustrezno predlogo iz `content/offers/_templates/`.
5. Datoteko poimenuj z malimi črkami in vezaji, npr. `lake-view-villa-bled.md`.
6. Izpolni front matter polja na vrhu datoteke.
7. Če mora biti ponudba vidna na javni strani, prenesi enake vrednosti v kartico na `offers.html` ali v prihodnji generator ponudb.

## Pravilo poimenovanja

Uporabljaj samo male črke, številke in vezaje:

- dobro: `istrian-stone-villa.md`
- dobro: `dolomites-wellness-route.md`
- slabo: `Nova Ponudba Vila.docx`

## Filtriranje

Filtri naj uporabljajo vrednosti iz `content/offers/_taxonomy.md`, ker se ujemajo z obstoječimi `data-*` vrednostmi na `offers.html`.
