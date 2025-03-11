# Radiology Transcription Assistant

A web application to assist with radiology report transcription. This app listens to the microphone, transcribes speech in real-time, and processes the transcription using Gemini AI to create structured, professional radiology reports.

## Features

- Real-time speech-to-text transcription using Whisper API
- LLM processing with Google's Gemini API to format and structure reports
- Template-based report generation
- Modern, responsive UI built with React and Material UI
- WebSocket connection for real-time updates

## Project Structure

```
Rad_transcription/
├── backend/               # FastAPI backend
│   ├── main.py            # Main application file
│   ├── requirements.txt   # Python dependencies
│   └── .env.example       # Environment variables template
├── frontend/              # React frontend
│   ├── src/               # Source code
│   │   ├── components/    # React components
│   │   ├── App.js         # Main application component
│   │   └── ...            # Other React files
│   └── package.json       # Node.js dependencies
└── templates/             # Report templates
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Create a `.env` file based on `.env.example` and add your API keys:
   ```
   cp .env.example .env
   ```
   Then edit the `.env` file to add your Gemini API key and Replicate API token.

5. Start the backend server:
   ```
   uvicorn main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

## API Keys Required

- **Gemini API Key**: Get from [Google AI Studio](https://ai.google.dev/)
- **Replicate API Token**: Get from [Replicate](https://replicate.com/) for Whisper API access

## Usage

1. Open the application in your browser (typically at http://localhost:3000)
2. Click "Start Recording" to begin capturing audio
3. Speak clearly into your microphone
4. Click "Stop Recording" when finished
5. Select a template if desired
6. Click "Process with Gemini" to format the transcription
7. Copy or save the processed report

## Deployment

The application can be deployed to any hosting service that supports Node.js and Python applications. Consider services like Vercel, Netlify, or Railway for easy deployment.

## License

MIT
