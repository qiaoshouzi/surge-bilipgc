export default async (str: string): Promise<string> => {
  const arrayBuffer = (new TextEncoder()).encode(str).buffer;
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
};
