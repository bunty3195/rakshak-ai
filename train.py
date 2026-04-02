from ultralytics import YOLO

# 1. Load your existing fine-tuned model (transfer learning)
# This is better than starting from scratch because it already knows what a pothole looks like!
model = YOLO('models/best.pt')

def start_training():
    # 2. Start fine-tuning
    # - data: path to your data.yaml from Roboflow
    # - epochs: how many times the AI "reads" the entire dataset (start with 50)
    # - imgsz: image size (640 is standard)
    # - batch: how many images to process at once (adjust based on your RAM/GPU)
    results = model.train(
        data='data_custom.yaml', 
        epochs=50, 
        imgsz=640, 
        batch=32,           # Higher batch size because your GPU has 8GB VRAM
        device=0,           # USE THE GPU!
        name='pothole_gpu_test'
    )
    print("Training Complete!")
    print("New model saved at: runs/detect/pothole_finetune/weights/best.pt")

if __name__ == "__main__":
    # Note: Make sure you have your dataset ready before running this
    print("Starting training with custom dataset...")
    start_training() 
