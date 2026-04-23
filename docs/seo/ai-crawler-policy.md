# AI Crawler Policy (Stand: 2026-04-23)

Diese Richtlinie dokumentiert, wie `komplettwebdesign.de` aktuell mit Discovery- und AI-Crawlern umgeht.

## Ziel

- Sichtbarkeit in klassischen Suchmaschinen halten und ausbauen.
- Zitationsfähigkeit in AI-gestützten Suchsystemen sichern.
- Sensible Bereiche (`/admin`, `/auth`) weiterhin konsequent ausschließen.

## Aktuelle robots.txt-Entscheidungen

Explizit erlaubt:

- `Googlebot`
- `Google-Extended`
- `OAI-SearchBot`
- `GPTBot`
- `ChatGPT-User`
- `PerplexityBot`
- `ClaudeBot`
- `Claude-User`
- `Claude-SearchBot`

Für alle genannten Crawler gelten:

- `Allow: /`
- `Disallow: /admin/`
- `Disallow: /auth/`

## Einordnung zu Google-Extended

`Google-Extended` wird als bewusste Business-Entscheidung behandelt.

- Es ist kein klassischer Ranking-Hebel für organische SERPs.
- Es beeinflusst, wie Inhalte für AI-Kontexte (Training/Grounding) nutzbar sind.
- Änderungen an dieser Regel sollten nur nach Business-Entscheid (Legal, Marke, Lead-Strategie) erfolgen.

