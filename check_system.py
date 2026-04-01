import cv2
from rakshak.detection.pipeline import DetectionPipeline

def test_system():
    pipeline = DetectionPipeline()
    # Test on pothole.jpg
    img_path = "pothole.jpg"
    frame = cv2.imread(img_path)
    if frame is None:
        print(f"Error: Could not find {img_path}")
    else:
        processed_frame, alerts = pipeline.process_frame(frame)
        print("Pothole Detections:", alerts)
        cv2.imwrite("debug_pothole.jpg", processed_frame)
        print("Debug image saved as debug_pothole.jpg")

    # Test on dog.jpeg
    img_path = "dog.jpeg"
    frame = cv2.imread(img_path)
    if frame is None:
        print(f"Error: Could not find {img_path}")
    else:
        processed_frame, alerts = pipeline.process_frame(frame)
        print("Dog Detections:", alerts)
        cv2.imwrite("debug_dog.jpg", processed_frame)
        print("Debug image saved as debug_dog.jpg")

if __name__ == "__main__":
    test_system()
