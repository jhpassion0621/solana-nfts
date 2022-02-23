import { PublicKey } from "@solana/web3.js";
import {
  createConnectionConfig,
  decodeTokenMetadata,
  getSolanaMetadataAddress,
  isValidSolanaAddress,
} from ".";
import { TOKEN_PROGRAM_ID } from "./config/programs";
import chunks from "lodash.chunk";
import axios from "axios";

export const getParsedNFTAccountsByOwner = async (
  address,
  connection = createConnectionConfig(),
  limit = 5000
) => {
  const isValidAddress = isValidSolanaAddress(address);
  if (!isValidAddress) {
    return [];
  }

  const { value: splAccounts } = await connection.getParsedTokenAccountsByOwner(
    new PublicKey(address),
    {
      programId: new PublicKey(TOKEN_PROGRAM_ID),
    }
  );

  const nftAccounts = splAccounts
    .filter((t) => {
      const amount = t.account?.data?.parsed?.info?.tokenAmount?.uiAmount;
      const decimals = t.account?.data?.parsed?.info?.tokenAmount?.decimals;
      return decimals === 0 && amount > 0;
    })
    .map((t) => {
      const address = t.account?.data?.parsed?.info?.mint;
      return new PublicKey(address);
    });

  // if user have tons of NFTs return first N
  const accountsSlice = nftAccounts?.slice(0, limit);

  const metadataAcountsAddressPromises = await Promise.allSettled(
    accountsSlice.map(getSolanaMetadataAddress)
  );

  const metadataAccounts = metadataAcountsAddressPromises
    .filter(onlySuccessfullPromises)
    .map((p) => p.value);

  // Fetch Found Metadata Account data by chunks
  const metaAccountsRawPromises = await Promise.allSettled(
    chunks(metadataAccounts, 99).map((chunk) =>
      connection.getMultipleAccountsInfo(chunk)
    )
  );

  const accountsRawMeta = metaAccountsRawPromises
    .filter(onlySuccessfullPromises)
    .flatMap((p) => p.value);

  // There is no reason to continue processing
  // if Mints doesn't have associated metadata account. just return []
  if (!accountsRawMeta?.length || accountsRawMeta?.length === 0) {
    return [];
  }

  // Decode data from Buffer to readable objects
  const accountsDecodedMeta = await Promise.allSettled(
    accountsRawMeta.map((accountInfo) => decodeTokenMetadata(accountInfo?.data))
  );

  const accountsFiltered = accountsDecodedMeta
    .filter(onlySuccessfullPromises)
    .filter(onlyNftsWithMetadata)
    .map((p) => sanitizeTokenMeta(p.value))
    .map((token) => publicKeyToString(token));

  // otherwise return unsorted
  return accountsFiltered;
};

export const getParsedNFTsByOwner = async (
  address,
  connection = createConnectionConfig(),
  limit = 5000
) => {
  const accounts = await getParsedNFTAccountsByOwner(
    address,
    connection,
    limit
  );

  const nftsPromises = await Promise.allSettled(
    accounts.map((account) => axios.get(account.data.uri))
  );
  const nfts = nftsPromises
    .filter(onlySuccessfullPromises)
    .map((p) => p.value)
    .map((res) => res.data);

  return nfts;
};

const sanitizeTokenMeta = (tokenData) => ({
  ...tokenData,
  data: {
    ...tokenData?.data,
    name: sanitizeMetaStrings(tokenData?.data?.name),
    symbol: sanitizeMetaStrings(tokenData?.data?.symbol),
    uri: sanitizeMetaStrings(tokenData?.data?.uri),
  },
});

// Convert all PublicKey to string
const publicKeyToString = (tokenData) => ({
  ...tokenData,
  mint: tokenData?.mint?.toString?.(),
  updateAuthority: tokenData?.updateAuthority?.toString?.(),
  data: {
    ...tokenData?.data,
    creators: tokenData?.data?.creators?.map((c) => ({
      ...c,
      address: new PublicKey(c?.address)?.toString?.(),
    })),
  },
});

// Remove all empty space, new line, etc. symbols
// In some reason such symbols parsed back from Buffer looks weird
// like "\x0000" instead of usual spaces.
const sanitizeMetaStrings = (metaString) => metaString.replace(/\0/g, "");

const onlySuccessfullPromises = (result) =>
  result && result.status === "fulfilled";

// Remove any NFT Metadata Account which doesn't have uri field
// We can assume such NFTs are broken or invalid.
const onlyNftsWithMetadata = (t) => {
  const uri = t.value.data?.uri?.replace?.(/\0/g, "");
  return uri !== "" && uri !== undefined;
};
