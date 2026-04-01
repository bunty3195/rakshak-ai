import cv2
from ultralytics import YOLO
from rakshak.config import (
    MODEL_POTHOLE_PATH, 
    POTHOLE_CONF_THRESHOLD, 
    MIN_POTHOLE_AREA, 
    MAX_ASPECT_RATIO, 
    BRIGHTNESS_THRESHOLD
)

class PotholeDetector:
    def __init__(self):
        self.model = YOLO(MODEL_POTHOLE_PATH)

    def detect(self, frame):
        """Detect potholes using the custom model with strict filtering."""
        results = self.model(frame, verbose=False, conf=POTHOLE_CONF_THRESHOLD)[0]
        detections = []
        
        for box in results.boxes:
            conf = float(box.conf[0])
            xyxy = box.xyxy[0].tolist()
            x1, y1, x2, y2 = xyxy
            
            # 1. Size filtering
            w, h = x2 - x1, y2 - y1
            area = w * h
            if area < MIN_POTHOLE_AREA:
                continue
                
            # 2. Aspect Ratio filtering
            aspect_ratio = max(w/h, h/w)
            if aspect_ratio > MAX_ASPECT_RATIO:
                continue
                
            # 3. Brightness check
            roi = frame[int(y1):int(y2), int(x1):int(x2)]
            if roi.size > 0:
                gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
                if gray_roi.mean() > BRIGHTNESS_THRESHOLD:
                    continue

            detections.append({
                "type": "pothole",
                "confidence": conf,
                "bbox": xyxy,
                "model": "Pothole-Model"
            })
        return detections
