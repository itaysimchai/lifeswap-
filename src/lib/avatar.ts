import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Stored avatars are a square, because every place one is drawn is a circle.
 * 320px covers a 96pt avatar on a 3x screen, and keeps the encoded bytes small
 * enough to inline when Storage is unavailable (see uploadAvatar).
 */
const EDGE = 320;
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

/*
 * Deliberately no image/heic or image/heif. Listing them makes the iOS picker
 * hand over the camera original, and createImageBitmap cannot decode HEIC in
 * WKWebView; leaving them out makes iOS transcode to JPEG on the way in.
 */
export const AVATAR_ACCEPT = "image/png,image/jpeg,image/webp";

/**
 * Decodes the source already downscaled where the browser supports it.
 *
 * A photo straight off an iPhone is around 12 megapixels - decoding it at full
 * size costs ~48MB of RGBA and a visible stall on the main thread, all to
 * produce a thumbnail. `resizeWidth`/`resizeHeight` let the decoder do the
 * scaling as it decodes instead. Only one axis is ever constrained so the
 * aspect ratio is preserved; whichever axis is short after the first attempt
 * decides the second. Older Safari ignores these options and returns the
 * full-size bitmap, which still produces a correct result, just slower.
 */
async function decodeScaled(file: File): Promise<ImageBitmap> {
  const first = await createImageBitmap(file, {
    resizeWidth: EDGE,
    resizeQuality: "high",
  }).catch(() => createImageBitmap(file));

  // Landscape: constraining the width left the height under the target, so the
  // square crop would have to upscale. Re-decode against the other axis.
  if (first.height >= EDGE || first.width < EDGE) return first;
  const second = await createImageBitmap(file, {
    resizeHeight: EDGE,
    resizeQuality: "high",
  }).catch(() => null);
  if (!second) return first;
  first.close();
  return second;
}

/**
 * Returns square JPEG bytes, centre-cropped, so the stored copy is always in a
 * format every surface can render.
 */
export async function prepareAvatar(file: File): Promise<Blob> {
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("That image is too large. Please choose one under 25 MB.");
  }
  const bitmap = await decodeScaled(file).catch(() => {
    throw new Error("That file could not be read as an image.");
  });
  try {
    const side = Math.min(bitmap.width, bitmap.height, EDGE);
    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not process that image.");

    // Centre crop: draw the largest centred square of the source across the
    // whole canvas, which is what object-fit:cover shows anyway.
    const crop = Math.min(bitmap.width, bitmap.height);
    context.drawImage(
      bitmap,
      (bitmap.width - crop) / 2,
      (bitmap.height - crop) / 2,
      crop,
      crop,
      0,
      0,
      side,
      side
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.75)
    );
    if (!blob) throw new Error("Could not process that image.");
    return blob;
  } finally {
    bitmap.close();
  }
}

/** Storage path for a user's avatar. Security rules key off this exact shape. */
export function avatarPath(uid: string) {
  return `avatars/${uid}/profile.jpg`;
}

export type UploadStage = "processing" | "uploading";

/** Nothing here should take 45s; if it does, say so instead of spinning. */
function withTimeout<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${what} timed out. Check your connection and try again.`)),
      ms
    );
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Base64 inflates by about a third, so this caps a stored-inline avatar at
 * roughly 40KB inside the user document - well under Firestore's 1MiB limit,
 * and small enough not to weigh on the profile snapshot that every screen reads.
 */
const INLINE_MAX_BYTES = 30_000;

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the processed image."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Returns a URL suitable for `photoURL`, preferring Cloud Storage and falling
 * back to inlining the image in Firestore.
 *
 * Storage is the right home for this: one copy, cached by URL, no weight on the
 * user document. But this project has no Storage bucket provisioned, and
 * creating one needs both console access and a Blaze plan - so an avatar that
 * fits comfortably in a document is stored there instead of failing. A prepared
 * avatar is ~20KB, and `photoURL` is only ever handed to an <img>, which reads
 * a data URL exactly like an https one.
 *
 * The moment a bucket exists this silently starts using it again; nothing here
 * has to change.
 */
export async function uploadAvatar(
  uid: string,
  file: File,
  onStage?: (stage: UploadStage) => void
): Promise<string> {
  onStage?.("processing");
  const blob = await withTimeout(prepareAvatar(file), 20_000, "Preparing the image");

  onStage?.("uploading");
  try {
    const object = ref(storage, avatarPath(uid));
    await withTimeout(
      uploadBytes(object, blob, {
        contentType: "image/jpeg",
        cacheControl: "public,max-age=31536000",
      }),
      12_000,
      "The upload"
    );
    return await withTimeout(getDownloadURL(object), 10_000, "Finishing the upload");
  } catch (error) {
    if (blob.size > INLINE_MAX_BYTES) throw error;
    console.warn("Cloud Storage unavailable; storing this avatar in Firestore.", error);
    return blobToDataURL(blob);
  }
}

/**
 * Removes the stored avatar. Clearing `photoURL` is the caller's job and is what
 * actually removes an inlined one; this only cleans up a Storage object if there
 * is one, so a missing object - or a missing bucket - is not an error.
 */
export async function removeAvatar(uid: string): Promise<void> {
  try {
    await deleteObject(ref(storage, avatarPath(uid)));
  } catch {
    // Nothing to clean up.
  }
}
