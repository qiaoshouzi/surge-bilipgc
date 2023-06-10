export { };

declare global {
  const console: {
    log: (message: string) => void;
  };

  const $network: string;
  const $script: {
    name: string;
    startTime: Date;
    type: string;
  };
  const $environment: {
    system: string;
    "surge-build": string;
    "surge-version": string;
    language: string;
  };
  const $persistentStore: {
    write: (data: string, name: string) => boolean;
    read: (name: string) => string | null;
  };
  const $httpAPI: (method: string, path: string, body: object, callback: (data: object) => any) => void;
  const $notification: {
    post: (title: string, subtitle: string, body: string) => void;
  };
  const $utils: {
    geoip: (ip: string) => string;
    ipasn: (ip: string) => string;
    ipaso: (ip: string) => string;
    ungzip: (binary: Uint8Array) => Uint8Array;
  };
}

declare global {
  type HttpClientCallbackResponse = {
    status: number;
    headers: { [key: string]: string };
  };
  type HttpClientCallback = (error: any | null, response: HttpClientCallbackResponse, data: any) => void;
  type HttpClientOptions = {
    url: string;
    method?: string;
    headers?: { [key: string]: string };
    body?: string | Object | Uint8Array;
    timeout?: number;
    policy?: string;
  };
  type HttpClient = (url: string | HttpClientOptions, callback?: HttpClientCallback) => void;
  type HttpOptions = (opts: HttpClientOptions, callback?: HttpClientCallback) => void;
  const $httpClient: {
    post: HttpClient;
    get: HttpClient;
    put: HttpClient;
    delete: HttpClient;
    head: HttpClient;
    options: HttpClient;
    patch: HttpClient;
  };
}

declare global {
  type Rule$done = {
    matched: boolean;
  };

  const $request: Response$request | Response$request | Rule$request;
  const $response: Response$response;

  const $done: <T = {}>(opts: T) => never;
}
