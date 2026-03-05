import { config } from '@config';
import { OSSProvider } from './providers/oss';
import { S3Provider, createR2Provider } from './providers/s3';
import { COSProvider } from './providers/cos';
import type { StorageProvider } from './types';

export type StorageProviderType = 'oss' | 's3' | 'r2' | 'cos';

/**
 * Create storage provider instance
 * @param provider Storage provider type
 * @returns Storage provider instance
 */
export function createStorageProvider<T extends StorageProviderType>(
  provider: T
): StorageProvider {
  switch (provider) {
    case 'oss':
      return new OSSProvider();
    case 's3':
      return new S3Provider();
    case 'r2':
      return createR2Provider();
    case 'cos':
      return new COSProvider();
    default:
      throw new Error(`Unsupported storage provider: ${provider}`);
  }
}

// Export types and provider implementations for convenience
export * from './types';
export { OSSProvider };
export { S3Provider, createR2Provider };
export { COSProvider, type COSProviderConfig } from './providers/cos';

// [KEEP-MY-CHANGE] 修复 Vercel 构建错误：延迟初始化 storage 避免模块加载时检查环境变量
let _storage: StorageProvider | null = null;

function getStorage(): StorageProvider {
  if (!_storage) {
    _storage = createStorageProvider(config.storage.defaultProvider);
  }
  return _storage;
}

// Default storage instance for easy usage
// Uses Proxy for lazy initialization to avoid build-time errors
export const storage: StorageProvider = new Proxy({} as StorageProvider, {
  get(target, prop) {
    const actualStorage = getStorage();
    const value = actualStorage[prop as keyof StorageProvider];
    if (typeof value === 'function') {
      return value.bind(actualStorage);
    }
    return value;
  }
});
