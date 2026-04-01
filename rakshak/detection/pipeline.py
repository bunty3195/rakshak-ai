import cv2
from rakshak.config import COOLDOWN_FRAMES, OVERLAP_THRESHOLD
from rakshak.utils.geometry import calculate_overlap
from rakshak.detection.pothole import PotholeDetector
from rakshak.detection.dog import DogDetector

class DetectionPipeline:
    def __init__(self):
        self.pothole_detector = PotholeDetector()
        self.dog_detector = DogDetector()
        self.alert_cooldowns = {
            "pothole": 0,
            "dog": 0
        }

    def process_frame(self, frame):
        """Run detection pipeline with aggressive false positive suppression."""
        pothole_detections = self.pothole_detector.detect(frame)
        animal_detections = self.dog_detector.detect(frame)
        
        # Aggressive filtering: potholes overlapping with dogs are discarded
        filtered_potholes = []
        for p_det in pothole_detections:
            is_false_positive = False
            for a_det in animal_detections:
                if a_det["type"] == "dog":
                    overlap = calculate_overlap(p_det["bbox"], a_det["bbox"])
                    if overlap > OVERLAP_THRESHOLD:
                        is_false_positive = True
                        break
            if not is_false_positive:
                filtered_potholes.append(p_det)

        combined_detections = filtered_potholes + animal_detections
        alerts = []
        
        # Aggregate counts for the summary alert
        pothole_count = len(filtered_potholes)
        dog_count = sum(1 for d in animal_detections if d["type"] == "dog")

        for det in combined_detections:
            det_type = det["type"]
            det_model = det["model"]
            
            # Determine display label
            display_label = "RakshakAI_PH" if det_type == "pothole" else "RakshakAI_Dog"
            
            # Add to alerts list for frontend
            alerts.append({
                "type": det_type,
                "confidence": det["confidence"],
                "model": det_model,
                "bbox": det["bbox"]
            })

            # Console Alert with cooldown
            if det_type in self.alert_cooldowns and self.alert_cooldowns[det_type] == 0:
                self.alert_cooldowns[det_type] = COOLDOWN_FRAMES
                print(f"[ALERT] {display_label} detected by {det_model} with {det['confidence']:.2f} confidence!")
            
            # Draw bounding boxes
            x1, y1, x2, y2 = map(int, det["bbox"])
            color = (0, 0, 255) if det_type == "pothole" else (0, 255, 255) # Red for pothole, Yellow for animals
            label = f"{display_label} ({det_model}) {det['confidence']:.2f}"
            
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        # Update cooldowns
        for key in self.alert_cooldowns:
            if self.alert_cooldowns[key] > 0:
                self.alert_cooldowns[key] -= 1
                
        # Return summary counts along with frame and detailed alerts
        summary = {
            "potholes": pothole_count,
            "dogs": dog_count,
            "total": pothole_count + dog_count
        }
        return frame, {"detections": alerts, "summary": summary}
