# BigQuery Release Notes Explorer

A premium, interactive web application built with **Python Flask** and **Vanilla HTML, CSS, and JavaScript** that fetches, parses, and displays Google Cloud BigQuery release notes in real-time.

---

## 🚀 Features

- **Real-time Feed Syncing**: Fetches and parses the official BigQuery release notes Atom feed dynamically.
- **Advanced Update Parsing**: Automatically extracts individual updates from the HTML content and categorizes them into **Features**, **Changes**, **Deprecations**, or **Others**.
- **Interactive Dashboard**:
  - **Insta-Search**: Filter release notes in real-time as you type.
  - **Stats Cards**: Displays counters for each update type that double as quick filters.
  - **Category Pills**: Easily isolate specific types of updates.
- **User Tools**:
  - **Local Bookmarks**: Star important release notes to save them for later (persisted via browser `localStorage`).
  - **Quick Share**: Copy direct anchors to specific release notes.
  - **Social Sharing**: Share updates directly to Twitter (X) with pre-formatted text, hashtags, and links.
- **Premium UI/UX**: Features a glassmorphic dark-mode design with smooth animations, ambient glows, and shimmering skeleton loading states.

---

## 📂 Project Structure

```text
bigquery-release-notes/
│
├── app.py                  # Flask backend (fetches, parses, and serves JSON/HTML)
├── README.md               # Project documentation
├── .gitignore              # Files to ignore in Git
│
├── templates/
│   └── index.html          # Main HTML structure
│
└── static/
    ├── css/
    │   └── style.css       # Custom vanilla styling & animations
    └── js/
        └── app.js          # App state, search, filter, and rendering logic
```

---

## 🛠️ Technology Stack

- **Backend**: Python, Flask, XML ElementTree, Regular Expressions (`re`)
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6)
- **Icons**: Lucide Icons
- **Fonts**: Outfit & Inter (via Google Fonts)

---

## 🏃 Getting Started

### Prerequisites

- Python 3.8 or higher
- Flask

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/MarvinaChinasa/marvinachinasa-event-talks-app.git
   cd marvinachinasa-event-talks-app
   ```

2. Install dependencies:
   ```bash
   pip install Flask
   ```

3. Run the application:
   ```bash
   python app.py
   ```

4. Open your browser and navigate to:
   👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🔄 How It Works (Data Flow)

1. **Request**: The browser loads `index.html` and triggers a `fetch()` request to `/api/release-notes`.
2. **Fetch**: The Flask backend fetches the raw Atom XML feed from:
   `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`
3. **Parse**: Flask parses the XML and uses regex (`re.findall`) to extract and group individual updates by their `<h3>` headers.
4. **Render**: The backend returns a structured JSON payload to the client, which dynamically renders the interactive cards, updates the stats, and enables local search/filtering.
