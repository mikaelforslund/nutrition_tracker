import sharp from "sharp";

/**
 * Prepares a photo for a vision model. Processing time grows with pixel count,
 * so a full-size phone photo costs over 10x more than a small one.
 * rotate() applies the EXIF orientation, which is lost when re-encoding.
 */
export async function shrinkImage(bytes: Uint8Array, maxDimension: number): Promise<Buffer> {
  return sharp(bytes)
    .rotate()
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80 })
    .toBuffer();
}
