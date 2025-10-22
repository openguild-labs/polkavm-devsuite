import { clsx, type ClassValue } from "clsx";
import { Binary } from "polkadot-api";
import { twMerge } from "tailwind-merge";
import { blake2AsU8a, decodeAddress } from "@polkadot/util-crypto";
import { ss58Address } from "@polkadot-labs/hdkd-helpers";
import { keccak256 } from "viem";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export function ss58ToH160(ss58Address: string): Binary {
    // Decode the SS58 address to a Uint8Array public key
    const publicKey = decodeAddress(ss58Address);
  
    // Take the first 20 bytes of the hashed public key for the Ethereum address
    const ethereumAddressBytes = publicKey.slice(0, 20);
  
    return new Binary(ethereumAddressBytes);
}

export function convertPublicKeyToSs58(publickey: Uint8Array, ss58Format: number) {
  return ss58Address(publickey, ss58Format);
}

export function convertSs58toPublicKey(ss58Address: string): Uint8Array {
  // Decode the SS58 address to get the public key
  return decodeAddress(ss58Address);
}


export function convertSS58ToH160(ss58Address: string): string {
  const publicKey = decodeAddress(ss58Address);
  
  // Convert Uint8Array to hex string
  const cleanHex = Array.from(publicKey)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  
  if (cleanHex.length !== 64) {
    throw new Error(`Invalid Substrate account: expected 64 hex characters, got ${cleanHex.length}`);
  }
  
  const accountHash = keccak256(`0x${cleanHex}` as `0x${string}`);
  
  const evmAddress = '0x' + accountHash.slice(26);
  return evmAddress;
}






  