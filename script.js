const input = document.getElementById("imageInput"),
  button = document.getElementById("analyzeBtn"),
  preview = document.getElementById("previewImage"),
  placeholder = document.getElementById("placeholder"),
  fileName = document.getElementById("fileName"),
  title = document.getElementById("resultTitle"),
  resultText = document.getElementById("resultText");
const lamps = {
  RED: document.getElementById("redLamp"),
  YELLOW: document.getElementById("yellowLamp"),
  GREEN: document.getElementById("greenLamp"),
};
let file = null;
input.addEventListener("change", () => {
  file = input.files[0];
  if (!file) return;
  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
  placeholder.hidden = true;
  fileName.textContent = file.name;
  button.disabled = false;
  title.textContent = "Ready to analyze";
  resultText.textContent = "Click Analyze image to process this picture.";
  clearLamps();
});
function clearLamps() {
  Object.values(lamps).forEach((x) => x.classList.remove("active"));
}
function hsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  let max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min,
    h = 0;
  if (d) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : d / max, v: max };
}
button.addEventListener("click", () => {
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas"),
      scale = Math.min(1, 350 / Math.max(img.width, img.height));
    c.width = Math.max(1, Math.round(img.width * scale));
    c.height = Math.max(1, Math.round(img.height * scale));
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const data = ctx.getImageData(0, 0, c.width, c.height).data,
      counts = { RED: 0, YELLOW: 0, GREEN: 0 };
    for (let i = 0; i < data.length; i += 4) {
      const { h, s, v } = hsv(data[i], data[i + 1], data[i + 2]);
      if (s < 0.35 || v < 0.2) continue;
      if (h <= 12 || h >= 345) counts.RED++;
      else if (h >= 38 && h <= 68) counts.YELLOW++;
      else if (h >= 75 && h <= 165) counts.GREEN++;
    }
    const [color, count] = Object.entries(counts).sort(
      (a, b) => b[1] - a[1],
    )[0];
    if (count < c.width * c.height * 0.002) {
      clearLamps();
      title.textContent = "No clear signal color found";
      resultText.textContent =
        "Try a clearer image with a visible red, yellow, or green light.";
      return;
    }
    clearLamps();
    lamps[color].classList.add("active");
    const action = { RED: "STOP", YELLOW: "WAIT / PREPARE", GREEN: "GO" };
    title.textContent = color + " LIGHT";
    resultText.textContent =
      "Dominant color detected: " +
      color +
      ". Suggested action: " +
      action[color] +
      ".";
  };
  img.onerror = () => {
    title.textContent = "Could not load image";
    resultText.textContent = "Choose a valid image file.";
  };
  img.src = URL.createObjectURL(file);
});
