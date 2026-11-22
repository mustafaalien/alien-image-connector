#!/bin/bash
# Make one picture of N frames spread across a video, to check it before sending.
# Usage: contact_sheet.sh <video> <out.jpg> [columns=8] [frame_width=240]
set -e; V="$1"; O="$2"; N="${3:-8}"; W="${4:-240}"
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V")
ffmpeg -v error -y -i "$V" -vf "fps=$N/$D,scale=$W:-1,tile=${N}x1" -frames:v 1 "$O"
ffprobe -v error -show_entries format=duration:stream=width,height -of compact "$V"
ffmpeg -i "$V" -af volumedetect -f null - 2>&1 | grep -E "mean_volume|max_volume" || true
