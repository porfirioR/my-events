import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string = 'uploads'): Promise<{
    public_id: string;
    secure_url: string;
    original_filename: string;
    bytes: number;
    format: string;
  }> {
    try {
      const result = await cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto', // Permite imágenes, videos, documentos
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) throw error;
          return result;
        }
      );

      // Convertir el buffer a stream y subir
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'auto',
            use_filename: true,
            unique_filename: true,
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve({
                public_id: result!.public_id,
                secure_url: result!.secure_url,
                original_filename: file.originalname,
                bytes: result!.bytes,
                format: result!.format,
              });
            }
          }
        );

        uploadStream.end(file.buffer);
      });
    } catch (error) {
      throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
  }

  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      throw new Error(`Cloudinary delete failed: ${error.message}`);
    }
  }

  async generateSignedUrl(publicId: string, options: any = {}): Promise<string> {
    return cloudinary.url(publicId, {
      sign_url: true,
      ...options
    });
  }

  // Método para obtener info del archivo
  async getFileInfo(publicId: string): Promise<any> {
    try {
      return await cloudinary.api.resource(publicId);
    } catch (error) {
      throw new Error(`Failed to get file info: ${error.message}`);
    }
  }
}