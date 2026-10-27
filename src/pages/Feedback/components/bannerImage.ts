/**
 * Banners are shown in a 16:7 frame in the resident app (components/common/Slider, aspectRatio 16 / 7,
 * resizeMode cover). Every upload is saved at exactly this size so it fits that frame.
 */
export const BANNER_WIDTH = 1600
export const BANNER_HEIGHT = 700
/** Smaller images would look blurry on phones. */
export const BANNER_MIN_WIDTH = 800
export const BANNER_MIN_HEIGHT = 350
export const BANNER_MAX_ZOOM = 3

export interface BannerCrop {
  zoom: number
  /** Top-left of the drawn image, in output (BANNER_WIDTH × BANNER_HEIGHT) pixels; always ≤ 0 */
  x: number
  y: number
}

/** Scale at which the image just covers the banner (zoom 1). */
export const coverScale = (image: HTMLImageElement) =>
  Math.max(BANNER_WIDTH / image.naturalWidth, BANNER_HEIGHT / image.naturalHeight)

/** Keeps the banner covered: the image can't be dragged past its edges. */
export const clampCrop = (image: HTMLImageElement, crop: BannerCrop): BannerCrop => {
  const scale = coverScale(image) * crop.zoom
  return {
    zoom: crop.zoom,
    x: Math.min(0, Math.max(BANNER_WIDTH - image.naturalWidth * scale, crop.x)),
    y: Math.min(0, Math.max(BANNER_HEIGHT - image.naturalHeight * scale, crop.y)),
  }
}

export const centredCrop = (image: HTMLImageElement): BannerCrop => {
  const scale = coverScale(image)
  return {
    zoom: 1,
    x: (BANNER_WIDTH - image.naturalWidth * scale) / 2,
    y: (BANNER_HEIGHT - image.naturalHeight * scale) / 2,
  }
}

/** Loads a picked file so its size can be checked and it can be cropped. */
export const loadImageFile = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('This image could not be read'))
    }
    image.src = url
  })

/** The cropped area as a BANNER_WIDTH × BANNER_HEIGHT file (PNG keeps transparency, otherwise JPEG). */
export async function exportBannerFile(image: HTMLImageElement, file: File, crop: BannerCrop): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = BANNER_WIDTH
  canvas.height = BANNER_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Image editing is not supported in this browser')
  context.imageSmoothingQuality = 'high'
  const scale = coverScale(image) * crop.zoom
  context.drawImage(image, crop.x, crop.y, image.naturalWidth * scale, image.naturalHeight * scale)

  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9))
  if (!blob) throw new Error('The banner could not be prepared')
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'banner'
  const extension = type === 'image/png' ? 'png' : 'jpg'
  return new File([blob], `${baseName}-${BANNER_WIDTH}x${BANNER_HEIGHT}.${extension}`, { type })
}
