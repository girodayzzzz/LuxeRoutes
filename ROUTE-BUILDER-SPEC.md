# Route Builder MVP specification

## Goal and boundary
Help a visitor assemble an **informational route outline** for Slovenia, Istria/northern Croatia and nearby connections to Austria or northern Italy. The result is planning guidance, not a booking, package holiday, price or availability confirmation.

## User inputs
- Number of days (bounded numeric input)
- Season or intended month
- Arrival by car or plane
- Starting city or airport (prioritize Ljubljana, Zagreb, Trieste and Venice)
- Interests (nature, food and wine, culture, wellness, road trips)
- Travel pace (slow, balanced, active)
- Approximate budget band, clearly optional and not used to promise prices
- Traveling with children (yes/no and optional age bands; no names)
- Preferred accommodation type

## Route logic
1. Validate inputs in the browser and cap route length and number of stops.
2. Start from a maintained local data file of real regions, approximate connections and seasonal caveats.
3. Select a geographic cluster compatible with arrival point and season.
4. Allocate nights based on pace, keeping arrival/departure days light and avoiding implausible backtracking.
5. Present approximate sequence and travel notes, with a prompt to verify roads, timetables, borders and opening conditions using official sources.
6. Never synthesize a hotel, live price, availability or provider commitment.

## Affiliate safety
Only show existing, approved affiliate URLs from a maintained allowlist. Label every link as an external general search or verified destination deep-link. Use `target="_blank"`, `rel="sponsored nofollow noopener"`, `affiliate-link`, category/placement data attributes and the existing `luxeroutes:affiliate-click` event. State that bookings, payments and support are handled under the external provider’s terms.

## Lightweight MVP
Use accessible semantic HTML, the existing CSS system and a small vanilla JavaScript module. Keep route rules and content in version-controlled JSON. No heavy framework, artificial-intelligence claim, payment flow or user account is required.

## Privacy, accessibility and measurement
Process the initial outline entirely in the browser; do not retain inputs or request names, email addresses or precise child birthdates. Support keyboard navigation, visible focus, labelled controls, grouped checkboxes, useful validation messages and a logical reading order. Measure only anonymous events such as builder started/completed, day-band, pace and outbound affiliate category through the existing event approach—never transmit free-text, airport detail or other personal input.
