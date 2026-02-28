"""
Prepare Dataset Script
Copies images from 'image' folder to dataset structure and creates placeholder labels.
"""

import os
import shutil
import random
from pathlib import Path

# Source and destination paths
SOURCE_DIR = "image"
DATASET_DIR = "dataset"
TRAIN_SPLIT = 0.8  # 80% train, 20% val

def prepare_dataset():
    # Get all images from source
    source_path = Path(SOURCE_DIR)
    if not source_path.exists():
        print(f"❌ Source folder '{SOURCE_DIR}' not found!")
        return
    
    # Supported image formats
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.webp', '.tiff', '.tif'}
    
    # Get all image files
    images = [f for f in source_path.iterdir() 
              if f.suffix.lower() in image_extensions]
    
    if not images:
        print(f"❌ No images found in '{SOURCE_DIR}'!")
        return
    
    print(f"📁 Found {len(images)} images in '{SOURCE_DIR}'")
    
    # Shuffle images for random split
    random.shuffle(images)
    
    # Split into train and val
    split_idx = int(len(images) * TRAIN_SPLIT)
    train_images = images[:split_idx]
    val_images = images[split_idx:]
    
    print(f"   Training: {len(train_images)} images")
    print(f"   Validation: {len(val_images)} images")
    
    # Create directories
    train_img_dir = Path(DATASET_DIR) / "images" / "train"
    val_img_dir = Path(DATASET_DIR) / "images" / "val"
    train_lbl_dir = Path(DATASET_DIR) / "labels" / "train"
    val_lbl_dir = Path(DATASET_DIR) / "labels" / "val"
    
    for d in [train_img_dir, val_img_dir, train_lbl_dir, val_lbl_dir]:
        d.mkdir(parents=True, exist_ok=True)
    
    def safe_filename(name, idx):
        """Create a safe filename without spaces"""
        ext = name.suffix.lower()
        return f"img_{idx:04d}{ext}"
    
    def copy_images(image_list, img_dir, lbl_dir, start_idx=0):
        """Copy images and create empty label files"""
        for i, img_path in enumerate(image_list):
            # Create safe filename
            new_name = safe_filename(img_path, start_idx + i)
            new_img_path = img_dir / new_name
            
            # Copy image
            shutil.copy2(img_path, new_img_path)
            
            # Create empty label file (same name, .txt extension)
            label_name = new_name.rsplit('.', 1)[0] + '.txt'
            label_path = lbl_dir / label_name
            
            # Create empty label file (no annotations yet)
            label_path.touch()
            
            print(f"   ✓ {img_path.name} -> {new_name}")
    
    print("\n📦 Copying training images...")
    copy_images(train_images, train_img_dir, train_lbl_dir)
    
    print("\n📦 Copying validation images...")
    copy_images(val_images, val_img_dir, val_lbl_dir, start_idx=len(train_images))
    
    print("\n" + "="*60)
    print("✅ Dataset preparation complete!")
    print("="*60)
    print(f"\nFolder structure:")
    print(f"  dataset/images/train/ - {len(train_images)} images")
    print(f"  dataset/images/val/   - {len(val_images)} images")
    print(f"  dataset/labels/train/ - {len(train_images)} labels (empty)")
    print(f"  dataset/labels/val/   - {len(val_images)} labels (empty)")
    print("\n⚠️  Note: Label files are empty. For actual training, you need to:")
    print("   1. Use a labeling tool (LabelImg, Roboflow, CVAT) to annotate")
    print("   2. Or use auto-labeling with a pretrained model")
    print("\n💡 For quick testing without labels, the model will still run")
    print("   but won't learn meaningful detections.")

if __name__ == "__main__":
    prepare_dataset()
