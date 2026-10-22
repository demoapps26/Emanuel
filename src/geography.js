// WGS84 locations are kept separate from the compressed demonstration coordinates.
// Local equirectangular projection: metres east and south, with a fixed reference
// parallel. This regional overview is not cadastral surveying or a road map.
export function projectMetres(point, origin) {
  const rad = Math.PI / 180, radius = 6371008.8;
  return {
    x: radius * (point.lng - origin.lng) * rad * Math.cos(origin.lat * rad),
    y: radius * (origin.lat - point.lat) * rad,
  };
}
export function validCoordinate(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    Number.isFinite(value.lat) &&
    Number.isFinite(value.lng) &&
    value.lat >= -90 &&
    value.lat <= 90 &&
    value.lng >= -180 &&
    value.lng <= 180 &&
    typeof value.confirmed === "boolean"
  );
}
export function confirmedLocations(data) {
  return [...data.exploracoes, { ...data.sede, id: "sede" }]
    .filter((s) => validCoordinate(s.coordenadas) && s.coordenadas.confirmed)
    .map((s) => ({
      id: s.id,
      name: s.nome,
      lat: s.coordenadas.lat,
      lng: s.coordenadas.lng,
    }));
}
export function distanceMetres(a, b) {
  if (
    !validCoordinate({ ...a, confirmed: true }) ||
    !validCoordinate({ ...b, confirmed: true })
  )
    throw Error("Coordenadas WGS84 inválidas.");
  // Mean-earth great-circle distance, explicitly approximate (not a road route or survey).
  const rad = Math.PI / 180,
    dl = (b.lat - a.lat) * rad,
    dg = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dl / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dg / 2) ** 2;
  return (
    6371008.8 *
    2 *
    Math.atan2(Math.sqrt(Math.max(0, h)), Math.sqrt(Math.max(0, 1 - h)))
  );
}
