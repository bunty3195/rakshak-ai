import cv2
from main import load_models, process_frame

def test_on_image(image_path):
    load_models()
    frame = cv2.imread(image_path)
    if frame is None:
        print(f"Error: Could not load image {image_path}")
        return
    
    processed_frame, alerts = process_frame(frame)
    
    output_path = "test_result.jpg"
    cv2.imwrite(output_path, processed_frame)
    print(f"Processed image saved to {output_path}")
    print(f"Alerts generated: {alerts}")

if __name__ == "__main__":
    test_on_image("cow.jpg")
