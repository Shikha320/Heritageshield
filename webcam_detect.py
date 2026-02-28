"""
Real-Time Object Detection using YOLOv8 and OpenCV
===================================================
Captures webcam feed and runs YOLOv8 inference frame-by-frame,
drawing bounding boxes and labels on detected objects.

Controls:
    q  - Quit
    s  - Save current frame
"""

import cv2
import time
import sys
from ultralytics import YOLO

# ─── Configuration ───────────────────────────────────────────────────────────
MODEL_PATH = "yolov8n.pt"          # YOLOv8 nano model (auto-downloads if missing)
CONFIDENCE_THRESHOLD = 0.5         # Minimum detection confidence
WEBCAM_INDEX = 0                   # Default webcam
WINDOW_NAME = "YOLOv8 Real-Time Detection"

# Bounding box styling
BOX_COLOR = (0, 255, 0)           # Green
BOX_THICKNESS = 2
LABEL_FONT = cv2.FONT_HERSHEY_SIMPLEX
LABEL_SCALE = 0.6
LABEL_COLOR = (255, 255, 255)     # White text
LABEL_BG_COLOR = (0, 255, 0)     # Green background


def load_model(model_path: str) -> YOLO:
    """Load the YOLOv8 model."""
    print(f"[INFO] Loading model: {model_path}")
    model = YOLO(model_path)
    print(f"[INFO] Model loaded successfully ({len(model.names)} classes)")
    return model


def open_webcam(index: int = 0) -> cv2.VideoCapture:
    """Open webcam and verify it is accessible."""
    print(f"[INFO] Opening webcam (index {index})...")
    cap = cv2.VideoCapture(index)

    if not cap.isOpened():
        print("[ERROR] Cannot open webcam. Check your camera connection.")
        sys.exit(1)

    # Set resolution for smoother performance
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"[INFO] Webcam opened: {width}x{height}")
    return cap


def draw_detections(frame, results):
    """Draw bounding boxes and labels on the frame.

    Args:
        frame:   The BGR image (numpy array).
        results: YOLOv8 Results object for the frame.

    Returns:
        Annotated frame and count of detections.
    """
    detections = 0

    for result in results:
        boxes = result.boxes
        if boxes is None:
            continue

        for box in boxes:
            # Extract coordinates and metadata
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            confidence = float(box.conf[0])
            class_id = int(box.cls[0])
            class_name = result.names[class_id]

            if confidence < CONFIDENCE_THRESHOLD:
                continue

            detections += 1
            label = f"{class_name} {confidence:.2f}"

            # Draw bounding box
            cv2.rectangle(frame, (x1, y1), (x2, y2), BOX_COLOR, BOX_THICKNESS)

            # Draw label background
            (text_w, text_h), baseline = cv2.getTextSize(
                label, LABEL_FONT, LABEL_SCALE, 1
            )
            cv2.rectangle(
                frame,
                (x1, y1 - text_h - baseline - 4),
                (x1 + text_w, y1),
                LABEL_BG_COLOR,
                cv2.FILLED,
            )

            # Draw label text
            cv2.putText(
                frame, label,
                (x1, y1 - baseline - 2),
                LABEL_FONT, LABEL_SCALE, LABEL_COLOR, 1, cv2.LINE_AA,
            )

    return frame, detections


def draw_info_overlay(frame, fps: float, detections: int):
    """Draw FPS counter and detection count on top-left corner."""
    info_lines = [
        f"FPS: {fps:.1f}",
        f"Objects: {detections}",
    ]
    y_offset = 30
    for line in info_lines:
        cv2.putText(
            frame, line,
            (10, y_offset),
            LABEL_FONT, 0.7, (0, 0, 255), 2, cv2.LINE_AA,
        )
        y_offset += 30

    # Instructions at bottom
    h = frame.shape[0]
    cv2.putText(
        frame, "Press 'q' to quit | 's' to save frame",
        (10, h - 15),
        LABEL_FONT, 0.5, (200, 200, 200), 1, cv2.LINE_AA,
    )


def main():
    """Main loop: capture frames, run detection, display results."""
    model = load_model(MODEL_PATH)
    cap = open_webcam(WEBCAM_INDEX)

    print("[INFO] Starting real-time detection... Press 'q' to quit.")
    frame_count = 0
    fps = 0.0
    prev_time = time.time()

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("[WARN] Failed to read frame. Retrying...")
                continue

            # Run YOLOv8 inference (verbose=False suppresses per-frame logs)
            results = model(frame, verbose=False)

            # Draw detections on frame
            annotated_frame, detections = draw_detections(frame, results)

            # Calculate FPS
            frame_count += 1
            current_time = time.time()
            elapsed = current_time - prev_time
            if elapsed >= 1.0:
                fps = frame_count / elapsed
                frame_count = 0
                prev_time = current_time

            # Draw overlay info
            draw_info_overlay(annotated_frame, fps, detections)

            # Display the frame
            cv2.imshow(WINDOW_NAME, annotated_frame)

            # Key handling
            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                print("[INFO] Quit key pressed. Exiting...")
                break
            elif key == ord("s"):
                filename = f"snapshot_{int(time.time())}.jpg"
                cv2.imwrite(filename, annotated_frame)
                print(f"[INFO] Frame saved: {filename}")

    except KeyboardInterrupt:
        print("\n[INFO] Interrupted by user.")

    finally:
        cap.release()
        cv2.destroyAllWindows()
        print("[INFO] Webcam released. Goodbye!")


if __name__ == "__main__":
    main()
