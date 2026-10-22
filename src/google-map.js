import { validCoordinate } from "./geography.js";
// API usage follows Google's official samples, consulted 2026-10-22:
// https://github.com/googlemaps-samples/js-api-samples/tree/main/samples/3d-simple-map
// https://github.com/googlemaps-samples/js-api-samples/tree/main/samples/3d-marker-click-event
// No script or API requests are made until all guards pass and the user explicitly opens the viewer.
let loading;
export function googleRequirements({
  enabled = false,
  apiKey = "",
  locations = [],
} = {}) {
  const missing = [];
  if (!enabled)
    missing.push("ativação explícita do modo Google após revisão de custos");
  if (!apiKey)
    missing.push("chave de navegador Google Maps configurada e restringida");
  if (
    !locations.length ||
    !locations.every((p) => validCoordinate({ ...p, confirmed: true }))
  )
    missing.push("pelo menos uma localização confirmada e válida");
  return { ready: missing.length === 0, missing };
}
function loadSDK(apiKey) {
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const callback = "__ppGoogleMapsLoaded";
    const timeout = setTimeout(
      () => fail("O Google Maps não respondeu dentro de 20 segundos."),
      20000,
    );
    const previousAuthFailure = window.gm_authFailure;
    const cleanup = () => {
      clearTimeout(timeout);
      delete window[callback];
    };
    const fail = (message) => {
      cleanup();
      script.remove();
      loading = undefined;
      window.gm_authFailure = previousAuthFailure;
      reject(Error(message));
    };
    window[callback] = () => {
      cleanup();
      resolve();
    };
    window.gm_authFailure = () => {
      const message =
        "A chave Google Maps não foi autorizada. Verifica a API, faturação e restrições de origem.";
      window.dispatchEvent(
        new CustomEvent("pp-map-auth-error", { detail: message }),
      );
      fail(message);
    };
    const params = new URLSearchParams({
      key: apiKey,
      v: "weekly",
      loading: "async",
      callback,
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () =>
      fail(
        "Não foi possível carregar o Google Maps. Verifica a rede e as restrições do projeto.",
      );
    document.head.append(script);
  });
  return loading;
}
export async function openGoogle3D(
  host,
  { enabled, apiKey, locations, onSelect, onError, signal },
) {
  const requirements = googleRequirements({ enabled, apiKey, locations });
  if (!requirements.ready)
    throw Error(
      `Modo Google indisponível: ${requirements.missing.join("; ")}.`,
    );
  const authError = (e) => {
    if (!signal.aborted) onError(e.detail);
  };
  window.addEventListener("pp-map-auth-error", authError, { signal });
  await loadSDK(apiKey);
  if (signal.aborted) return;
  const { Map3DElement, Marker3DInteractiveElement } =
    await window.google.maps.importLibrary("maps3d");
  if (signal.aborted) return;
  if (!Map3DElement || !Marker3DInteractiveElement)
    throw Error("A biblioteca 3D não está disponível nesta versão/conta.");
  const center = locations[0];
  const map = new Map3DElement({
    center: { lat: center.lat, lng: center.lng, altitude: 0 },
    range: 3000,
    tilt: 65,
    mode: "HYBRID",
  });
  for (const location of locations) {
    const marker = new Marker3DInteractiveElement({
      position: { lat: location.lat, lng: location.lng },
      label: location.name,
      altitudeMode: "CLAMP_TO_GROUND",
    });
    marker.addEventListener("gmp-click", () => onSelect(location.id));
    map.append(marker);
  }
  map.addEventListener("gmp-error", () =>
    onError(
      "O fornecedor indicou um erro no mapa 3D. Verifica a chave, cobertura e rede.",
    ),
  );
  host.replaceChildren(map);
  signal.addEventListener("abort", () => map.remove(), { once: true });
  return map;
}
