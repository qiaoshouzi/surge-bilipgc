export { };

declare global {
  type Rule$request = {
    hostname: string;
    destPort: number;
    processPath: string;
    userAgent: string;
    url: string;
    sourceIP: string;
    listenPort: number;
    dnsResolve: {
      v4Addresses: string;
    };
  };

  type Rule$done = {
    matched: boolean;
  };
}
