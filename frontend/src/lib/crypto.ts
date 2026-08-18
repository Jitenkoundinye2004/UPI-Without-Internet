// Utility for Asymmetric Elliptic Curve Cryptography (ECDSA P-256)

// 1. Generate a new Public/Private Keypair
export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true, // extractable
    ["sign", "verify"]
  );
  return keyPair;
}

// 2. Export Public Key to Base64 (To send to MongoDB)
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  const exportedAsString = String.fromCharCode.apply(null, Array.from(new Uint8Array(exported)));
  return btoa(exportedAsString);
}

// 3. Export Private Key to Base64 (To store safely in localStorage/IndexedDB)
export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("pkcs8", key);
  const exportedAsString = String.fromCharCode.apply(null, Array.from(new Uint8Array(exported)));
  return btoa(exportedAsString);
}

// 4. Import Private Key from Base64 (When user loads the app)
export async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const binaryDerString = atob(pem);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  return await window.crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign"]
  );
}

// 5. Sign the Transaction Payload using the Private Key
export async function signTransaction(privateKeyPem: string, payload: any): Promise<string> {
  const privateKey = await importPrivateKey(privateKeyPem);
  
  // Convert our JSON payload into an array of bytes
  const encoder = new TextEncoder();
  const dataToSign = encoder.encode(JSON.stringify(payload));

  // Mathematically sign the bytes
  const signatureBuffer = await window.crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    privateKey,
    dataToSign
  );

  // Convert the binary signature to a Base64 string so we can send it over the mesh
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureString = String.fromCharCode.apply(null, signatureArray);
  return btoa(signatureString);
}
