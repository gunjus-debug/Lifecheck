export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  salt: string;
  version: string;
}

export function buildEncryptionMetadata(iv: string, salt: string, version = '1') {
  return {
    iv,
    salt,
    version,
    algorithm: 'AES-256-GCM',
  };
}

export function validateVaultPayload(payload: unknown): payload is EncryptedPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'ciphertext' in payload &&
    'iv' in payload &&
    'salt' in payload
  );
}
