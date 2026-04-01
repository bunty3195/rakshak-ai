# Rakshak AI Configuration

MODEL_POTHOLE_PATH = "models/best.pt"  # Updated to the latest fine-tuned model from train4
MODEL_GENERAL_PATH = "models/yolo26n.pt"

ANIMAL_CLASSES = ["dog"]
COOLDOWN_FRAMES = 30  # Number of frames to wait before re-alerting the same type

# Detection Thresholds
POTHOLE_CONF_THRESHOLD = 0.4  # Lowered for better sensitivity
OVERLAP_THRESHOLD = 0.1       # Slightly more permissive overlap
MIN_POTHOLE_AREA = 200        # Lowered to detect smaller potholes
MAX_ASPECT_RATIO = 4.0        # Increased for better coverage
BRIGHTNESS_THRESHOLD = 200    # Increased to allow more diverse lighting
