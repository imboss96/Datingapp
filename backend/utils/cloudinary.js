import { v2 as cloudinary } from 'cloudinary';

// Initialize Cloudinary with environment variables
export const initCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('[DEBUG Cloudinary] Configured with cloud:', process.env.CLOUDINARY_CLOUD_NAME);
};

export const uploadToCloudinary = (fileBuffer, filename) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        public_id: `spark-dating/${filename}`,
        folder: 'spark-dating/profiles',
        quality: 'auto',
        fetch_format: 'auto',
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

export const deleteFromCloudinary = (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};

export default cloudinary;
