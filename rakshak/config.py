# Rakshak AI Configuration

MODEL_POTHOLE_PATH = "models/best.pt"  # Updated to the latest fine-tuned model from train4
MODEL_GENERAL_PATH = "models/yolo26n.pt"

ANIMAL_CLASSES = ["dog"]
COOLDOWN_FRAMES = 30  # Number of frames to wait before re-alerting the same type

# Detection Thresholds
POTHOLE_CONF_THRESHOLD = 0.15  # Extremely low for maximum capture
OVERLAP_THRESHOLD = 0.3       # More permissive overlap with other objects
MIN_POTHOLE_AREA = 10         # Minimal area to catch even the smallest distant holes
MAX_ASPECT_RATIO = 12.0       # Very high to catch long cracks/flat perspectives
BRIGHTNESS_THRESHOLD = 255    # Completely disabled to catch reflective/wet potholes
