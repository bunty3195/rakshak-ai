import cv2
import sys
from rakshak.detection.pipeline import DetectionPipeline

def main(source=0):
    """Main real-time processing loop."""
    print("[INFO] Initializing Rakshak AI Pipeline...")
    pipeline = DetectionPipeline()
    print("[INFO] System Ready.")

    is_image = isinstance(source, str) and source.lower().endswith(('.png', '.jpg', '.jpeg'))

    if is_image:
        frame = cv2.imread(source)
        if frame is None:
            print(f"[ERROR] Could not read image from source: {source}")
            return
        
        print(f"[INFO] Processing image: {source}...")
        processed_frame, _ = pipeline.process_frame(frame)
        cv2.imshow("Rakshak AI - Road Hazard Detection", processed_frame)
        print("[INFO] Detection complete. Press any key to exit.")
        cv2.waitKey(0)
        cv2.destroyAllWindows()
    else:
        # Handle potential webcam index as string
        if isinstance(source, str):
            try:
                source = int(source)
            except ValueError:
                pass # Keep as string for file path

        cap = cv2.VideoCapture(source)
        if not cap.isOpened():
            print(f"[ERROR] Could not open source: {source}")
            return

        print(f"[INFO] Starting Rakshak AI on {source}...")
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            processed_frame, _ = pipeline.process_frame(frame)
            
            cv2.imshow("Rakshak AI - Road Hazard Detection", processed_frame)
            
            # Press 'q' to quit
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
                
        cap.release()
        cv2.destroyAllWindows()
    
    print("[INFO] System stopped.")

if __name__ == "__main__":
    source_path = input("Upload image or video to detect pothole or dog (Leave blank for webcam): ").strip()
    main(source=source_path if source_path else 0)
