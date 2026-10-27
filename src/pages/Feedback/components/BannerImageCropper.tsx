import { useRef, type PointerEvent } from 'react'
import { Move, ZoomIn } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { BANNER_HEIGHT, BANNER_MAX_ZOOM, BANNER_WIDTH, clampCrop, coverScale, type BannerCrop } from './bannerImage'

interface BannerImageCropperProps {
  image: HTMLImageElement
  crop: BannerCrop
  onCropChange: (crop: BannerCrop) => void
}

/**
 * Shows the banner exactly as the resident app will (16:7). Drag to choose what is visible and
 * zoom in if needed; the visible area is what gets uploaded.
 */
const BannerImageCropper = ({ image, crop, onCropChange }: BannerImageCropperProps) => {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{ pointerX: number; pointerY: number; crop: BannerCrop } | null>(null)

  const scale = coverScale(image) * crop.zoom
  const drawnWidth = image.naturalWidth * scale
  const drawnHeight = image.naturalHeight * scale

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { pointerX: event.clientX, pointerY: event.clientY, crop }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current
    const frame = frameRef.current
    if (!start || !frame) return
    // Screen pixels → output pixels
    const ratio = BANNER_WIDTH / frame.clientWidth
    onCropChange(
      clampCrop(image, {
        zoom: start.crop.zoom,
        x: start.crop.x + (event.clientX - start.pointerX) * ratio,
        y: start.crop.y + (event.clientY - start.pointerY) * ratio,
      }),
    )
  }

  const endDrag = () => {
    drag.current = null
  }

  /** Zooms around the centre of the frame. */
  const setZoom = (zoom: number) => {
    const ratio = zoom / crop.zoom
    const centreX = BANNER_WIDTH / 2
    const centreY = BANNER_HEIGHT / 2
    onCropChange(
      clampCrop(image, {
        zoom,
        x: centreX - (centreX - crop.x) * ratio,
        y: centreY - (centreY - crop.y) * ratio,
      }),
    )
  }

  return (
    <div className="space-y-3">
      <div
        ref={frameRef}
        className="relative aspect-[16/7] w-full cursor-grab touch-none overflow-hidden rounded-xl border bg-gray-100 select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        aria-label="Banner preview. Drag to reposition the image."
      >
        <img
          src={image.src}
          alt="Banner preview"
          draggable={false}
          className="pointer-events-none absolute max-w-none"
          style={{
            left: `${(crop.x / BANNER_WIDTH) * 100}%`,
            top: `${(crop.y / BANNER_HEIGHT) * 100}%`,
            width: `${(drawnWidth / BANNER_WIDTH) * 100}%`,
            height: `${(drawnHeight / BANNER_HEIGHT) * 100}%`,
          }}
        />
        <span className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium text-white">
          <Move className="h-3 w-3" /> Drag to adjust
        </span>
      </div>

      <div className="flex items-center gap-3">
        <ZoomIn className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
        <Slider
          aria-label="Zoom"
          min={1}
          max={BANNER_MAX_ZOOM}
          step={0.01}
          value={[crop.zoom]}
          onValueChange={(value) => setZoom(Array.isArray(value) ? value[0] : value)}
        />
      </div>
    </div>
  )
}

export default BannerImageCropper
