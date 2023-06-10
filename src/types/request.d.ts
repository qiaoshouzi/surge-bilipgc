export { };

declare global {
  type Request$done = {
    url?: string;
    headers?: { [key: string]: string };
    body?: string | Uint8Array;
    response?: {
      status: number;
      headers: { [key: string]: string };
      body: string | Uint8Array;
    };
  };
  type Response$request = {
    url: string;
    method: string;
    headers: { [key: string]: string };
    body: string | Uint8Array;
    id: string;
  };
}
