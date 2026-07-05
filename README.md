<div align="center">

# 🎥 Video Duration Calculator

### Fast, privacy-first video duration calculation using a custom MP4 binary parser, browser metadata, and an optional AI fallback.

<p>
  <a href="https://github.com/lab1207/Video-Duration-Calculator">
    
  </a>
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini-AI-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</p>

<p>

Fast • Browser-Based • Privacy First • Open Source

</p>

<p>

<a href="#-features">Features</a> •
<a href="#-preview">Preview</a> •
<a href="#-how-it-works">How it Works</a> •
<a href="#-installation">Installation</a> •
<a href="#-privacy">Privacy</a>

</p>

</div>

---

# 📸 Preview

<img width="1915" height="903" alt="demo dashbaord" src="https://github.com/user-attachments/assets/2bca10b9-b594-4e30-b37b-609aa00f53f4" />


<p align="center">

<img src="./preview.gif" width="100%"/>

</p>

---

# ✨ Features

| Feature | Description |
|---------|-------------|
| ⚡ Fast MP4 Binary Parser | Reads MP4 metadata directly without decoding the video. |
| 📁 Batch Processing | Process multiple videos with drag & drop support. |
| 🎬 Multi-stage Detection | Binary parser → Browser Metadata → AI Fallback. |
| 📊 Duration Statistics | Calculate total and average duration instantly. |
| 🤖 Optional AI Fallback | Uses Gemini only when local detection fails. |
| 🔒 Privacy First | Files remain on your device whenever possible. |
| 💻 Browser Based | No installation required. |

---

## Why?

Most online video duration calculators require uploading videos to a server.

This project processes videos locally whenever possible using a custom MP4 binary parser.

This makes duration detection significantly faster while keeping your videos private.

---

# 🚀 How it Works

The application follows a three-stage detection pipeline.

```text
       [ Upload Video Files ]
                 │
                 ▼
    ┌─────────────────────────┐
    │  1. Binary MP4 Parser   │ ──(Success)──► [ Display Results ✅ ]
    └─────────────────────────┘
                 │
             (Failed)
                 │
                 ▼
    ┌─────────────────────────┐
    │ 2. HTML5 Metadata API   │ ──(Success)──► [ Display Results ✅ ]
    └─────────────────────────┘
                 │
             (Failed)
                 │
                 ▼
    ┌─────────────────────────┐
    │ 3. Gemini AI Fallback   │ ──(Success)──► [ Display Results ✅ ]
    └─────────────────────────┘
```

The majority of MP4 files are processed locally using the custom binary parser, making the application extremely fast while keeping videos on your device.

---

# 🛠 Technology Stack

| Category | Technologies |
|----------|--------------|
| Frontend | React |
| Language | TypeScript |
| Build Tool | Vite |
| Local Processing | HTML5 Video API |
| Binary Parsing | Custom MP4 Parser |
| AI (Optional) | Google Gemini |

---

# 📂 Project Structure

```text
src/
│
├── components/
│
├── utils/
│   ├── mp4Parser.ts
│   ├── videoProcessor.ts
│   └── timeFormatter.ts
│
├── types.ts
├── App.tsx
└── main.tsx
```

---

# 📦 Installation

Clone the repository

```bash
git clone https://github.com/lab1207/Video-Duration-Calculator.git
```

Enter the project

```bash
cd Video-Duration-Calculator
```

Install dependencies

```bash
npm install
```

Create a `.env` file

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

> Get your free API key from Google AI Studio:
>
> https://aistudio.google.com/app/apikey

Run the development server

```bash
npm run dev
```

Build for production

```bash
npm run build
```

Preview production build

```bash
npm run preview
```

---

# 🔑 Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `GEMINI_API_KEY` | Optional | Enables the AI fallback used only when local video duration detection fails. |

---

# 🔒 Privacy

This application is designed to process videos locally whenever possible.

Processing order:

1. Custom MP4 Binary Parser
2. Browser Metadata
3. Google Gemini AI (Optional)

If you do not provide a `GEMINI_API_KEY`, the application will continue working normally for supported video formats. Only the optional AI fallback will be unavailable.

---

# 🌍 Browser Support

- ✅ Chrome
- ✅ Edge
- ✅ Firefox
- ✅ Safari

---

# 🗺 Roadmap

- [ ] Folder Upload
- [ ] Recursive Directory Scanning
- [ ] Parallel Processing Queue
- [ ] CSV Export
- [ ] Excel Export
- [ ] JSON Export
- [ ] Additional Video Format Support
- [ ] Progress Indicators
- [ ] Offline Mode (PWA)
- [ ] File Search & Filtering

---

# 🤝 Contributing

Contributions, issues, and feature requests are welcome.

Feel free to open an issue or submit a pull request.

---

# 📄 License

This project is licensed under the MIT License.

