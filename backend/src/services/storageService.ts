import { getOne } from '../config/database';
import path from 'path';
import fs from 'fs';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type StorageType = 'local' | 's3' | 'azure' | 'sharepoint';

export interface StorageConfig {
  storage_type: StorageType;
  s3_bucket?: string;
  s3_region?: string;
  s3_access_key?: string;
  s3_secret_key?: string;
  s3_endpoint?: string;
  azure_account?: string;
  azure_container?: string;
  azure_sas_token?: string;
  sharepoint_site_url?: string;
  sharepoint_client_id?: string;
  sharepoint_client_secret?: string;
  sharepoint_folder?: string;
}

export interface UploadResult {
  stored_name: string;
  storage_type: StorageType;
  storage_path?: string;
  url?: string;
}

const LOCAL_UPLOAD_DIR = path.join(__dirname, '../../uploads/newsfeed');

// Ensure local upload directory exists
if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}

class StorageService {
  private s3Client: S3Client | null = null;

  async getStorageConfig(): Promise<StorageConfig> {
    const config = await getOne<any>(
      `SELECT setting_value FROM system_settings WHERE setting_key = $1`,
      ['storage_config']
    );

    if (config && config.setting_value) {
      try {
        return JSON.parse(config.setting_value);
      } catch {
        // Return default local storage if parsing fails
      }
    }

    // Default to local storage
    return { storage_type: 'local' };
  }

  private async initS3Client(config: StorageConfig): Promise<S3Client> {
    if (this.s3Client) {
      return this.s3Client;
    }

    if (!config.s3_access_key || !config.s3_secret_key || !config.s3_region) {
      throw new Error('S3 configuration is incomplete');
    }

    this.s3Client = new S3Client({
      region: config.s3_region,
      credentials: {
        accessKeyId: config.s3_access_key,
        secretAccessKey: config.s3_secret_key,
      },
      ...(config.s3_endpoint && { endpoint: config.s3_endpoint }),
    });

    return this.s3Client;
  }

  async uploadFile(
    file: Express.Multer.File,
    fileName: string
  ): Promise<UploadResult> {
    const config = await this.getStorageConfig();

    switch (config.storage_type) {
      case 's3':
        return await this.uploadToS3(file, fileName, config);
      case 'azure':
        return await this.uploadToAzure(file, fileName, config);
      case 'sharepoint':
        return await this.uploadToSharePoint(file, fileName, config);
      case 'local':
      default:
        return await this.uploadToLocal(file, fileName);
    }
  }

  private async uploadToLocal(
    file: Express.Multer.File,
    fileName: string
  ): Promise<UploadResult> {
    const storedPath = path.join(LOCAL_UPLOAD_DIR, fileName);

    // Move file from temp to uploads directory
    fs.renameSync(file.path, storedPath);

    return {
      stored_name: fileName,
      storage_type: 'local',
      storage_path: storedPath,
    };
  }

  private async uploadToS3(
    file: Express.Multer.File,
    fileName: string,
    config: StorageConfig
  ): Promise<UploadResult> {
    if (!config.s3_bucket) {
      throw new Error('S3 bucket is not configured');
    }

    const s3Client = await this.initS3Client(config);
    const fileContent = fs.readFileSync(file.path);

    const command = new PutObjectCommand({
      Bucket: config.s3_bucket,
      Key: `newsfeed/${fileName}`,
      Body: fileContent,
      ContentType: file.mimetype,
      // Prevent download by setting inline disposition
      ContentDisposition: 'inline',
    });

    await s3Client.send(command);

    // Delete temp file
    fs.unlinkSync(file.path);

    return {
      stored_name: fileName,
      storage_type: 's3',
      storage_path: `newsfeed/${fileName}`,
    };
  }

  private async uploadToAzure(
    file: Express.Multer.File,
    fileName: string,
    config: StorageConfig
  ): Promise<UploadResult> {
    // Azure Blob Storage implementation
    // TODO: Implement Azure upload when needed
    throw new Error('Azure storage not yet implemented');
  }

  private async uploadToSharePoint(
    file: Express.Multer.File,
    fileName: string,
    config: StorageConfig
  ): Promise<UploadResult> {
    // SharePoint implementation
    // TODO: Implement SharePoint upload when needed
    throw new Error('SharePoint storage not yet implemented');
  }

  async getFileUrl(
    storedName: string,
    storageType: StorageType,
    storagePath?: string
  ): Promise<string> {
    const config = await this.getStorageConfig();

    switch (storageType) {
      case 's3':
        return await this.getS3Url(storagePath || storedName, config);
      case 'azure':
        return await this.getAzureUrl(storagePath || storedName, config);
      case 'sharepoint':
        return await this.getSharePointUrl(storagePath || storedName, config);
      case 'local':
      default:
        return `/uploads/newsfeed/${storedName}`;
    }
  }

  private async getS3Url(key: string, config: StorageConfig): Promise<string> {
    if (!config.s3_bucket) {
      throw new Error('S3 bucket is not configured');
    }

    const s3Client = await this.initS3Client(config);

    const command = new GetObjectCommand({
      Bucket: config.s3_bucket,
      Key: key,
    });

    // Generate presigned URL with 1 hour expiration
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return url;
  }

  private async getAzureUrl(path: string, config: StorageConfig): Promise<string> {
    // TODO: Implement Azure URL generation
    throw new Error('Azure storage not yet implemented');
  }

  private async getSharePointUrl(path: string, config: StorageConfig): Promise<string> {
    // TODO: Implement SharePoint URL generation
    throw new Error('SharePoint storage not yet implemented');
  }

  async deleteFile(
    storedName: string,
    storageType: StorageType,
    storagePath?: string
  ): Promise<void> {
    const config = await this.getStorageConfig();

    switch (storageType) {
      case 's3':
        await this.deleteFromS3(storagePath || storedName, config);
        break;
      case 'azure':
        await this.deleteFromAzure(storagePath || storedName, config);
        break;
      case 'sharepoint':
        await this.deleteFromSharePoint(storagePath || storedName, config);
        break;
      case 'local':
      default:
        await this.deleteFromLocal(storedName);
        break;
    }
  }

  private async deleteFromLocal(fileName: string): Promise<void> {
    const filePath = path.join(LOCAL_UPLOAD_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  private async deleteFromS3(key: string, config: StorageConfig): Promise<void> {
    if (!config.s3_bucket) {
      throw new Error('S3 bucket is not configured');
    }

    const s3Client = await this.initS3Client(config);

    const command = new DeleteObjectCommand({
      Bucket: config.s3_bucket,
      Key: key,
    });

    await s3Client.send(command);
  }

  private async deleteFromAzure(path: string, config: StorageConfig): Promise<void> {
    // TODO: Implement Azure delete
    throw new Error('Azure storage not yet implemented');
  }

  private async deleteFromSharePoint(path: string, config: StorageConfig): Promise<void> {
    // TODO: Implement SharePoint delete
    throw new Error('SharePoint storage not yet implemented');
  }
}

export const storageService = new StorageService();
