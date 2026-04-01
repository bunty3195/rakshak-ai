from ultralytics import YOLO

def load_model(path="models/best.pt"):
    return YOLO(path)