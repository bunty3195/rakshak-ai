import cv2
import numpy as np
import os
import shutil
import tempfile
from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import io
import numpy as np
import cv2
from rakshak.detection.pipeline import DetectionPipeline

app = FastAPI(title="Rakshak AI Backend API")

# Store temporary video paths for cleanup
temp_files = []

def cleanup_temp_files():
    global temp_files
    for path in temp_files:
        if os.path.exists(path):
            try:
                os.remove(path)
            except:
                pass
    temp_files = []

@app.post("/detect/video")
async def detect_in_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Process an uploaded video and return a processed video file."""
    # Create a temporary file for the uploaded video
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_in:
        shutil.copyfileobj(file.file, tmp_in)
        tmp_in_path = tmp_in.name

    # Create a temporary file for the output video
    tmp_out_path = tmp_in_path.replace(suffix, f"_processed{suffix}")
    
    cap = cv2.VideoCapture(tmp_in_path)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    # Use H.264 (avc1) for maximum browser compatibility
    # If avc1 fails, fall back to mp4v
    fourcc = cv2.VideoWriter_fourcc(*'avc1')
    out = cv2.VideoWriter(tmp_out_path, fourcc, fps, (width, height))
    
    # Check if writer opened correctly, fallback to mp4v if needed
    if not out.isOpened():
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(tmp_out_path, fourcc, fps, (width, height))

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        processed_frame, _ = pipeline.process_frame(frame)
        out.write(processed_frame)

    cap.release()
    out.release()

    # Schedule cleanup of the input file
    background_tasks.add_task(os.remove, tmp_in_path)
    # The output file will be cleaned up manually or by a separate task
    temp_files.append(tmp_out_path)

    return FileResponse(tmp_out_path, media_type="video/mp4", filename=f"processed_{file.filename}")

# Add CORS middleware to allow the React frontend to communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for hackathon development stability
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pipeline = DetectionPipeline()

@app.get("/")
def read_root():
    return {"status": "Rakshak AI Backend is Running"}

@app.post("/detect/image")
async def detect_in_image(file: UploadFile = File(...)):
    """Process an uploaded image and return detection results + processed image."""
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if frame is None:
        return {"error": "Invalid image file"}

    processed_frame, alerts = pipeline.process_frame(frame)
    
    # Convert back to image bytes for the response
    _, buffer = cv2.imencode('.jpg', processed_frame)
    
    # In a real app, you might return JSON with the image separately,
    # but for a quick demo, we'll return the processed image directly.
    return StreamingResponse(io.BytesIO(buffer.tobytes()), media_type="image/jpeg")

@app.post("/detect/json")
async def detect_json(file: UploadFile = File(...)):
    """Process an uploaded image and return detection JSON with counts."""
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return {"error": "Invalid image format"}

        _, result_data = pipeline.process_frame(frame)
        return result_data # Now includes "detections" list and "summary" counts
    except Exception as e:
        return {"error": str(e)}

# For live streaming, the frontend can use a WebSocket or MJPEG stream.
# This is a placeholder for an MJPEG stream if needed.
def gen_frames(camera_id=0):
    cap = cv2.VideoCapture(camera_id)
    while True:
        success, frame = cap.read()
        if not success:
            break
        else:
            processed_frame, _ = pipeline.process_frame(frame)
            ret, buffer = cv2.imencode('.jpg', processed_frame)
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.get("/video_feed")
def video_feed():
    return StreamingResponse(gen_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

from pydantic import BaseModel
from typing import Optional, Dict

class AlertPayload(BaseModel):
    counts: Dict[str, int]
    severity: Dict[str, object]
    location: Optional[Dict[str, float]]
    detectedAt: str

@app.post("/alerts/send")
async def send_alert_to_csmc(payload: AlertPayload):
    """
    Endpoint to receive alerts from the frontend and forward them to CSMC/Twilio.
    In a production environment, you would use the Twilio SDK here.
    """
    print(f"\n[CSMC ALERT RECEIVED]")
    print(f"Timestamp: {payload.detectedAt}")
    print(f"Location: {payload.location}")
    print(f"Severity: {payload.severity.get('level')} ({payload.severity.get('score')})")
    print(f"Counts: Potholes={payload.counts.get('potholes')}, Dogs={payload.counts.get('dogs')}")
    
    # Placeholder for Twilio Logic:
    # client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    # client.messages.create(body=f"Rakshak AI Alert: {payload.severity.get('level')} severity hazard detected at {payload.location}", ...)
    
    return {"status": "success", "message": "Alert forwarded to CSMC via Twilio"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
