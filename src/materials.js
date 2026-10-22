import * as THREE from "three";
function noiseTexture(base, amount, seed = 32) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d"),
    image = ctx.createImageData(256, 256);
  let s = seed;
  for (let i = 0; i < image.data.length; i += 4) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const n = (s / 4294967296 - 0.5) * amount;
    const fleck = s % 71 === 0 ? amount * 0.8 : 0;
    for (let k = 0; k < 3; k++)
      image.data[i + k] = Math.max(0, Math.min(255, base[k] + n + fleck));
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
export function terrainMaterials() {
  const grass = new THREE.MeshStandardMaterial({
    map: noiseTexture([109, 126, 76], 29),
    roughness: 1,
  });
  grass.userData.worldTile = 7;
  const road = new THREE.MeshStandardMaterial({
    map: noiseTexture([81, 85, 80], 39),
    roughness: 0.95,
  });
  road.bumpMap=road.map;road.bumpScale=.055;
  road.userData.worldTile = 5;
  const concrete = new THREE.MeshStandardMaterial({
    map: noiseTexture([166, 163, 146], 22),
    roughness: 0.94,
  });
  concrete.userData.worldTile = 6;
  return { grass, road, concrete };
}
export function skyEnvironment() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d"),
    gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, "#6b9ec4");
  gradient.addColorStop(0.4, "#d4e1e2");
  gradient.addColorStop(0.52, "#f2e5ca");
  gradient.addColorStop(0.56, "#88866b");
  gradient.addColorStop(1, "#3e4e32");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
export function contactShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d"),
    gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  gradient.addColorStop(0, "rgba(0,0,0,.6)");
  gradient.addColorStop(0.45, "rgba(0,0,0,.3)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}
