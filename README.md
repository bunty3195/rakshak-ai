# Rakshak AI: Road Hazard Detection System 🚧

Rakshak AI is a dual-model computer vision system designed for real-time road hazard detection, specifically focusing on **potholes** and **stray animals (dogs)**. It features a modular Python backend with a FastAPI gateway and a modern React-based frontend "Command Center."

## 🌟 Features

- **Dual-Model Inference**: 
  - Custom fine-tuned YOLOv8/v11 model for high-precision pothole detection.
  - General YOLOv8 model for stray animal (dog) detection.
- **Advanced False Positive Suppression**:
  - **Shadow Filtering**: Analyzes brightness and texture to ignore dark shadows.
  - **Dog-Skin Protection**: Automatically rejects "potholes" detected inside dog bounding boxes.
  - **Geometry Validation**: Filters by aspect ratio and minimum area.
- **Web Dashboard**: Modern UI with live MJPEG streaming, image/video upload analysis, and real-time hazard logs.
- **Smart Alerts**:
  - **Voice Alerts**: Real-time pluralized speech synthesis (e.g., "2 potholes and 1 dog detected").
  - **Severity Scoring**: Automatic hazard level calculation (Low/Medium/High).
  - **CSMC Integration**: Forward alerts with location data to Central System Monitoring via Twilio.

## 📁 Project Structure

```text
├── rakshak/                # Core Logic Package
│   ├── detection/          # specialized detectors & pipeline
│   ├── utils/              # Geometric & math utilities
│   └── config.py           # Central configuration & thresholds
├── models/                 # Model weights (.pt files)
├── app.py                  # FastAPI Backend Server
├── main.py                 # CLI / Local Demo Entry Point
└── requirements.txt        # Backend dependencies
```

## 🚀 Quick Start

### 1. Backend Setup
```bash
# Clone the repository
git clone https://github.com/your-repo/rakshak-ai.git
cd rakshak-ai

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install fastapi uvicorn pydantic
pip install opencv-python

# Start the API server
python app.py
```

### 2. Frontend Setup
The frontend uses a React + Vite stack.
```bash
cd frontend
npm install
npm run dev
```

## 🛠 Configuration
Adjust detection sensitivity in `rakshak/config.py`:
- `POTHOLE_CONF_THRESHOLD`: Sensitivity for potholes (default 0.4).
- `OVERLAP_THRESHOLD`: Aggression of dog-skin suppression.
- `BRIGHTNESS_THRESHOLD`: Threshold for shadow filtering.

## 📡 API Endpoints
- `GET /video_feed`: Real-time MJPEG stream.
- `POST /detect/json`: Upload image for count & coordinate summary.
- `POST /detect/video`: Upload video for full processing.
- `POST /alerts/send`: Forward hazard data to CSMC/Twilio.

## ⚖️ License
MIT License - Developed for Hackathon Demo purposes.
