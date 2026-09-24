from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
IMAGE = ROOT / "tmp/plan-style-final/yardvest-one-scaled.svg.png"
OUTPUT = ROOT / "output/pdf/yardvest-one-presentation.pdf"

page_w, page_h = letter
margin = 24

with Image.open(IMAGE) as image:
    image_w, image_h = image.size

scale = min((page_w - 2 * margin) / image_w, (page_h - 2 * margin) / image_h)
draw_w = image_w * scale
draw_h = image_h * scale
x = (page_w - draw_w) / 2
y = (page_h - draw_h) / 2

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
pdf = canvas.Canvas(str(OUTPUT), pagesize=letter)
pdf.setTitle("YardVest One Concept Floor Plan")
pdf.drawImage(str(IMAGE), x, y, width=draw_w, height=draw_h, preserveAspectRatio=True)
pdf.showPage()
pdf.save()

print(OUTPUT)
