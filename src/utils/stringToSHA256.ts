import CryptoJS from "crypto-js";

export default (str: string): string => {
  const words = CryptoJS.enc.Utf8.parse(str);
  const hash = CryptoJS.SHA256(words);
  return hash.toString(CryptoJS.enc.Hex);
};
