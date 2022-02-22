import { BinaryReader, BinaryWriter, deserializeUnchecked } from "borsh";
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { METADATA_PROGRAM_ID } from "./config/programs";
import { Metadata, METADATA_PREFIX, METADATA_SCHEMA } from "./config/metaplex";

// Borsh overrides
BinaryReader.prototype.readPubkey = function () {
  const reader = this;
  const array = reader.readFixedArray(32);
  return new PublicKey(array);
};
BinaryWriter.prototype.writePubkey = function (value) {
  const writer = this;
  writer.writeFixedArray(value.toBuffer());
};

const metaProgamPublicKey = new PublicKey(METADATA_PROGRAM_ID);
const metaProgamPublicKeyBuffer = metaProgamPublicKey.toBuffer();
// Create UTF-8 bytes Buffer from string
const metaProgamPrefixBuffer = new TextEncoder().encode(METADATA_PREFIX);

export const decodeTokenMetadata = (buffer) =>
  deserializeUnchecked(METADATA_SCHEMA, Metadata, buffer);

/**
 * Get Addresses of Metadata account assosiated with Mint Token
 */
export async function getSolanaMetadataAddress(tokenMint) {
  return (
    await PublicKey.findProgramAddress(
      [metaProgamPrefixBuffer, metaProgamPublicKeyBuffer, tokenMint.toBuffer()],
      metaProgamPublicKey
    )
  )[0];
}

/**
 * Check if passed address is Solana address
 */
export const isValidSolanaAddress = (address) => {
  try {
    // this fn accepts Base58 character
    // and if it pass we suppose Solana address is valid
    new PublicKey(address);
    return true;
  } catch (error) {
    // Non-base58 character or can't be used as Solana address
    return false;
  }
};

export const createConnectionConfig = (
  clusterApi = clusterApiUrl("mainnet-beta"),
  commitment = "confirmed"
) => new Connection(clusterApi, commitment);
