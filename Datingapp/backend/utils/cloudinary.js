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

export const uploadPhotoVerificationImage = async (base64Data, userId) => {
  try {
    // Remove data URI prefix if present
    const base64String = base64Data.includes(',') 
      ? base64Data.split(',')[1] 
      : base64Data;

    const result = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${base64String}`,
      {
        folder: 'spark-dating/verification-photos',
        public_id: `verification_${userId}_${Date.now()}`,
        resource_type: 'auto',
        quality: 'auto',
        validation: {
          width: { min: 200, max: 4000 },
          height: { min: 200, max: 4000 },
          aspect_ratio: { min: 0.5, max: 2.0 },
        },
        tags: ['verification', `user_${userId}`],
        context: {
          userId: userId,
          verificationDate: new Date().toISOString(),
        },
      }
    );

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      size: result.bytes,
    };
  } catch (error) {
    console.error('[Cloudinary] Photo verification upload failed:', error);
    throw error;
  }
};

export const deleteVerificationPhoto = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('[Cloudinary] Photo deletion failed:', error);
    throw error;
  }
};

export default cloudinary;
