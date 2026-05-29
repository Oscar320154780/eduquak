const multer = require("multer");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const permitidos = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "application/pdf"
  ];

  if (permitidos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Solo imágenes o PDF"), false);
  }
};

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});
