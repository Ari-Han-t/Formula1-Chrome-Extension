# Formula 1 Live Chrome Extension 🏎️💨

A sleek, modern Chrome Extension that brings the world of Formula 1 right to your browser. Stay up-to-date with live countdowns to the next F1 session, current driver and constructor standings, and track information.

## ✨ Features

- **Live Session Countdown:** Automatically detects the very next active session (FP1, FP2, Sprint, Qualifying, or Race) and displays a real-time countdown.
- **Track Information & Imagery:** Dynamically fetches circuit facts and track layout images using the Wikipedia API.
- **Driver Standings:** View the latest driver standings with beautiful, color-coded team accents.
- **Constructor Standings:** Stay updated on the fight for the Constructors' Championship.
- **Premium Design:** Features a dark-mode aesthetic with glassmorphism UI elements, micro-animations, and vibrant F1 colors.

## 🛠️ Installation

1. Clone or download this repository to your local machine:
   ```bash
   git clone https://github.com/Ari-Han-t/Formula1-Chrome-Extension.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle switch in the top right corner.
4. Click the **Load unpacked** button in the top left corner.
5. Select the folder where you cloned/downloaded this repository (`Formula1-Chrome-Extension`).
6. The extension is now installed! You can pin it to your browser toolbar for quick access.

## 📡 APIs Used

This extension relies on the following APIs to fetch live data:
- **[Jolpica F1 API](https://jolpi.ca/)**: A modern, backwards-compatible replacement for the Ergast API, providing live race schedules, driver standings, and constructor standings.
- **[Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/)**: Used to retrieve dynamic summaries and track layout images based on the circuit's Wikipedia page.

## 💻 Built With

- Vanilla HTML5
- Vanilla CSS3 (Custom properties, Flexbox, Glassmorphism)
- Vanilla JavaScript (ES6+ async/await, Fetch API)
- Manifest V3 for Chrome Extensions

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
