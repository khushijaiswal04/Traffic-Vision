const input = document.getElementById("imageInput");
const button = document.getElementById("analyzeBtn");
const preview = document.getElementById("previewImage");
const placeholder = document.getElementById("placeholder");
const video = document.getElementById("cameraVideo");
const fileName = document.getElementById("fileName");
const title = document.getElementById("resultTitle");
const resultText = document.getElementById("resultText");
const voiceBtn = document.getElementById("voiceBtn");
const voiceStatus = document.getElementById("voiceStatus");
const cameraBtn = document.getElementById("cameraBtn");
const captureBtn = document.getElementById("captureBtn");
const cameraStatus = document.getElementById("cameraStatus");
const historyKey = "trafficVision.history.v1";
const lamps = {
  RED: document.getElementById("redLamp"),
  YELLOW: document.getElementById("yellowLamp"),
  GREEN: document.getElementById("greenLamp"),
};
const actions = { RED: "STOP", YELLOW: "WAIT / PREPARE", GREEN: "GO" };
let file = null;
let cameraStream = null;
let selectedView = "dashboard";
let history = loadHistory();

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(historyKey) || "[]");
    return Array.isArray(saved)
      ? saved.filter((entry) => entry && typeof entry.color === "string" && typeof entry.date === "string")
      : [];
  } catch (error) {
    console.error("Could not read saved analysis history.", error);
    return [];
  }
}

function saveHistory() {
  try {
    localStorage.setItem(historyKey, JSON.stringify(history));
  } catch (error) {
    console.error("Could not save analysis history.", error);
    resultText.textContent += " This result could not be saved in browser storage.";
  }
}

function showView(name) {
  selectedView = name;
  document.querySelectorAll(".view").forEach((view) => {
    view.hidden = view.id !== `${name}View`;
  });
  document.querySelectorAll(".tab").forEach((tab) => {
    const active = tab.dataset.view === name;
    tab.classList.toggle("active", active);
    if (active) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });
  if (name !== "analyze") stopCamera();
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => showView(tab.dataset.view));
});
document.querySelectorAll("[data-go]").forEach((control) => {
  control.addEventListener("click", () => showView(control.dataset.go));
});

function updateHistoryUI() {
  const counts = { RED: 0, YELLOW: 0, GREEN: 0 };
  history.forEach((entry) => {
    if (Object.prototype.hasOwnProperty.call(counts, entry.color)) counts[entry.color]++;
  });
  document.getElementById("totalAnalyses").textContent = history.length;
  document.getElementById("redCount").textContent = counts.RED;
  document.getElementById("yellowCount").textContent = counts.YELLOW;
  document.getElementById("greenCount").textContent = counts.GREEN;
  document.getElementById("navHistoryCount").textContent = history.length;
  document.getElementById("clearHistoryBtn").disabled = history.length === 0;
  renderEntries(document.getElementById("dashboardRecent"), history.slice(0, 3), "No analyses yet. Choose an image to get started.");
  renderEntries(document.getElementById("historyList"), history, "No saved analyses yet. Your results will appear here.");
}

function renderEntries(container, entries, emptyMessage) {
  container.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state muted";
    empty.textContent = emptyMessage;
    container.append(empty);
    return;
  }
  entries.forEach((entry) => {
    const row = document.createElement("article");
    row.className = "history-entry";
    const badge = document.createElement("span");
    badge.className = `color-badge ${entry.color.toLowerCase()}`;
    badge.textContent = entry.color;
    const details = document.createElement("div");
    details.className = "entry-details";
    const source = document.createElement("strong");
    source.textContent = entry.source || "Image";
    const date = document.createElement("span");
    date.textContent = new Date(entry.date).toLocaleString();
    const action = document.createElement("span");
    action.className = "entry-action";
    action.textContent = `Suggested action: ${actions[entry.color] || "Review"}`;
    details.append(source, date, action);
    row.append(badge, details);
    container.append(row);
  });
}

function clearLamps() {
  Object.values(lamps).forEach((lamp) => lamp.classList.remove("active"));
}

function hsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const difference = max - min;
  let h = 0;
  if (difference) {
    if (max === r) h = 60 * (((g - b) / difference) % 6);
    else if (max === g) h = 60 * ((b - r) / difference + 2);
    else h = 60 * ((r - g) / difference + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : difference / max, v: max };
}

function setSelectedFile(selectedFile, sourceLabel = selectedFile.name) {
  if (!selectedFile || !selectedFile.type.startsWith("image/")) {
    title.textContent = "Choose a valid image";
    resultText.textContent = "Please select an image file to continue.";
    return;
  }
  if (preview.src.startsWith("blob:")) URL.revokeObjectURL(preview.src);
  file = selectedFile;
  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
  video.hidden = true;
  placeholder.hidden = true;
  fileName.textContent = sourceLabel;
  button.disabled = false;
  title.textContent = "Ready to analyze";
  resultText.textContent = "Click Analyze image to process this picture.";
  clearLamps();
}

input.addEventListener("change", () => {
  const selectedFile = input.files[0];
  if (selectedFile) {
    stopCamera();
    setSelectedFile(selectedFile);
  }
});

function analyzeImage(image, source) {
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 350 / Math.max(image.width, image.height));
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas is unavailable in this browser.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const counts = { RED: 0, YELLOW: 0, GREEN: 0 };
  for (let i = 0; i < pixels.length; i += 4) {
    const { h, s, v } = hsv(pixels[i], pixels[i + 1], pixels[i + 2]);
    if (s < 0.35 || v < 0.2) continue;
    if (h <= 12 || h >= 345) counts.RED++;
    else if (h >= 38 && h <= 68) counts.YELLOW++;
    else if (h >= 75 && h <= 165) counts.GREEN++;
  }
  const [color, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  clearLamps();
  if (count < canvas.width * canvas.height * 0.002) {
    title.textContent = "No clear signal color found";
    resultText.textContent = "Try a clearer image with a visible red, yellow, or green light.";
    return;
  }
  lamps[color].classList.add("active");
  title.textContent = `${color} LIGHT`;
  resultText.textContent = `Dominant color detected: ${color}. Suggested action: ${actions[color]}.`;
  history.unshift({ color, date: new Date().toISOString(), source });
  history = history.slice(0, 100);
  saveHistory();
  updateHistoryUI();
  speakResult();
}

button.addEventListener("click", () => {
  if (!file) return;
  const image = new Image();
  const imageUrl = URL.createObjectURL(file);
  image.onload = () => {
    try {
      analyzeImage(image, fileName.textContent);
    } catch (error) {
      console.error("Image analysis failed.", error);
      title.textContent = "Could not analyze image";
      resultText.textContent = "The image could not be processed. Please choose another image.";
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  };
  image.onerror = () => {
    title.textContent = "Could not load image";
    resultText.textContent = "Choose a valid image file.";
    URL.revokeObjectURL(imageUrl);
  };
  image.src = imageUrl;
});

function speakResult() {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    voiceStatus.textContent = "Speech playback is not supported in this browser.";
    return;
  }
  if (!lamps.RED.classList.contains("active") &&
      !lamps.YELLOW.classList.contains("active") &&
      !lamps.GREEN.classList.contains("active")) {
    voiceStatus.textContent = "Analyze an image with a clear signal color before playing a result.";
    return;
  }
  const utterance = new SpeechSynthesisUtterance(`${title.textContent}. ${resultText.textContent}`);
  utterance.onerror = (event) => {
    voiceStatus.textContent = `Speech playback failed: ${event.error}.`;
  };
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  voiceStatus.textContent = "Reading the latest result aloud.";
}

voiceBtn.addEventListener("click", speakResult);

async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    cameraStatus.textContent = "Webcam is unavailable. Use HTTPS or localhost in a supported browser.";
    return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = cameraStream;
    video.hidden = false;
    preview.hidden = true;
    placeholder.hidden = true;
    captureBtn.disabled = false;
    cameraBtn.textContent = "Stop webcam";
    cameraStatus.textContent = "Camera is on. Capture a frame when ready.";
  } catch (error) {
    console.error("Could not start webcam.", error);
    cameraStatus.textContent = error.name === "NotAllowedError"
      ? "Camera permission was denied. Allow camera access in browser settings and try again."
      : "Could not start the camera. Check that it is connected and not in use by another app.";
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  video.srcObject = null;
  video.hidden = true;
  captureBtn.disabled = true;
  cameraBtn.textContent = "Start webcam";
  if (cameraStatus) cameraStatus.textContent = "Camera is off.";
  if (preview.src) preview.hidden = false;
  else placeholder.hidden = false;
}

cameraBtn.addEventListener("click", () => {
  if (cameraStream) stopCamera();
  else startCamera();
});

captureBtn.addEventListener("click", () => {
  if (!video.videoWidth || !video.videoHeight) {
    cameraStatus.textContent = "Camera is starting. Wait a moment and try again.";
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    cameraStatus.textContent = "Could not capture a frame from this camera.";
    return;
  }
  context.drawImage(video, 0, 0);
  canvas.toBlob((blob) => {
    if (!blob) {
      cameraStatus.textContent = "Could not create an image from the webcam frame.";
      return;
    }
    setSelectedFile(new File([blob], `webcam-${new Date().toISOString()}.jpg`, { type: "image/jpeg" }), "Webcam capture");
    stopCamera();
    cameraStatus.textContent = "Frame captured. Click Analyze image to continue.";
  }, "image/jpeg", 0.92);
});

document.getElementById("clearHistoryBtn").addEventListener("click", () => {
  history = [];
  saveHistory();
  updateHistoryUI();
});

window.addEventListener("beforeunload", () => {
  stopCamera();
  if (preview.src.startsWith("blob:")) URL.revokeObjectURL(preview.src);
});

updateHistoryUI();
showView(selectedView);
