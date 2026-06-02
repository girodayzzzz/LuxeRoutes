#!/usr/bin/env python3
"""Generate LuxeRoutes offer-card HTML from markdown front matter.

The script intentionally uses only the Python standard library so the static site can
be maintained without a package manager. It reads published accommodation offers
from content/offers/**, writes a reusable HTML snippet, and can keep offers.html in
sync by replacing the marked generated-card block.
"""
from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT_ROOT = ROOT / "content" / "offers"
OUTPUT = CONTENT_ROOT / "_generated" / "offers-cards.html"
OFFERS_PAGE = ROOT / "offers.html"
START_MARKER = "<!-- GENERATED_OFFERS_START -->"
END_MARKER = "<!-- GENERATED_OFFERS_END -->"

LIST_KEYS = {"region", "options", "search_terms", "best_for", "route_regions"}

TYPE_LABELS = {
    "villa": "Private villa",
    "chalet": "Chalet",
    "boutique-hotel": "Boutique hotel",
    "apartment": "Apartment",
    "cabin": "Cabin retreat",
    "retreat": "Wellness retreat",
}


def parse_value(raw: str):
    value = raw.strip()
    if value.startswith('"') and value.endswith('"'):
        return value[1:-1]
    if value.startswith("'") and value.endswith("'"):
        return value[1:-1]
    if value in {"true", "false"}:
        return value == "true"
    if re.fullmatch(r"-?\d+", value):
        return int(value)
    return value


def read_front_matter(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"^---\n(.*?)\n---", text, re.S)
    if not match:
        return {}

    data: dict[str, object] = {}
    current_key: str | None = None
    for raw_line in match.group(1).splitlines():
        if not raw_line.strip():
            continue
        if raw_line.startswith("  - ") and current_key:
            data.setdefault(current_key, [])
            assert isinstance(data[current_key], list)
            data[current_key].append(parse_value(raw_line[4:]))
            continue
        if ":" not in raw_line:
            continue
        key, raw_value = raw_line.split(":", 1)
        key = key.strip()
        raw_value = raw_value.strip()
        current_key = key
        if key in LIST_KEYS and not raw_value:
            data[key] = []
        else:
            data[key] = parse_value(raw_value)
    return data


def read_body(path: Path) -> str:
    return path.read_text(encoding="utf-8").split("---", 2)[-1]


def read_section(body: str, heading: str) -> str:
    match = re.search(rf"## {re.escape(heading)}\n\n(.+?)(?:\n\n##|\Z)", body, re.S)
    return " ".join(match.group(1).strip().split()) if match else ""


def read_list_section(body: str, heading: str) -> list[str]:
    section = read_section(body, heading)
    if not section:
        return []
    return [item.strip() for item in re.split(r"\s*- ", section) if item.strip()]


def esc(value: object) -> str:
    return html.escape(str(value or ""), quote=True)


def as_tokens(value: object) -> str:
    if isinstance(value, list):
        return " ".join(str(item) for item in value)
    return str(value or "")


def search_tokens(offer: dict) -> str:
    parts = [
        offer.get("country"),
        offer.get("type"),
        offer.get("title"),
        offer.get("badge"),
        as_tokens(offer.get("region")),
        as_tokens(offer.get("options")),
        as_tokens(offer.get("search_terms")),
    ]
    return " ".join(str(part) for part in parts if part)


def render_highlights(highlights: list[str]) -> str:
    if not highlights:
        return ""
    return "<ul>" + "".join(f"<li>{esc(item)}</li>" for item in highlights[:3]) + "</ul>"


def render_card(offer: dict) -> str:
    title = esc(offer.get("title"))
    country = esc(offer.get("country"))
    region = esc(as_tokens(offer.get("region")))
    stay_type = esc(offer.get("type"))
    options = esc(as_tokens(offer.get("options")))
    search = esc(search_tokens(offer).lower())
    image = esc(offer.get("image"))
    image_alt = esc(offer.get("image_alt"))
    badge = esc(offer.get("badge"))
    guests = esc(offer.get("guests"))
    price_note = esc(offer.get("price_note"))
    cta_label = esc(offer.get("cta_label") or "Request stay")
    cta_url = esc(offer.get("cta_url") or "plan-trip.html")
    type_label = esc(TYPE_LABELS.get(str(offer.get("type")), str(offer.get("type") or "Curated stay")))
    highlights = render_highlights(offer.get("highlights") if isinstance(offer.get("highlights"), list) else [])
    short_description = esc(
        str(offer.get("short_description", "")).strip()
        or "Curated stay concept prepared for a private LuxeRoutes brief."
    )

    return f'''            <article class="stay-offer-card" data-offer-card data-country="{country}" data-region="{region}" data-type="{stay_type}" data-options="{options}" data-search="{search}">
              <div class="offer-image-wrap">
                <img src="{image}" alt="{image_alt}" loading="lazy" width="900" height="600" decoding="async" />
                <span class="offer-badge">{badge}</span>
              </div>
              <div class="stay-offer-body">
                <div class="offer-meta"><span>{type_label}</span><span>{guests}</span></div>
                <h3>{title}</h3>
                <p>{short_description}</p>
                {highlights}
                <div class="offer-footer"><span>{price_note}</span><a class="text-link" href="{cta_url}">{cta_label}</a></div>
              </div>
            </article>'''


def collect_offers() -> list[dict]:
    offers = []
    for path in sorted(CONTENT_ROOT.glob("*/accommodation/**/*.md")):
        data = read_front_matter(path)
        if data.get("status") != "published":
            continue
        if data.get("content_kind") != "accommodation":
            continue
        if not data.get("title") or not data.get("image"):
            continue

        body = read_body(path)
        data["short_description"] = read_section(body, "Short description")
        data["highlights"] = read_list_section(body, "Highlights")
        offers.append(data)

    return sorted(offers, key=lambda offer: (int(offer.get("sort_order") or 9999), str(offer.get("title") or "")))


def write_generated_snippet(cards_html: str, offer_count: int) -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        "<!-- Generated by scripts/generate-offers.py. Do not edit this file manually. -->\n"
        + cards_html
        + "\n",
        encoding="utf-8",
    )
    print(f"Generated {offer_count} offer cards at {OUTPUT.relative_to(ROOT)}")


def sync_offers_page(cards_html: str) -> None:
    page = OFFERS_PAGE.read_text(encoding="utf-8")
    if START_MARKER not in page or END_MARKER not in page:
        print(f"Skipped {OFFERS_PAGE.relative_to(ROOT)} sync: generated markers not found")
        return

    start_index = page.index(START_MARKER)
    end_index = page.index(END_MARKER, start_index) + len(END_MARKER)
    prefix = page[:start_index]
    suffix = page[end_index:].lstrip("\n")
    replacement = f"{START_MARKER}\n{cards_html}\n            {END_MARKER}\n\n"
    OFFERS_PAGE.write_text(prefix + replacement + suffix, encoding="utf-8")
    print(f"Synced generated cards into {OFFERS_PAGE.relative_to(ROOT)}")


def main() -> None:
    offers = collect_offers()
    cards_html = "\n\n".join(render_card(offer) for offer in offers)
    write_generated_snippet(cards_html, len(offers))
    sync_offers_page(cards_html)


if __name__ == "__main__":
    main()
