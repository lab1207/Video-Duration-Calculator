# 🎥 Video Duration Calculator

A fast, privacy-first web application that calculates the duration of multiple video files directly in your browser.

Unlike traditional video tools, this application reads video metadata without uploading files to a server whenever possible, making it fast, secure, and suitable for large collections of videos.

---

## ✨ Features

- ⚡ Fast MP4 metadata parsing
- 📁 Drag & Drop multiple video files
- 🎬 Supports batch processing
- 📊 Displays individual video durations
- ⏱ Calculates total duration
- 📈 Calculates average duration
- 🔒 Privacy-first processing
- 💻 Runs entirely in your browser
- 📱 Responsive modern interface
- 🤖 AI-assisted fallback for unsupported files

---

## 🚀 How It Works

The application follows a multi-step processing pipeline to obtain video durations as efficiently as possible.

```text
Upload Videos
      │
      ▼
Binary MP4 Parser
      │
      ├── Success ✅
      │
      └── Failed
            │
            ▼
Browser Metadata Extraction
            │
            ├── Success ✅
            │
            └── Failed
                  │
                  ▼
AI Fallback
```

Most MP4 files are processed instantly by reading metadata directly from the file without decoding the entire video.

---

## 🛠 Technology Stack

- React
- TypeScript
- Vite
- HTML5 Video API
- Custom MP4 Binary Parser
- Google Gemini AI (Fallback)

---

## 📂 Project Structure

```text
src/
│
├── components/
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

## ⚡ Processing Strategy

The application attempts to determine video duration using the following methods:

### 1. Binary MP4 Parsing

Reads MP4 metadata directly from the file.

Advantages:

- Extremely fast
- No video decoding
- Minimal memory usage

---

### 2. Browser Metadata

If binary parsing fails, the browser loads the video's metadata using the HTML5 Video API.

Advantages:

- Supports additional formats
- Accurate duration information

---

### 3. AI Fallback

If neither method succeeds, an optional AI fallback attempts to determine the duration.

> **Note**
>
> AI functionality requires a valid Gemini API key.

---

## 🔒 Privacy

Files are processed locally in your browser whenever possible.

Videos are only sent to the AI provider if the AI fallback is enabled and local processing cannot determine the duration.

---

## 📦 Installation

### 1. Clone the repository

```bash
git clone https://github.com/USERNAME/Video-Duration-Calculator.git
cd Video-Duration-Calculator
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create an environment file

Create a `.env` file in the project root and add your Google Gemini API key.

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

> You can obtain a free Gemini API key from Google AI Studio:
> https://aistudio.google.com/app/apikey

### 4. Start the development server

```bash
npm run dev
```

### 5. Build for production

```bash
npm run build
```

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `GEMINI_API_KEY` | Optional | Google Gemini API key used only for the AI fallback when local video duration detection cannot determine the duration. |

---

## 🤖 AI Fallback

The application is designed to determine video durations locally whenever possible.

Processing order:

1. MP4 Binary Parser
2. Browser Metadata
3. Google Gemini AI (Optional)

The AI fallback is **only used if both local methods fail**.

If you don't provide a `GEMINI_API_KEY`, the application will continue working normally for supported video formats. Only the optional AI fallback will be unavailable.

Preview production build

```bash
npm run preview
```

---

## 🌐 Browser Support

- Chrome
- Edge
- Firefox
- Safari

---

## 📈 Future Improvements

- Folder upload
- Recursive directory scanning
- Parallel processing queue
- Export results to CSV
- Export results to Excel
- Export results to JSON
- Additional video format support
- Progress indicators
- Offline mode
- Duration filters
- File search

---

## 🤝 Contributing

Contributions are welcome.

Feel free to submit issues, feature requests, or pull requests to help improve the project.

---

## 📄 License

This project is licensed under the MIT License.

---

## ⭐ Support

If you found this project useful, consider giving it a ⭐ on GitHub.
