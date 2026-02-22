/**
 * Keychain Service for secure API key storage
 * Uses OS native keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
 */

/**
 * Interface for Keychain Service
 */
export interface IKeychainService {
  /**
   * Store an API key securely
   */
  setKey(service: string, account: string, key: string): Promise<void>;

  /**
   * Retrieve an API key
   */
  getKey(service: string, account: string): Promise<string | null>;

  /**
   * Delete an API key
   */
  deleteKey(service: string, account: string): Promise<boolean>;

  /**
   * Check if a key exists
   */
  hasKey(service: string, account: string): Promise<boolean>;
}

/**
 * In-memory keychain implementation for testing
 * In production, this would use keytar or similar native keychain library
 */
class InMemoryKeychainService implements IKeychainService {
  private storage: Map<string, Map<string, string>> = new Map();

  async setKey(service: string, account: string, key: string): Promise<void> {
    if (!this.storage.has(service)) {
      this.storage.set(service, new Map());
    }
    this.storage.get(service)!.set(account, key);
  }

  async getKey(service: string, account: string): Promise<string | null> {
    const serviceStorage = this.storage.get(service);
    if (!serviceStorage) {
      return null;
    }
    return serviceStorage.get(account) ?? null;
  }

  async deleteKey(service: string, account: string): Promise<boolean> {
    const serviceStorage = this.storage.get(service);
    if (!serviceStorage) {
      return false;
    }
    const existed = serviceStorage.has(account);
    serviceStorage.delete(account);
    if (serviceStorage.size === 0) {
      this.storage.delete(service);
    }
    return existed;
  }

  async hasKey(service: string, account: string): Promise<boolean> {
    const serviceStorage = this.storage.get(service);
    if (!serviceStorage) {
      return false;
    }
    return serviceStorage.has(account);
  }

  /**
   * Clear all keys (for testing)
   */
  clear(): void {
    this.storage.clear();
  }
}

/**
 * Keytar interface (to avoid direct import)
 */
interface Keytar {
  setPassword(service: string, account: string, password: string): Promise<void>;
  getPassword(service: string, account: string): Promise<string | null>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

/**
 * Native keychain implementation
 * Uses keytar library (same as VSCode)
 */
class NativeKeychainService implements IKeychainService {
  private keytar: Keytar | null = null;

  constructor() {
    // Lazy load keytar to avoid issues in test environment
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.keytar = require('keytar');
    } catch (error) {
      console.warn('keytar not available, falling back to in-memory storage');
    }
  }

  async setKey(service: string, account: string, key: string): Promise<void> {
    if (!this.keytar) {
      throw new Error('Native keychain not available');
    }
    await this.keytar.setPassword(service, account, key);
  }

  async getKey(service: string, account: string): Promise<string | null> {
    if (!this.keytar) {
      throw new Error('Native keychain not available');
    }
    return this.keytar.getPassword(service, account);
  }

  async deleteKey(service: string, account: string): Promise<boolean> {
    if (!this.keytar) {
      throw new Error('Native keychain not available');
    }
    return this.keytar.deletePassword(service, account);
  }

  async hasKey(service: string, account: string): Promise<boolean> {
    if (!this.keytar) {
      throw new Error('Native keychain not available');
    }
    const key = await this.keytar.getPassword(service, account);
    return key !== null;
  }
}

/**
 * Keychain Service factory
 */
export class KeychainService implements IKeychainService {
  private impl: IKeychainService;

  constructor(useNative: boolean = true) {
    if (useNative) {
      try {
        this.impl = new NativeKeychainService();
      } catch (error) {
        console.warn('Failed to initialize native keychain, using in-memory storage');
        this.impl = new InMemoryKeychainService();
      }
    } else {
      this.impl = new InMemoryKeychainService();
    }
  }

  async setKey(service: string, account: string, key: string): Promise<void> {
    // Validate that key is not empty
    if (!key || key.trim().length === 0) {
      throw new Error('API key cannot be empty');
    }
    return this.impl.setKey(service, account, key);
  }

  async getKey(service: string, account: string): Promise<string | null> {
    return this.impl.getKey(service, account);
  }

  async deleteKey(service: string, account: string): Promise<boolean> {
    return this.impl.deleteKey(service, account);
  }

  async hasKey(service: string, account: string): Promise<boolean> {
    return this.impl.hasKey(service, account);
  }
}

/**
 * Singleton instance of Keychain Service
 */
let keychainServiceInstance: KeychainService | undefined;

export function getKeychainService(useNative: boolean = false): KeychainService {
  if (!keychainServiceInstance) {
    keychainServiceInstance = new KeychainService(useNative);
  }
  return keychainServiceInstance;
}

export function resetKeychainService(): void {
  keychainServiceInstance = undefined;
}

/**
 * Constants for Miaoda IDE keychain services
 */
export const KEYCHAIN_SERVICE = {
  OPENAI: 'com.miaoda.ide.openai',
  ANTHROPIC: 'com.miaoda.ide.anthropic',
  GITHUB: 'com.miaoda.ide.github',
} as const;
