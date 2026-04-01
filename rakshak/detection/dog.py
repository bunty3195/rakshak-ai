from ultralytics import YOLO
from rakshak.config import MODEL_GENERAL_PATH, ANIMAL_CLASSES

class DogDetector:
    def __init__(self):
        self.model = YOLO(MODEL_GENERAL_PATH)

    def detect(self, frame):
        """Detect specific animals (dog) using the general model."""
        results = self.model(frame, verbose=False)[0]
        detections = []
        
        # Map class index to name
        class_names = self.model.names
        
        for box in results.boxes:
            cls_idx = int(box.cls[0])
            label = class_names[cls_idx]
            
            if label in ANIMAL_CLASSES:
                conf = float(box.conf[0])
                xyxy = box.xyxy[0].tolist()
                detections.append({
                    "type": label,
                    "confidence": conf,
                    "bbox": xyxy,
                    "model": "dog_detector"
                })
        return detections
