"""
YOLOv8 Training Script using Ultralytics
=========================================
This script trains a YOLOv8 model on a custom dataset for object detection.

Folder Structure Required:
dataset/
├── images/
│   ├── train/    # Training images (.jpg, .png, etc.)
│   └── val/      # Validation images
├── labels/
│   ├── train/    # Training labels (.txt files in YOLO format)
│   └── val/      # Validation labels
└── data.yaml     # Dataset configuration file

Label Format (YOLO):
Each .txt file should have one line per object:
<class_id> <x_center> <y_center> <width> <height>
All values are normalized (0-1) relative to image dimensions.
"""

from ultralytics import YOLO
import os

# ============================================================
# STEP 1: Configuration
# ============================================================

# Path to your dataset configuration file
DATA_YAML = "dataset/data.yaml"

# Pretrained model to use as starting point
# Options: yolov8n.pt (nano), yolov8s.pt (small), yolov8m.pt (medium), 
#          yolov8l.pt (large), yolov8x.pt (extra-large)
PRETRAINED_MODEL = "yolov8n.pt"

# Training hyperparameters
EPOCHS = 50           # Number of training epochs
IMG_SIZE = 640        # Image size for training (square)
BATCH_SIZE = 8        # Batch size (reduced for CPU training)
DEVICE = "cpu"        # GPU device (0, 1, 2...) or 'cpu'

# Output directory for training results
PROJECT = "runs/train"
NAME = "monument_protection"

# ============================================================
# STEP 2: Create data.yaml if it doesn't exist (example)
# ============================================================

def create_example_data_yaml():
    """
    Creates an example data.yaml configuration file.
    Modify the class names and paths according to your dataset.
    """
    data_yaml_content = """# YOLOv8 Dataset Configuration
# Path to dataset root (can be absolute or relative)
path: dataset

# Paths to train and val images (relative to 'path')
train: images/train
val: images/val

# Number of classes
nc: 5

# Class names (modify according to your dataset)
names:
  0: person
  1: vandal
  2: fire
  3: crowd
  4: weapon
"""
    
    os.makedirs("dataset", exist_ok=True)
    os.makedirs("dataset/images/train", exist_ok=True)
    os.makedirs("dataset/images/val", exist_ok=True)
    os.makedirs("dataset/labels/train", exist_ok=True)
    os.makedirs("dataset/labels/val", exist_ok=True)
    
    yaml_path = "dataset/data.yaml"
    if not os.path.exists(yaml_path):
        with open(yaml_path, "w") as f:
            f.write(data_yaml_content)
        print(f"✅ Created example data.yaml at: {yaml_path}")
        print("   Please modify it according to your dataset!")
    else:
        print(f"📁 data.yaml already exists at: {yaml_path}")


# ============================================================
# STEP 3: Train the Model
# ============================================================

def train_model():
    """
    Trains the YOLOv8 model on the custom dataset.
    Returns the training results.
    """
    print("\n" + "="*60)
    print("🚀 STARTING YOLOV8 TRAINING")
    print("="*60)
    
    # Load the pretrained YOLOv8 model
    # This downloads the weights if not already present
    print(f"\n📥 Loading pretrained model: {PRETRAINED_MODEL}")
    model = YOLO(PRETRAINED_MODEL)
    
    # Start training
    print(f"\n🏋️ Training for {EPOCHS} epochs...")
    print(f"   Image size: {IMG_SIZE}x{IMG_SIZE}")
    print(f"   Batch size: {BATCH_SIZE}")
    print(f"   Dataset: {DATA_YAML}")
    
    results = model.train(
        data=DATA_YAML,           # Path to data.yaml
        epochs=EPOCHS,            # Number of epochs
        imgsz=IMG_SIZE,           # Image size
        batch=BATCH_SIZE,         # Batch size
        device=DEVICE,            # GPU device
        project=PROJECT,          # Output project folder
        name=NAME,                # Experiment name
        patience=10,              # Early stopping patience
        save=True,                # Save checkpoints
        save_period=10,           # Save checkpoint every N epochs
        plots=True,               # Generate training plots
        verbose=True,             # Verbose output
        pretrained=True,          # Use pretrained weights
        optimizer="auto",         # Optimizer (SGD, Adam, AdamW, auto)
        lr0=0.01,                 # Initial learning rate
        lrf=0.01,                 # Final learning rate factor
        momentum=0.937,           # SGD momentum
        weight_decay=0.0005,      # Weight decay
        warmup_epochs=3,          # Warmup epochs
        warmup_momentum=0.8,      # Warmup momentum
        box=7.5,                  # Box loss gain
        cls=0.5,                  # Class loss gain
        hsv_h=0.015,              # HSV-Hue augmentation
        hsv_s=0.7,                # HSV-Saturation augmentation
        hsv_v=0.4,                # HSV-Value augmentation
        degrees=0.0,              # Rotation augmentation
        translate=0.1,            # Translation augmentation
        scale=0.5,                # Scale augmentation
        shear=0.0,                # Shear augmentation
        flipud=0.0,               # Flip up-down probability
        fliplr=0.5,               # Flip left-right probability
        mosaic=1.0,               # Mosaic augmentation
        mixup=0.0,                # Mixup augmentation
    )
    
    print("\n" + "="*60)
    print("✅ TRAINING COMPLETE!")
    print("="*60)
    
    return model, results


# ============================================================
# STEP 4: Validate the Trained Model
# ============================================================

def validate_model(model):
    """
    Validates the trained model on the validation set.
    """
    print("\n" + "="*60)
    print("📊 VALIDATING MODEL")
    print("="*60)
    
    # Run validation
    metrics = model.val(
        data=DATA_YAML,
        imgsz=IMG_SIZE,
        batch=BATCH_SIZE,
        device=DEVICE,
        plots=True,
        verbose=True,
    )
    
    # Print validation metrics
    print("\n📈 Validation Metrics:")
    print(f"   mAP50:      {metrics.box.map50:.4f}")      # mAP at IoU 0.50
    print(f"   mAP50-95:   {metrics.box.map:.4f}")        # mAP at IoU 0.50-0.95
    print(f"   Precision:  {metrics.box.mp:.4f}")         # Mean precision
    print(f"   Recall:     {metrics.box.mr:.4f}")         # Mean recall
    
    return metrics


# ============================================================
# STEP 5: Run Inference on Test Images
# ============================================================

def predict_on_image(model, image_path, save_dir="runs/predict"):
    """
    Runs inference on a single image or directory of images.
    
    Args:
        model: Trained YOLO model
        image_path: Path to image or directory
        save_dir: Directory to save results
    """
    print("\n" + "="*60)
    print("🔍 RUNNING PREDICTION")
    print("="*60)
    
    if not os.path.exists(image_path):
        print(f"❌ Image not found: {image_path}")
        return None
    
    print(f"   Input: {image_path}")
    
    # Run prediction
    results = model.predict(
        source=image_path,        # Image/video/directory path
        imgsz=IMG_SIZE,           # Inference image size
        conf=0.25,                # Confidence threshold
        iou=0.45,                 # NMS IoU threshold
        device=DEVICE,            # Device
        save=True,                # Save annotated images
        save_txt=True,            # Save results as .txt
        save_conf=True,           # Save confidence scores
        project=save_dir,         # Output directory
        name="results",           # Experiment name
        exist_ok=True,            # Overwrite existing
        visualize=False,          # Visualize features
        line_width=2,             # Bounding box line width
        show_labels=True,         # Show class labels
        show_conf=True,           # Show confidence scores
    )
    
    # Process results
    for i, result in enumerate(results):
        print(f"\n   Image {i+1}: {result.path}")
        print(f"   Detections: {len(result.boxes)}")
        
        # Print each detection
        for box in result.boxes:
            cls_id = int(box.cls[0])
            cls_name = result.names[cls_id]
            conf = float(box.conf[0])
            xyxy = box.xyxy[0].tolist()
            print(f"      - {cls_name}: {conf:.2%} at [{xyxy[0]:.0f}, {xyxy[1]:.0f}, {xyxy[2]:.0f}, {xyxy[3]:.0f}]")
    
    print(f"\n   Results saved to: {save_dir}/results")
    
    return results


# ============================================================
# STEP 6: Export Model to Different Formats
# ============================================================

def export_model(model, format="onnx"):
    """
    Exports the trained model to different formats.
    
    Supported formats:
        - onnx: ONNX format (recommended for deployment)
        - torchscript: TorchScript
        - openvino: OpenVINO
        - engine: TensorRT
        - coreml: CoreML (iOS)
        - tflite: TensorFlow Lite
    """
    print("\n" + "="*60)
    print(f"📦 EXPORTING MODEL TO {format.upper()}")
    print("="*60)
    
    exported_path = model.export(
        format=format,
        imgsz=IMG_SIZE,
        half=False,               # Use FP16 (GPU only)
        dynamic=False,            # Dynamic input shapes
        simplify=True,            # Simplify ONNX model
        opset=12,                 # ONNX opset version
    )
    
    print(f"   Exported to: {exported_path}")
    
    return exported_path


# ============================================================
# STEP 7: Load Best Weights and Use for Inference
# ============================================================

def load_best_model():
    """
    Loads the best trained model from the runs directory.
    """
    best_weights = f"{PROJECT}/{NAME}/weights/best.pt"
    
    if os.path.exists(best_weights):
        print(f"\n📥 Loading best weights: {best_weights}")
        model = YOLO(best_weights)
        return model
    else:
        print(f"❌ Best weights not found at: {best_weights}")
        print("   Make sure training has completed successfully.")
        return None


# ============================================================
# MAIN EXECUTION
# ============================================================

if __name__ == "__main__":
    # Create example data.yaml structure
    create_example_data_yaml()
    
    # Check if dataset exists
    if not os.path.exists(DATA_YAML):
        print("\n❌ Dataset not found!")
        print("   Please add your images and labels to the dataset folder.")
        print("   Then update data.yaml with your class names.")
        exit(1)
    
    # Train the model
    model, results = train_model()
    
    # Validate the model
    validate_model(model)
    
    # Print where the best model is saved
    best_path = f"{PROJECT}/{NAME}/weights/best.pt"
    last_path = f"{PROJECT}/{NAME}/weights/last.pt"
    print(f"\n📂 Model Weights Saved:")
    print(f"   Best: {best_path}")
    print(f"   Last: {last_path}")
    
    # Example: Run prediction on a test image
    # Uncomment and modify the path to test:
    # test_image = "dataset/images/val/test_image.jpg"
    # predict_on_image(model, test_image)
    
    # Example: Export model to ONNX
    # export_model(model, format="onnx")
    
    print("\n" + "="*60)
    print("🎉 ALL DONE!")
    print("="*60)
    print("\nNext steps:")
    print("1. Check training results in: runs/train/monument_protection/")
    print("2. Use best.pt for inference in your application")
    print("3. View training plots: results.png, confusion_matrix.png")
    print("\nTo use the trained model:")
    print("   from ultralytics import YOLO")
    print(f"   model = YOLO('{best_path}')")
    print("   results = model.predict('your_image.jpg')")
