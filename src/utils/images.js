import { IMAGES } from "../data/seed";

/** Resolves a campaign's `image` (built-in key or uploaded data URL) to a src. */
export function campaignImage(campaign) {
  if (!campaign) return IMAGES.pottery;
  return IMAGES[campaign.image] || campaign.image || IMAGES.pottery;
}

/** Reads an image file and downsizes it to a JPEG data URL for local storage. */
export function resizeImageFile(file, maxWidth = 1000, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That image could not be opened."));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
