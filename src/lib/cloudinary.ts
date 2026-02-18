type UploadProgressHandler = (payload: {
  fileName: string;
  progress: number;
}) => void;

function uploadSingleImageToCloudinary(
  file: File,
  cloudName: string,
  uploadPreset: string,
  onProgress?: UploadProgressHandler,
) {
  return new Promise<string>((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", "almarky/products");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const progress = Math.round((event.loaded / event.total) * 100);
      onProgress?.({ fileName: file.name, progress });
    };

    xhr.onerror = () => {
      reject(new Error(`Image upload failed for ${file.name}.`));
    };

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Image upload failed for ${file.name}.`));
        return;
      }
      try {
        const result = JSON.parse(xhr.responseText) as { secure_url?: string };
        if (!result.secure_url) {
          reject(new Error(`Image upload did not return URL for ${file.name}.`));
          return;
        }
        onProgress?.({ fileName: file.name, progress: 100 });
        resolve(result.secure_url);
      } catch {
        reject(new Error(`Image upload response parse failed for ${file.name}.`));
      }
    };

    xhr.send(formData);
  });
}

export async function uploadImagesToCloudinary(
  files: File[],
  options?: {
    onProgress?: UploadProgressHandler;
  },
) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Image upload configuration is missing.");
  }

  return Promise.all(
    files.map((file) =>
      uploadSingleImageToCloudinary(
        file,
        cloudName,
        uploadPreset,
        options?.onProgress,
      ),
    ),
  );
}
