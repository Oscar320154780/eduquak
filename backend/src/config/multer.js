const multer = require("multer");
const path = require("path");

function createUploader(allowedExtensions = [".pdf", ".png", ".jpg", ".jpeg"]) {
  const storage = multer.memoryStorage();

  const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      return cb(
        new Error(
          `Archivo no permitido. Extensiones válidas: ${allowedExtensions.join(", ")}`
        )
      );
    }

    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024
    }
  });
}

const formatosMateriales = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx"
];

module.exports = {
  uploadConstancia: createUploader([".pdf", ".png", ".jpg", ".jpeg"]),
  uploadRespaldo: createUploader([".pdf", ".png", ".jpg", ".jpeg"]),
  uploadMaterial: createUploader(formatosMateriales),
  formatosMateriales
};
