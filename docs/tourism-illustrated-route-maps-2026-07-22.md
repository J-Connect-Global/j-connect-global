# Tourism illustrated route maps — 2026-07-22

The 20 tourism articles use a generated watercolor-and-ink background with a deterministic SVG route overlay. This split keeps the supplied Bremen reference's visual language while preventing generated text or imagined geography from becoming navigation guidance.

## Asset pipeline

- Backgrounds: `/assets/images/living/routes/{slug}-illustrated-map.webp`
- Desktop composites: `/assets/images/living/routes/{slug}-route-overview.svg`
- Mobile composites: `/assets/images/living/routes/{slug}-route-overview-mobile.svg`
- Route geometry and source records: `/data/tourism-route-overviews.json`
- Generator: `/scripts/generate-tourism-route-overviews.mjs`
- Final background dimensions: 1440 × 960 WebP, each below 750 KB

## Image-generation prompt set

The built-in image generator received the user-supplied Bremen map only as a style reference. Each destination used this common prompt structure, with its own named geographic anchors and north/east/south/west relationships:

> Infographic-diagram; create a wide 3:2, north-up, label-free illustrated tourist-map background for [destination]. Preserve the stated spatial relationships among [verified anchors]. Refined architectural watercolor and ink on warm ivory paper; navy outlines; terracotta and slate roofs; sage trees; restrained blue water; gently elevated/isometric city-guide composition. No text, letters, numbers, labels, title, legend, compass, arrows, route lines, watermark, or logo. Leave calm visual space for a precise SVG route overlay.

No generated wording or generated marker placement is treated as factual. Labels, numbers, route lines, optional branches, compass, and disclosures are rendered by the SVG generator.

## Geography verification

- All 114 route points record latitude, longitude, and a direct OpenStreetMap object URL.
- Coordinates were collected through the public Nominatim search API at one request per second with a custom user agent and a local cache, in line with the OSMF usage policy.
- Two hard-to-disambiguate features, Düsseldorf's Japanischer Garten and Munich's Monopteros, were resolved against their Overpass/OpenStreetMap objects.
- SVG coordinates are projected north-up from the recorded longitude and latitude. Intentional remote arrival points are marked as insets and excluded from cardinal-layout assertions.
- The route diagrams disclose that the background is AI-generated, the marker relationships are OSM-verified, and scale, street shapes, and travel time are not exact.

Run `node scripts/generate-tourism-route-overviews.mjs` after changing route data, followed by `node scripts/test-tourism-usability.mjs`.
