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
7. Za pripravo HTML kartic za javno stran zaženi `./scripts/generate-offers.py`. Skripta prebere objavljene ponudbe, osveži `content/offers/_generated/offers-cards.html` in sinhronizira označen generated blok v `offers.html`.

## Pravilo poimenovanja

Uporabljaj samo male črke, številke in vezaje:

- dobro: `istrian-stone-villa.md`
- dobro: `dolomites-wellness-route.md`
- slabo: `Nova Ponudba Vila.docx`

## Filtriranje

Filtri naj uporabljajo vrednosti iz `content/offers/_taxonomy.md`, ker se ujemajo z obstoječimi `data-*` vrednostmi na `offers.html`.


## Generator ponudb

Za hitrejše dodajanje novih nastanitev je dodana skripta brez zunanjih odvisnosti:

```bash
./scripts/generate-offers.py
```

Skripta:

- prebere `content/offers/<country>/accommodation/**/*.md`,
- upošteva samo `status: published` in `content_kind: accommodation`,
- uporabi vrednosti iz front matterja za `data-country`, `data-region`, `data-type` in `data-options`,
- iz razdelka `## Short description` sestavi kratek opis,
- zapiše kartice v `content/offers/_generated/offers-cards.html`,
- posodobi kartice med `GENERATED_OFFERS_START` in `GENERATED_OFFERS_END` v `offers.html`,
- ohrani vrstni red po `sort_order`, nato po naslovu.

Pred objavo preveri, da so `country`, `region`, `type` in `options` skladni s `content/offers/_taxonomy.md`.
