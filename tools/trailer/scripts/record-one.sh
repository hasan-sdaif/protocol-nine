#!/bin/bash
# ═══════════════════════════════════════════════════════════
# تسجيل فيديو واحد وإخراجه النهائي
#   ./record-one.sh <id> <duration> <w> <h> [all|rec|enc]
# التصوير البطيء (ts=0.3) بمعدل أسر 10fps ثم تسريع ×30fps
# + قصّ البداية السوداء تلقائياً (blackdetect) + مزج الصوت
# ═══════════════════════════════════════════════════════════
set -e
ID="$1"; DUR="$2"; W="$3"; H="$4"; MODE="${5:-all}"
TS=0.3; FPS=10
TR=/home/z/my-project/tools/trailer
PUB=/home/z/my-project/public/videos
VID="$TR/out/vid-$ID.mp4"
mkdir -p "$PUB"

rec_start () {
  REC_SECS=$(python3 -c "print(int($DUR / $TS + 6))")
  echo "═══ [$ID] rec ${W}x${H} — ${DUR}s — ${REC_SECS}s ═══"
  agent-browser set viewport "$W" "$H" >/dev/null
  agent-browser open "file://$TR/out/render-$ID.html?ts=$TS" >/dev/null
  sleep 3
  agent-browser record start "$VID" --fps $FPS
  agent-browser click "#go" >/dev/null
  sleep "$REC_SECS"
  agent-browser record stop
  echo "── تم التسجيل: $(du -h "$VID" | cut -f1)"
}

enc_start () {
  BLACK=$(ffmpeg -nostdin -i "$VID" -vf "blackdetect=d=0.08:pix_th=0.10:pic_th=0.97" -an -f null - < /dev/null 2>&1 | grep -oP 'black_end:\K[0-9.]+' | head -1)
  BE=${BLACK:-0.4}
  echo "═══ [$ID] enc — قصّ عند $BE s ═══"
  ffmpeg -nostdin -y -v warning -ss "$BE" -i "$VID" -i "$TR/out/$ID-mix.mp3" \
    -vf "setpts=$TS*PTS,fps=30,format=yuv420p" \
    -map 0:v -map 1:a -c:v libx264 -preset veryfast -crf 19 \
    -c:a aac -b:a 192k -t "$(python3 -c "print($DUR + 0.8)")" \
    -movflags +faststart "$PUB/$ID.mp4" < /dev/null 2>&1 | tail -1 || true
  ffmpeg -nostdin -y -v quiet -i "$PUB/$ID.mp4" -ss 3 -frames:v 1 "$PUB/$ID-poster.jpg" < /dev/null || true
  D=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$PUB/$ID.mp4")
  S=$(du -h "$PUB/$ID.mp4" | cut -f1)
  echo "✓ $ID.mp4 — ${D}s — ${S}"
}

case "$MODE" in
  rec) rec_start ;;
  enc) enc_start ;;
  *) rec_start; enc_start ;;
esac
