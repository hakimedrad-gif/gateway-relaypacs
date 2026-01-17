export class EncryptionService {
  private static instance: EncryptionService;
  private key: CryptoKey | null = null;
  private readonly ALGORITHM = 'AES-GCM';
  private readonly KEY_STORAGE_NAME = 'relaypacs_session_key';

  private constructor() {}

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  // Initialize: Retrieve key from session or generate new one
  async initialize(): Promise<void> {
    const savedKey = sessionStorage.getItem(this.KEY_STORAGE_NAME);

    if (savedKey) {
      try {
        await this.importKey(savedKey);
      } catch (e) {
        console.warn('Invalid session key, generating new one...');
        await this.generateAndSaveKey();
      }
    } else {
      await this.generateAndSaveKey();
    }
  }

  private async generateAndSaveKey(): Promise<void> {
    this.key = await window.crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: 256,
      },
      true, // extractable (needed to save to session)
      ['encrypt', 'decrypt'],
    );

    const exported = await window.crypto.subtle.exportKey('jwk', this.key);
    sessionStorage.setItem(this.KEY_STORAGE_NAME, JSON.stringify(exported));
  }

  private async importKey(jwkString: string): Promise<void> {
    const jwk = JSON.parse(jwkString);
    this.key = await window.crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: this.ALGORITHM,
      },
      true,
      ['encrypt', 'decrypt'],
    );
  }

  async encrypt(data: string): Promise<string> {
    if (!this.key) await this.initialize();
    if (!this.key) throw new Error('Encryption key not valid');

    const encoder = new TextEncoder();
    const encoded = encoder.encode(data);
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV standard for GCM

    const encryptedContent = await window.crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
      },
      this.key,
      encoded,
    );

    // Combine IV and Ciphertext for storage: IV + Ciphertext
    // We'll base64 encode both parts or the combined buffer
    const combined = new Uint8Array(iv.length + encryptedContent.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedContent), iv.length);

    return this.arrayBufferToBase64(combined.buffer);
  }

  async decrypt(encryptedString: string): Promise<string> {
    if (!this.key) await this.initialize();
    if (!this.key) throw new Error('Encryption key not valid');

    try {
      const combined = this.base64ToArrayBuffer(encryptedString);
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);

      const decryptedContent = await window.crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: new Uint8Array(iv),
        },
        this.key,
        ciphertext,
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedContent);
    } catch (e) {
      console.error('Decryption failed:', e);
      return '[Encrypted Data]'; // Fallback if key doesn't match
    }
  }

  // --- Utilities ---

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const encryptionService = EncryptionService.getInstance();
