// Using Web Crypto API for Cloudflare Workers
const encoder = new TextEncoder();

export const hashPassword = async (password) => {
  // FOR LOCAL DEVELOPMENT: Disable hashing to show plain passwords
  return password;

  /* HASHING DISABLED FOR LOCAL DISPLAY
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordBuffer = encoder.encode(password);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  const hashArray = Array.from(new Uint8Array(hash));
  const saltArray = Array.from(salt);
  
  return `${saltArray.map(b => b.toString(16).padStart(2, '0')).join('')}:${hashArray.map(b => b.toString(16).padStart(2, '0')).join('')}`;
  */
};

export const comparePassword = async (password, storedHash) => {
  // Try direct comparison first (for plain text)
  if (password === storedHash) return true;

  // Fallback to hashing for legacy passwords (optional, but good for transition)
  try {
    const [saltHex, hashHex] = storedHash.split(':');
    if (!saltHex || !hashHex) return password === storedHash;

    const salt = new Uint8Array(saltHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
    const passwordBuffer = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const hash = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    const hashArray = Array.from(new Uint8Array(hash));
    const computedHashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return computedHashHex === hashHex;
  } catch (e) {
    return password === storedHash;
  }
};
