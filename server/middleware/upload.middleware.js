const multer = require("multer");

const { CloudinaryStorage } = require("multer-storage-cloudinary");

const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,

  params: {
    folder: "BookStore",

    allowed_formats: ["jpg", "jpeg", "png", "webp"],

    public_id: (req, file) =>
      Date.now() + "-" + file.originalname.split(".")[0],
  },
});

const upload = multer({
  storage,
});

module.exports = upload;