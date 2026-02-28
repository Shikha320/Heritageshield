"""
YOLOv8 Object Detection Script
================================
Detect objects in an image using a pretrained YOLOv8 model (Ultralytics).

Installation:
    pip install ultralytics opencv-python

Usage:
    python yolo_detect.py                      # uses default 'input.jpg'
    python yolo_detect.py --source photo.png   # specify any image path
"""

import sys
import os
import argparse

# ── Argument parsing ──────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description="YOLOv8 Object Detection")
parser.add_argument(
    "--source",
    type=str,
    default="input.jpg",
    help="Path to the input image (default: input.jpg)",
)
parser.add_argument(
    "--model",
    type=str,
    default="yolov8n.pt",
    help="YOLOv8 model name or path (default: yolov8n.pt)",
)
parser.add_argument(
    "--conf",
    type=float,
    default=0.25,
    help="Minimum confidence threshold (default: 0.25)",
)
parser.add_argument(
    "--output",
    type=str,
    default="result.jpg",
    help="Path to save the output image (default: result.jpg)",
)
args = parser.parse_args()

# ── Validate input image ─────────────────────────────────────────────────────
if not os.path.isfile(args.source):
    print(f"[ERROR] Image not found: '{args.source}'")
    print("Please provide a valid image path using --source <path>")
    sys.exit(1)

# ── Import Ultralytics (with helpful error if not installed) ──────────────────
try:
    from ultralytics import YOLO
except ImportError:
    print("[ERROR] Ultralytics is not installed.")
    print("Install it with:  pip install ultralytics opencv-python")
    sys.exit(1)

import cv2

# ── Load the pretrained YOLOv8 model ─────────────────────────────────────────
# On first run the weights are downloaded automatically (~6 MB for yolov8n).
print(f"[INFO] Loading model: {args.model}")
model = YOLO(args.model)

# ── Run inference on the image ────────────────────────────────────────────────
print(f"[INFO] Running detection on: {args.source}")
results = model(args.source, conf=args.conf)

# `results` is a list; one entry per image. We only have one image.
result = results[0]

# ── Print detection results ──────────────────────────────────────────────────
boxes = result.boxes  # Boxes object with xyxy, conf, cls, etc.

if len(boxes) == 0:
    print("[INFO] No objects detected.")
else:
    print(f"\n{'#':<4} {'Class':<20} {'Confidence':<12} {'BBox (x1 y1 x2 y2)'}")
    print("-" * 65)

    for i, box in enumerate(boxes):
        class_id = int(box.cls[0])               # numeric class id
        class_name = model.names[class_id]        # human-readable name
        confidence = float(box.conf[0])           # confidence score
        x1, y1, x2, y2 = box.xyxy[0].tolist()    # bounding-box coordinates

        print(f"{i+1:<4} {class_name:<20} {confidence:<12.4f} "
              f"({x1:.0f}, {y1:.0f}, {x2:.0f}, {y2:.0f})")

    print(f"\nTotal objects detected: {len(boxes)}")

# ── Save the annotated image ─────────────────────────────────────────────────
# result.plot() returns a BGR numpy array with bounding boxes drawn.
annotated = result.plot()
cv2.imwrite(args.output, annotated)
print(f"[INFO] Output saved to: {args.output}")

# ── Display the image (press any key to close) ───────────────────────────────
cv2.imshow("YOLOv8 Detection", annotated)
print("[INFO] Press any key on the image window to close.")
cv2.waitKey(0)
cv2.destroyAllWindows()
