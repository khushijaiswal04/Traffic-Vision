# TrafficVision — Basic Upgrade

A browser-only traffic-light color recognition demo, upgraded with a dashboard, spoken results, local analysis history, and webcam capture. The existing image upload and HSV-based dominant-color detection behavior is preserved.

## Features

- **Dashboard:** total saved detections and red/yellow/green counts, plus the latest three results.
- **Image analysis:** upload JPG, PNG, WEBP, or another browser-supported image. The browser samples image pixels and identifies the strongest red, yellow, or green signal color.
- **Voice:** supported browsers automatically speak a successful result; use **Read result aloud** to replay it.
- **History:** successful detections are stored in this browser's `localStorage` (up to 100 entries). Use **Clear history** to remove them.
- **Webcam:** grant camera permission, start the webcam, capture a frame, then analyze it using the same detector.
- **Responsive layout:** dashboard, analyzer, and history adapt to smaller screens.

## Folder structure

```text
Traffic-Vision/
├── index.html   # Dashboard, analyzer, history, and camera UI
├── style.css    # Responsive layout and component styles
├── script.js    # Color detection, speech, webcam, and local history
└── README.md    # Setup, usage, testing, and limitations
```

There is no application backend, build step, framework, or dependency install. HTML, CSS, and JavaScript run in the browser. History is device/browser-local and is not synced to a server.

## Setup and run

1. Open the project folder in VS Code.
2. To use the webcam, install/enable the **Live Server** extension, right-click `index.html`, and choose **Open with Live Server**. This serves the static files from a local address such as `http://127.0.0.1:5500`.
3. Alternatively, in PowerShell opened at the project folder, run:

   ```powershell
   py -m http.server 8000
   ```

   Then visit `http://localhost:8000` in your browser. This optional command only serves static files; the application itself has no Python backend. Press **Ctrl+C** in PowerShell to stop the server.
4. Open **Analyze**, choose an image or start the webcam, capture a frame if using the camera, and click **Analyze image**.
5. View saved results from **Dashboard** or **History**. Use **Read result aloud** to replay the latest successful result.

Opening `index.html` directly also supports image analysis in most browsers. Webcam access generally requires `localhost` or HTTPS and explicit camera permission. Voice playback depends on browser speech support and device settings.

## Testing checklist

Run the app using Live Server or the static server above, then verify:

1. Dashboard opens with zero counts on a fresh browser profile.
2. An image upload previews the image and enables **Analyze image**.
3. A clear red, yellow, and green signal image each activates the expected lamp and displays its suggested action.
4. An image without a qualifying signal color displays the existing no-clear-color message and is not added as a detection.
5. A successful result increments dashboard counts, appears in History, and remains there after refreshing the page.
6. **Read result aloud** replays the last successful result where speech synthesis is supported.
7. Camera permission allows live preview and frame capture; the captured frame can be analyzed. Denied permission shows an actionable status message.
8. **Clear history** removes saved entries and resets dashboard counts.
9. Dashboard, Analyze, and History remain usable at desktop and mobile viewport widths.

## Updated report and limitations

This basic upgrade is implemented with browser APIs only: `localStorage`, `getUserMedia`, canvas, and the Web Speech API when available. It retains the original HSV thresholds and whole-image dominant-color approach. Because it does not locate a traffic-light object or use a trained model, large colored backgrounds may affect results; test images are demonstrations only. Do not rely on these predictions or suggested actions for real driving or road-safety decisions.
