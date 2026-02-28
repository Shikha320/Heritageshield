"""
Video Analysis with YOLOv8
==========================
Samples frames from a video file, runs YOLOv8 detection,
and outputs a JSON summary of detected objects to stdout.

Usage:
    python analyze_video.py <video_path> [--model yolov8n.pt] [--interval 30] [--conf 0.45]

Output (JSON):
    {
      "totalFrames": 300,
      "analyzedFrames": 10,
      "detections": [
        { "frame": 0, "time": 0.0, "class": "person", "confidence": 0.87, "bbox": [x1,y1,x2,y2] },
        ...
      ],
      "summary": { "person": 5, "car": 2 },
      "alerts": [
        { "type": "intrusion", "severity": "high", "message": "Person detected at 3.2s (conf 0.87)" },
        ...
      ]
    }
"""

import sys
import os
import json
import argparse
from collections import defaultdict

# Suppress all ultralytics / YOLO console output
os.environ['YOLO_VERBOSE'] = 'False'
import logging
logging.getLogger('ultralytics').setLevel(logging.CRITICAL)

import cv2
from ultralytics import YOLO

# Classes that should trigger monument-protection alerts
THREAT_CLASSES = {
    'person':     {'type': 'intrusion',  'severity': 'high'},
    'car':        {'type': 'intrusion',  'severity': 'medium'},
    'truck':      {'type': 'intrusion',  'severity': 'medium'},
    'motorcycle': {'type': 'intrusion',  'severity': 'medium'},
    'bus':        {'type': 'intrusion',  'severity': 'medium'},
    'bicycle':    {'type': 'intrusion',  'severity': 'low'},
    'dog':        {'type': 'motion',     'severity': 'low'},
    'cat':        {'type': 'motion',     'severity': 'low'},
    'bird':       {'type': 'motion',     'severity': 'low'},
    'fire hydrant': {'type': 'other',    'severity': 'low'},
    'knife':      {'type': 'vandalism',  'severity': 'high'},
    'scissors':   {'type': 'vandalism',  'severity': 'high'},
    'backpack':   {'type': 'intrusion',  'severity': 'medium'},
    'handbag':    {'type': 'intrusion',  'severity': 'medium'},
    'suitcase':   {'type': 'intrusion',  'severity': 'medium'},
}


def analyze_video(video_path, model_path='yolov8n.pt', frame_interval=30, confidence=0.45):
    """Analyze video and return detection results."""
    model = YOLO(model_path)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {'error': f'Cannot open video: {video_path}'}

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    detections = []
    summary = defaultdict(int)
    alerts = []
    seen_alerts = set()  # avoid duplicate alert messages
    analyzed = 0
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % frame_interval == 0:
            analyzed += 1
            results = model(frame, verbose=False, conf=confidence)

            for result in results:
                if result.boxes is None:
                    continue
                for box in result.boxes:
                    cls_id = int(box.cls[0])
                    cls_name = result.names[cls_id]
                    conf = float(box.conf[0])
                    x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
                    time_sec = round(frame_idx / fps, 1)

                    detections.append({
                        'frame': frame_idx,
                        'time': time_sec,
                        'class': cls_name,
                        'confidence': round(conf, 2),
                        'bbox': [x1, y1, x2, y2],
                    })
                    summary[cls_name] += 1

                    # Generate alert if this is a threat class
                    if cls_name in THREAT_CLASSES:
                        info = THREAT_CLASSES[cls_name]
                        alert_key = f"{info['type']}_{cls_name}"
                        if alert_key not in seen_alerts:
                            seen_alerts.add(alert_key)
                            alerts.append({
                                'type': info['type'],
                                'severity': info['severity'],
                                'message': f"{cls_name.capitalize()} detected at {time_sec}s (confidence {conf:.0%})",
                            })

        frame_idx += 1

    cap.release()

    return {
        'totalFrames': total_frames,
        'analyzedFrames': analyzed,
        'fps': round(fps, 2),
        'detections': detections,
        'summary': dict(summary),
        'alerts': alerts,
    }


def main():
    parser = argparse.ArgumentParser(description='Analyze video with YOLOv8')
    parser.add_argument('video', help='Path to video file')
    parser.add_argument('--model', default='yolov8n.pt', help='YOLOv8 model path')
    parser.add_argument('--interval', type=int, default=30, help='Analyze every N-th frame')
    parser.add_argument('--conf', type=float, default=0.45, help='Confidence threshold')
    args = parser.parse_args()

    # Redirect stdout to devnull during analysis to suppress any library prints
    real_stdout = sys.stdout
    sys.stdout = open(os.devnull, 'w')
    try:
        result = analyze_video(args.video, args.model, args.interval, args.conf)
    finally:
        sys.stdout.close()
        sys.stdout = real_stdout

    # Only this final print goes to real stdout
    print(json.dumps(result))


if __name__ == '__main__':
    main()
