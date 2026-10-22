// Procedural illustrations inspired by the user's photographs; not official artwork.
function canvas(width = 1024, height = 512) {
  const image = document.createElement("canvas");
  image.width = width;
  image.height = height;
  return [image, image.getContext("2d")];
}
export function drawBrand(ctx, x, y, size = 110) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#f8f7ef";
  ctx.strokeStyle = "#28704b";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.84, size, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(-size, -size * 0.57, size * 2, size * 1.12);
  ctx.strokeRect(-size, -size * 0.57, size * 2, size * 1.12);
  ctx.textAlign = "center";
  ctx.fillStyle = "#244731";
  ctx.font = `${size * 0.15}px Arial`;
  ctx.fillText("FRUTAS", 0, -size * 0.56);
  ctx.font = `bold italic ${size * 0.39}px Georgia`;
  ctx.fillText("Patrícia", 0, -size * 0.05);
  ctx.fillText("Pilar", 0, size * 0.37);
  ctx.font = `${size * 0.1}px Arial`;
  ctx.fillText("DA TERRA", 0, size * 0.68);
  ctx.fillText("PARA O MUNDO", 0, size * 0.81);
  ctx.restore();
}
function tomato(ctx, x, y, r, color = "#dc4734") {
  ctx.save();
  ctx.translate(x, y);
  const gradient = ctx.createRadialGradient(
    -r * 0.3,
    -r * 0.35,
    r * 0.07,
    0,
    0,
    r,
  );
  gradient.addColorStop(0, "#ffe1a1");
  gradient.addColorStop(0.23, color);
  gradient.addColorStop(1, "#8e2926");
  ctx.fillStyle = gradient;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.ellipse(
      i * r * 0.23,
      Math.abs(i) * r * 0.03,
      r * 0.6,
      r * (0.83 - Math.abs(i) * 0.05),
      i * 0.09,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.strokeStyle = "#557640";
  ctx.lineWidth = r * 0.08;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.65);
    ctx.lineTo(Math.cos(a) * r * 0.43, -r * 0.65 + Math.sin(a) * r * 0.27);
    ctx.stroke();
  }
  ctx.restore();
}
function national(ctx, x, y) {
  ctx.fillStyle = "#253b31";
  ctx.font = "bold 20px Arial";
  ctx.fillText("PRODUÇÃO NACIONAL", x, y);
  ctx.fillStyle = "#27774b";
  ctx.fillRect(x, y + 9, 110, 5);
  ctx.fillStyle = "#b73b3b";
  ctx.fillRect(x + 120, y + 9, 70, 5);
}
export function pilarLivery(kind, { back = false } = {}) {
  const [image, ctx] = canvas();
  ctx.fillStyle = "#f6f5ed";
  ctx.fillRect(0, 0, 1024, 512);
  if (kind === "truck") {
    const fruit = [
      [60, 70, 43, "#dc4734"],
      [260, 20, 43, "#e0ab37"],
      [510, 23, 53, "#a73936"],
      [770, 10, 50, "#b46d40"],
      [990, 90, 65, "#d74731"],
      [50, 390, 65, "#d8a838"],
      [460, 485, 55, "#db3b31"],
      [700, 500, 62, "#dca438"],
      [980, 430, 50, "#5d7047"],
    ];
    fruit.forEach((args) => tomato(ctx, ...args));
    drawBrand(ctx, 258, 255, 142);
    ctx.fillStyle = "#273a2a";
    ctx.font = "35px Georgia";
    ctx.fillText("Da terra para o Mundo.", 485, 225);
    national(ctx, 485, 290);
    ctx.fillStyle = "#3b704e";
    ctx.fillRect(0, 493, 1024, 9);
  } else {
    drawBrand(ctx, back ? 240 : 255, back ? 185 : 165, back ? 120 : 113);
    ctx.fillStyle = "#283d32";
    ctx.font = "bold 44px Arial";
    ctx.fillText(kind === "biological" ? "CONTROLO" : "TÉCNICO", 485, 135);
    ctx.fillText(kind === "biological" ? "BIOLÓGICO" : "AGRÍCOLA", 485, 188);
    ctx.fillStyle = "#28704b";
    ctx.font = "27px Arial";
    ctx.fillText("patriciapilar.pt", 485, 230);
    national(ctx, 485, 275);
    if (kind === "biological") {
      ctx.fillStyle = "#119839";
      ctx.fillRect(0, 444, 1024, 68);
      // Small flower and pollinator motif, matching the photographic theme.
      for (let i = 0; i < 11; i++) {
        const x = 560 + i * 36,
          y = 400 + Math.sin(i) * 24;
        ctx.strokeStyle = "#6b8754";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, 470);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = "#fffdf0";
        for (let k = 0; k < 5; k++) {
          ctx.beginPath();
          ctx.arc(
            x + Math.sin(k * 1.26) * 13,
            y + Math.cos(k * 1.26) * 13,
            10,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.fillStyle = "#d4b342";
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#6e5034";
      ctx.beginPath();
      ctx.ellipse(550, 346, 22, 12, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c4d3c5";
      ctx.beginPath();
      ctx.ellipse(545, 326, 16, 9, -0.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      tomato(ctx, 120, 475, 150);
      tomato(ctx, 425, 530, 155, "#dba33e");
      tomato(ctx, 930, 485, 140);
    }
  }
  ctx.textAlign = "right";
  ctx.font = "12px Arial";
  ctx.fillStyle = "#446a52";
  ctx.fillText("ILUSTRAÇÃO APROXIMADA · SIMULAÇÃO", 995, 490);
  return image;
}
export function cropPanel(cucumber = false) {
  const [image, ctx] = canvas(512, 512);
  ctx.fillStyle = "#b4c6b2";
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = "#e2e1d4";
  ctx.beginPath();
  ctx.moveTo(210, 512);
  ctx.lineTo(246, 90);
  ctx.lineTo(266, 90);
  ctx.lineTo(308, 512);
  ctx.fill();
  ctx.strokeStyle = "#e9e8dd";
  ctx.lineWidth = 3;
  for (let i = 0; i < 9; i++) {
    const x = i * 64;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  ctx.fillStyle = "#d7b546";
  ctx.fillRect(0, 180, 512, 7);
  for (let i = 0; i < 40; i++) {
    const side = i % 2 ? -1 : 1,
      k = Math.floor(i / 2),
      x = 256 + side * (55 + (k % 5) * 34),
      y = 95 + Math.floor(k / 5) * 100;
    ctx.strokeStyle = "#426a38";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, 495);
    ctx.lineTo(x, y - 45);
    ctx.stroke();
    for (let j = 0; j < 4; j++) {
      ctx.fillStyle = j % 2 ? "#4d7e40" : "#366337";
      ctx.beginPath();
      ctx.ellipse(
        x + (j % 2 ? 14 : -14),
        y + j * 25,
        21,
        cucumber ? 15 : 9,
        j % 2 ? 0.5 : -0.5,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    if (cucumber) {
      ctx.fillStyle = "#234932";
      ctx.beginPath();
      ctx.ellipse(x + 9, y + 69, 6, 27, 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else {
      for (let j = 0; j < 3; j++) {
        ctx.fillStyle = k % 3 === 0 ? "#83a04a" : "#cb4934";
        ctx.beginPath();
        ctx.arc(x + 8 + j * 4, y + 70 + j * 12, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  return image;
}
