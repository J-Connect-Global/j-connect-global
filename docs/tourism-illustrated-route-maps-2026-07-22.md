# Tourism illustrated route maps — 2026-07-22

Nineteen tourism articles use a generated watercolor-and-ink background with a deterministic SVG route overlay. Bremen uses the user-supplied completed route map as a responsive WebP because its labels, legend, and route markers are already part of the approved image.

## Asset pipeline

- Backgrounds: `/assets/images/living/routes/{slug}-illustrated-map.webp`
- Desktop composites: `/assets/images/living/routes/{slug}-route-overview.svg`
- Mobile composites: `/assets/images/living/routes/{slug}-route-overview-mobile.svg`
- Bremen replacement: `/assets/images/living/routes/bremen-weekend-trip-illustrated-map.webp`, with `-480w.webp` and `-768w.webp` responsive variants
- Route geometry and source records: `/data/tourism-route-overviews.json`
- Generator: `/scripts/generate-tourism-route-overviews.mjs`
- Generated background dimensions: 1440 × 960 WebP, each below 750 KB
- Bremen supplied map dimensions: 1046 × 683 WebP, below 750 KB

## Image-generation prompt set

The built-in image generator received the user-supplied Bremen map as a style reference for the other nineteen destinations. Each generated destination used this common prompt structure, with its own named geographic anchors and north/east/south/west relationships:

> Infographic-diagram; create a wide 3:2, north-up, label-free illustrated tourist-map background for [destination]. Preserve the stated spatial relationships among [verified anchors]. Refined architectural watercolor and ink on warm ivory paper; navy outlines; terracotta and slate roofs; sage trees; restrained blue water; gently elevated/isometric city-guide composition. No text, letters, numbers, labels, title, legend, compass, arrows, route lines, watermark, or logo. Leave calm visual space for a precise SVG route overlay.

For the nineteen generated maps, no generated wording or generated marker placement is treated as factual. Labels, numbers, route lines, optional branches, compass, and disclosures are rendered by the SVG generator. Bremen displays the approved supplied map directly.

## Geography verification

- All 114 route points record latitude, longitude, and a direct OpenStreetMap object URL.
- Coordinates were collected through the public Nominatim search API at one request per second with a custom user agent and a local cache, in line with the OSMF usage policy.
- Two hard-to-disambiguate features, Düsseldorf's Japanischer Garten and Munich's Monopteros, were resolved against their Overpass/OpenStreetMap objects.
- SVG coordinates are projected north-up from the recorded longitude and latitude. Intentional remote arrival points are marked as insets and excluded from cardinal-layout assertions.
- The route diagrams disclose that the background is AI-generated, the marker relationships are OSM-verified, and scale, street shapes, and travel time are not exact.

Run `node scripts/generate-tourism-route-overviews.mjs` after changing route data, followed by `node scripts/test-tourism-usability.mjs`.
