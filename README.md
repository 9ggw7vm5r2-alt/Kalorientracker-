# Kalorientracker V21 – individuelle KI-Food-Bilder

- Neue Mahlzeiten erhalten automatisch ein individuell zum Namen des Gerichts generiertes Food-Foto.
- Kochbuch-Rezepte erhalten ebenfalls KI-generierte, individuelle Bilder.
- Eigene Fotos haben immer Vorrang.
- KI-Bilder werden lokal zwischengespeichert, damit nicht bei jedem Öffnen neu generiert wird.
- Serverseitige Vercel Function `api/generate-food-image.js`.
- Benötigt in Vercel die Umgebungsvariable `OPENAI_API_KEY`.
- API-Schlüssel wird niemals an den Browser ausgeliefert.
- Vercel Framework Preset: Other.
