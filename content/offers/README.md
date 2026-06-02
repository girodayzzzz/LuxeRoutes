# Offers content structure

Mapa je postavljena tako, da je vsaka ponudba hitro najdljiva po državi in po namenu.

```text
content/offers/
├── _templates/
│   ├── accommodation-offer.md
│   └── trip-offer.md
├── _taxonomy.md
├── slovenia/
│   ├── accommodation/
│   │   ├── villas/
│   │   ├── chalets/
│   │   ├── boutique-hotels/
│   │   ├── apartments/
│   │   ├── cabins/
│   │   └── wellness-retreats/
│   └── trips/
│       ├── signature-routes/
│       ├── romantic-getaways/
│       ├── wine-tours/
│       ├── wellness-retreats/
│       ├── yacht-experiences/
│       └── fishing-escapes/
└── croatia|italy|austria|switzerland|france/
    └── enaka struktura kot Slovenia
```

## Kdaj uporabiti katero mapo?

- `accommodation/villas/` — samostojne vile, estate hiše, private villa stays.
- `accommodation/chalets/` — alpske hiše, ski chalets, mountain lodges.
- `accommodation/boutique-hotels/` — hoteli, suites, curated hotel concepts.
- `accommodation/apartments/` — city apartments, coastal apartments, serviced residences.
- `accommodation/cabins/` — cabins, forest retreats, glamping-style cabins.
- `accommodation/wellness-retreats/` — spa, sauna, thermal ali reset nastanitve.
- `trips/signature-routes/` — večdnevni route koncepti med regijami ali državami.
- `trips/romantic-getaways/` — honeymoon, anniversary, proposal, weekend escapes.
- `trips/wine-tours/` — vinske regije, cellar tastings, vineyard lunches.
- `trips/wellness-retreats/` — wellness itinerary, spa circuit, Alpine reset.
- `trips/yacht-experiences/` — yacht day, island route, coastal private experience.
- `trips/fishing-escapes/` — fishing-led trip ali nature escape.

## Kako dodati novo nastanitev

```bash
cp content/offers/_templates/accommodation-offer.md content/offers/slovenia/accommodation/villas/nova-vila.md
```

Nato izpolni polja v datoteki. Vrednosti `country`, `region`, `type` in `options` naj ostanejo enake taksonomiji, da jih lahko filtri pravilno berejo.

## Kako dodati nov trip

```bash
cp content/offers/_templates/trip-offer.md content/offers/croatia/trips/yacht-experiences/nov-yacht-route.md
```

Trip datoteke uporabljajo `trip_type`, `route_regions`, `duration` in `best_for`, ker niso nujno ena sama nastanitev.
