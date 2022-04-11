import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { createConnectionConfig, isValidSolanaAddress } from ".";
import { COINGECKO_API, RAYDIUM_API, SOLSCAN_API } from "./config/solscan";

export const getParsedWalletTokensByOwner = async (
  address,
  connection = createConnectionConfig()
) => {
  const isValidAddress = isValidSolanaAddress(address);
  if (!isValidAddress) {
    return [];
  }

  const account = await connection.getParsedAccountInfo(new PublicKey(address));
  const accountToken = await convertAccountToBalanceWallet(account.value);

  const { data: tokens } = await SOLSCAN_API.get("account/tokens", {
    params: {
      account: address,
    },
  });

  const walletTokens = tokens.filter((t) => {
    const amount = t.tokenAmount?.uiAmount;
    const decimals = t.tokenAmount?.decimals;
    return decimals > 0 && amount > 0;
  });

  // get prices table
  const { data: coingeckoPrices } = await COINGECKO_API.get(
    "simple/token_price/solana",
    {
      params: {
        vs_currencies: "usd",
        contract_addresses: walletTokens
          .map((token) => token.tokenAddress)
          .join(","),
      },
    }
  );
  const { data: rydiumPrices } = await RAYDIUM_API.get("main/price");
  walletTokens.forEach(async (token) => {
    if (coingeckoPrices[token.tokenAddress]) {
      token.priceUsdt = coingeckoPrices[token.tokenAddress].usd;
    } else if (rydiumPrices[token.tokenAddress]) {
      token.priceUsdt = rydiumPrices[token.tokenAddress];
    } else {
      const { data: price } = await SOLSCAN_API.get(
        `market/token/${token.tokenAddress}`
      );
      if (price.priceUsdt) {
        token.priceUsdt = price.priceUsdt;
      }
    }
  });

  return [accountToken, ...walletTokens];
};

const convertAccountToBalanceWallet = async (account) => {
  const { data } = await COINGECKO_API.get("coins/markets", {
    params: {
      vs_currency: "usd",
      ids: "solana",
    },
  });

  return {
    lamports: account.lamports,
    priceUsdt: data && data.length > 0 ? data[0].current_price : 0,
    rentEpoch: account.rentEpoch,
    tokenAmount: {
      amount: `${account.lamports}`,
      decimals: 9,
      uiAmount: account.lamports / LAMPORTS_PER_SOL,
      uiAmountString: `${account.lamports / LAMPORTS_PER_SOL}`,
    },
    tokenIcon:
      "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    tokenName: "Solana",
    tokenSymbol: "SOL",
  };
};
