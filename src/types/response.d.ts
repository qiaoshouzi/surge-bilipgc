export { };

declare global {
  type Response$request = {
    url: string;
    method: string;
    id: string;
    headers: { [key: string]: string };
  }
  type Response$response = {
    status: number;
    headers: { [key: string]: string };
    body: string | Uint8Array;
  };
  type Response$done = {
    status?: number;
    headers?: { [key: string]: string };
    body?: string | Uint8Array;
  };
}
