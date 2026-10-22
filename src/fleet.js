export const VEHICLE_NAMES = {
  technical: "Carro técnico",
  agropilar: "Carrinha Agropilar",
  biological: "Carrinha de controlo biológico",
  agricultural: "Carrinha de técnico agrícola",
};
// Local simulation coordinates, never real fleet locations.
export const PARKED_FLEET = [
  { x: 63, z: 84, yaw: Math.PI / 2, speed: 0, kind: "agropilar" },
  { x: 88, z: 112, yaw: Math.PI / 2, speed: 0, kind: "biological" },
  { x: 111, z: 112, yaw: Math.PI / 2, speed: 0, kind: "agricultural" },
];
