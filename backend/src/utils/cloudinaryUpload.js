const path = require("path");
const cloudinary = require("../config/cloudinary");

function assertCloudinaryConfig() {
  const required = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET"
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Faltan variables de Cloudinary: ${missing.join(", ")}`);
  }
}

function cleanFileName(originalName = "archivo") {
  const parsed = path.parse(originalName);

  return parsed.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 70);
}

function uploadBufferToCloudinary(file, folder) {
  assertCloudinaryConfig();

  if (!file || !file.buffer) {
    return Promise.reject(new Error("No se recibió archivo para subir a Cloudinary"));
  }

  const publicId = `${cleanFileName(file.originalname)}_${Date.now()}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `eduquak/${folder}`,
        public_id: publicId,
        resource_type: "auto",
        use_filename: false,
        unique_filename: true,
        overwrite: false
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
          format: result.format
        });
      }
    );

    stream.end(file.buffer);
  });
}

module.exports = {
  uploadBufferToCloudinary
};
