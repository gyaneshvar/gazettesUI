# 📊 Gazette Explorer Dashboard (gazettesUI)

The **Gazette Explorer** is a modern, high-performance dashboard designed to visualize regulatory changes in Indian government eGazettes. It transforms complex, bilingual PDF data into an intuitive interactive timeline.

---

## 🚀 Key Features

- **Interactive Timeline**: View how product specifications (e.g., Nitrogen, Moisture, Composition) change across different gazette releases.
- **Smart Diff Engine**: Automatically calculates and highlights increases (↑) or decreases (↓) in values compared to the previous gazette.
- **Deep-Linking**: Supports `?product=` URL parameters. Clicking an automated email link will instantly select the relevant product and load its historical timeline.
- **Responsive Glassmorphism UI**: A premium, dark-mode interface built with React, Vite, and Vanilla CSS.

---

## 🛠️ Getting Started

### Local Development
1. Navigate to the UI directory:
   ```bash
   cd gazettesUI
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173/gazettesUI/](http://localhost:5173/gazettesUI/) in your browser.

### Data Management
The dashboard loads its data from a centralized CSV file:
`public/data/master_seaweed_database.csv`

The **GazetteAgent** (backend) automatically updates this file daily via the GitHub REST API.

---

## 🚢 Deployment

This dashboard is configured for **Automated Continuous Deployment** via GitHub Actions.

- **Trigger**: Every push to the `main` branch.
- **Workflow**: `.github/workflows/deploy.yml`
- **Host**: Deployed to **GitHub Pages**.
- **Live URL**: `https://gyaneshvar.github.io/gazettesUI/`

---

## 🔒 Configuration

- **Vite Base Path**: Configured as `/gazettesUI/` to ensure assets load correctly on GitHub Pages subpaths.
- **Public Directory**: Contains the favicon and the primary CSV database.
