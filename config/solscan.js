import axios from "axios";

export const SOLSCAN_API = axios.create({
  baseURL: "https://public-api.solscan.io",
});

export const COINGECKO_API = axios.create({
  baseURL: "https://api.coingecko.com/api/v3",
});

export const RAYDIUM_API = axios.create({
  baseURL: "https://api.raydium.io/v2",
});
