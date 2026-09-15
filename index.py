import base64
import json
import os
import re
import html as html_lib
import urllib.parse
import urllib.request
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from openai import OpenAI

ROOT = Path(__file__).resolve().parent
app = Flask(__name__, static_folder=str(ROOT), static_url_path="")
client = OpenAI()  # liest OPENAI_API_KEY aus der Umgebung

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 12 * 1024 * 1024


def extract_json(text: str):
    text = text.strip()
    text = re.sub(r"^```(?:json)?\\s*", "", text)
    text = re.sub(r"\\s*```$", "", text)
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("Das Modell hat kein JSON zurückgegeben.")
    return json.loads(text[start:end + 1])


@app.get("/")
def index():
    return send_from_directory(ROOT, "index.html")


@app.post("/api/analyze-meal")
def analyze_meal():
    if "image" not in request.files:
        return jsonify(error="Kein Bild empfangen."), 400

    f = request.files["image"]
    mime = f.mimetype or ""
    if mime not in ALLOWED_MIME:
        return jsonify(error="Bitte JPG, PNG oder WebP verwenden."), 400

    raw = f.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        return jsonify(error="Das Bild darf höchstens 12 MB groß sein."), 413

    data_url = f"data:{mime};base64,{base64.b64encode(raw).decode('ascii')}"

    prompt = '''Du analysierst ein Foto einer Mahlzeit für einen Kalorien-Tracker.
Erkenne nur Lebensmittel, die auf dem Foto plausibel sichtbar sind. Schätze pro Bestandteil die verzehrfertige Portionsmenge in Gramm, Kalorien und Protein.
Wichtig: Eine Portionsschätzung aus einem einzelnen Foto ist unsicher. Gib deshalb konservative, realistische Schätzungen und erfinde keine versteckten Zutaten. Bei Öl, Saucen oder Dressing nur schätzen, wenn visuell plausibel; Unsicherheit im Hinweis nennen.

Antworte AUSSCHLIESSLICH als valides JSON in exakt dieser Form:
{
  "meal_name": "kurzer deutscher Name",
  "confidence": "niedrig|mittel|hoch",
  "note": "kurzer deutscher Hinweis zu Unsicherheiten",
  "items": [
    {"name":"Lebensmittel", "grams":150, "calories":200, "protein":12.5}
  ]
}

Kalorien und Protein beziehen sich jeweils auf die geschätzte Menge des sichtbaren Bestandteils, nicht pro 100 g. Runde Gramm und Kalorien auf ganze Zahlen, Protein auf eine Nachkommastelle.'''

    try:
        response = client.responses.create(
            model=os.getenv("OPENAI_VISION_MODEL", "gpt-5.6-luna"),
            input=[{
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {"type": "input_image", "image_url": data_url, "detail": "high"},
                ],
            }],
        )
        data = extract_json(response.output_text)
        items = data.get("items") or []
        clean = []
        for x in items[:20]:
            try:
                clean.append({
                    "name": str(x.get("name", "Lebensmittel"))[:80],
                    "grams": max(0, round(float(x.get("grams", 0)))),
                    "calories": max(0, round(float(x.get("calories", 0)))),
                    "protein": max(0, round(float(x.get("protein", 0)), 1)),
                })
            except (TypeError, ValueError):
                continue
        if not clean:
            return jsonify(error="Auf dem Bild konnten keine Lebensmittel sicher erkannt werden."), 422
        return jsonify(
            meal_name=str(data.get("meal_name") or "Mahlzeit aus Foto")[:100],
            confidence=str(data.get("confidence") or "mittel")[:20],
            note=str(data.get("note") or "Portionsgrößen bitte kontrollieren.")[:300],
            items=clean,
        )
    except Exception as e:
        app.logger.exception("meal analysis failed")
        return jsonify(error=f"KI-Analyse fehlgeschlagen: {e}"), 500


ALLOWED_RECIPE_HOSTS = {
    "instagram.com", "www.instagram.com",
    "tiktok.com", "www.tiktok.com", "m.tiktok.com",
    "vm.tiktok.com", "vt.tiktok.com",
}
MAX_PAGE_BYTES = 2 * 1024 * 1024


def _clean_html_text(value: str) -> str:
    value = re.sub(r"<script[\s\S]*?</script>", " ", value, flags=re.I)
    value = re.sub(r"<style[\s\S]*?</style>", " ", value, flags=re.I)
    value = re.sub(r"<[^>]+>", " ", value)
    value = html_lib.unescape(value)
    return re.sub(r"\s+", " ", value).strip()


def _meta_content(page: str, key: str) -> str:
    patterns = [
        rf'<meta[^>]+(?:property|name)=["\']{re.escape(key)}["\'][^>]+content=["\']([^"\']+)["\']',
        rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']{re.escape(key)}["\']',
    ]
    for pattern in patterns:
        m = re.search(pattern, page, flags=re.I)
        if m:
            return html_lib.unescape(m.group(1)).strip()
    return ""


def fetch_public_post(url: str):
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in {"http", "https"} or (parsed.hostname or "").lower() not in ALLOWED_RECIPE_HOSTS:
        raise ValueError("Bitte nur einen öffentlichen Instagram- oder TikTok-Link verwenden.")
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.7",
    })
    with urllib.request.urlopen(req, timeout=10) as resp:
        final_url = resp.geturl()
        final_host = (urllib.parse.urlparse(final_url).hostname or "").lower()
        if final_host not in ALLOWED_RECIPE_HOSTS:
            raise ValueError("Der geteilte Link wurde auf eine nicht unterstützte Domain weitergeleitet.")
        raw = resp.read(MAX_PAGE_BYTES + 1)
        if len(raw) > MAX_PAGE_BYTES:
            raw = raw[:MAX_PAGE_BYTES]
        charset = resp.headers.get_content_charset() or "utf-8"
        page = raw.decode(charset, errors="replace")
    title = _meta_content(page, "og:title") or _meta_content(page, "twitter:title")
    description = _meta_content(page, "og:description") or _meta_content(page, "description") or _meta_content(page, "twitter:description")
    visible = _clean_html_text(page)[:12000]
    return {
        "url": final_url,
        "title": title[:500],
        "description": description[:5000],
        "page_text": visible,
    }


@app.post("/api/import-recipe")
def import_recipe():
    body = request.get_json(silent=True) or {}
    url = str(body.get("url") or "").strip()
    extra_text = str(body.get("extra_text") or "").strip()[:12000]
    if not url:
        return jsonify(error="Kein Link empfangen."), 400

    try:
        source = fetch_public_post(url)
    except Exception as exc:
        if not extra_text:
            return jsonify(error=f"Der Beitrag konnte nicht öffentlich ausgelesen werden: {exc} Bitte füge zusätzlich die Caption bzw. den Rezepttext ein."), 422
        source = {"url": url, "title": "", "description": "", "page_text": ""}

    host = (urllib.parse.urlparse(source["url"]).hostname or "").lower()
    platform = "instagram" if "instagram" in host else "tiktok" if "tiktok" in host else "social"
    source_text = "\n\n".join(x for x in [source.get("title"), source.get("description"), extra_text, source.get("page_text")] if x)
    source_text = source_text[:18000]

    prompt = f'''Du wandelst einen öffentlich geteilten Social-Media-Kochbeitrag in ein strukturiertes Rezept für eine deutsche Kalorien-Tracker-App um.
Quelle: {source["url"]}
Plattform: {platform}
Öffentlich auslesbarer Text / Caption / Metadaten:
---
{source_text}
---

Regeln:
- Extrahiere nur Zutaten, Mengen und Zubereitung, die aus dem vorhandenen Text sinnvoll hervorgehen.
- Formuliere die Zubereitung als klare nummerierbare Einzelschritte in sinnvoller Reihenfolge.
- Falls exakte Mengen fehlen, darfst du eine vorsichtige alltagstaugliche Schätzung ergänzen, musst dies aber im Feld note klar kennzeichnen.
- Erfinde keine speziellen Zutaten, Marken oder Techniken, die nicht plausibel sind.
- Schätze Kalorien und Protein je Zutat für die angegebene Gesamtmenge und daraus pro Portion. Nährwerte sind Näherungswerte.
- Wenn die Quelle zu wenig Informationen für ein brauchbares Rezept enthält, setze confidence auf "niedrig" und erkläre im note-Feld, welche Angaben fehlen.

Antworte AUSSCHLIESSLICH als valides JSON:
{{
  "title":"Rezeptname",
  "platform":"{platform}",
  "source_url":"{source["url"]}",
  "servings":2,
  "confidence":"niedrig|mittel|hoch",
  "note":"Hinweis zu fehlenden/geschätzten Angaben",
  "ingredients":[
    {{"name":"Zutat","amount":200,"unit":"g","calories":250,"protein":20.0}}
  ],
  "steps":["Erster Schritt", "Zweiter Schritt"],
  "calories_per_serving":500,
  "protein_per_serving":30.0
}}'''

    try:
        response = client.responses.create(
            model=os.getenv("OPENAI_RECIPE_MODEL", os.getenv("OPENAI_VISION_MODEL", "gpt-5.6-luna")),
            input=prompt,
        )
        data = extract_json(response.output_text)
        ingredients = []
        for x in (data.get("ingredients") or [])[:40]:
            try:
                ingredients.append({
                    "name": str(x.get("name") or "Zutat")[:100],
                    "amount": x.get("amount", ""),
                    "unit": str(x.get("unit") or "")[:20],
                    "calories": max(0, round(float(x.get("calories") or 0))),
                    "protein": max(0, round(float(x.get("protein") or 0), 1)),
                })
            except (TypeError, ValueError):
                continue
        steps = [str(x).strip()[:500] for x in (data.get("steps") or []) if str(x).strip()][:30]
        if not ingredients or not steps:
            return jsonify(error="Aus dem Beitrag konnten nicht genug Rezeptinformationen extrahiert werden. Bitte füge die Caption oder den Rezepttext hinzu."), 422
        servings = max(1, min(50, round(float(data.get("servings") or 1))))
        return jsonify(
            title=str(data.get("title") or "Importiertes Rezept")[:140],
            platform=platform,
            source_url=source["url"],
            servings=servings,
            confidence=str(data.get("confidence") or "mittel")[:20],
            note=str(data.get("note") or "Mengen und Nährwerte bitte prüfen; sie können geschätzt sein.")[:600],
            ingredients=ingredients,
            steps=steps,
            calories_per_serving=max(0, round(float(data.get("calories_per_serving") or 0))),
            protein_per_serving=max(0, round(float(data.get("protein_per_serving") or 0), 1)),
        )
    except Exception as exc:
        app.logger.exception("recipe import failed")
        return jsonify(error=f"Rezeptanalyse fehlgeschlagen: {exc}"), 500


@app.get("/<path:path>")
def static_files(path):
    return send_from_directory(ROOT, path)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8000")), debug=True)
