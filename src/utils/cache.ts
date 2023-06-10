import log from "./log";

const latestVersion = "2";

type areas = "N" | "HK" | "TW" | "MO"; // N 代表不需要代理

export class Cache {
  cache: {
    proxy: {
      HK: string[]; // HK Proxy
      TW: string[]; // TW Proxy
      MO: string[]; // MO Proxy
      N: string[]; // NO Proxy
    };
    initTime: number; // 初始化时间
    version: string; // 版本号
  } = {
      proxy: {
        HK: [],
        TW: [],
        MO: [],
        N: [],
      },
      initTime: Date.now(),
      version: latestVersion,
    };
  constructor() {
    let cache: string | null = $persistentStore.read("bilipgc_db");
    if (cache !== null && cache.length >= 1048576 * 10) {
      log("[Init Cache] Cache Size > 10MB");
      cache = null; // 超过 10MB 清空缓存
    }
    if (cache !== null) {
      try {
        this.cache = JSON.parse(cache);
        if (this.cache.version !== latestVersion) {
          log(`[Init Cache] Update Cache Version | ${this.cache.version} -> ${latestVersion}`);
          cache = null;
        }
        else if (Date.now() - this.cache.initTime > 31 * 86400000) {
          log(`[Init Cache] initTime > 31 days | initTime: ${this.cache.initTime}`);
          cache = null; // 超过 31 天清空缓存
        }
      } catch (e) {
        log(`[Init Cache] Parse Cache Error: ${e}`);
        cache = null;
      }
    }
    if (cache === null) {
      this.cache = {
        proxy: {
          HK: [],
          TW: [],
          MO: [],
          N: [],
        },
        initTime: Date.now(),
        version: latestVersion,
      };
      $persistentStore.write(JSON.stringify(this.cache), "bilipgc_db");
    }
  }

  proxy = {
    /**
     * Get Proxy Info
     * @param id mdid/epid/ssid
     * @returns HK/TW/MO/N/null
     */
    get: (id: string): areas | null => {
      if (this.cache.proxy.HK.includes(id)) return "HK";
      if (this.cache.proxy.TW.includes(id)) return "TW";
      if (this.cache.proxy.MO.includes(id)) return "MO";
      if (this.cache.proxy.N.includes(id)) return "N";
      return null;
    },
    /**
     * Add Proxy Info
     * @param id mdid/epid/ssid
     * @param prox N/HK/TW/MO
     */
    add: (id: string, proxy: areas): void => {
      let needUpdate = false;
      if (proxy === "N") {
        if (!this.cache.proxy.N.includes(id)) {
          needUpdate = true;
        }
      } else if (proxy === "HK") {
        if (!this.cache.proxy.HK.includes(id)) {
          needUpdate = true;
        }
      } else if (proxy === "TW") {
        if (!this.cache.proxy.TW.includes(id)) {
          needUpdate = true;
        }
      } else if (proxy === "MO") {
        if (!this.cache.proxy.MO.includes(id)) {
          needUpdate = true;
        }
      }

      if (needUpdate) {
        log(`Add Cache Proxy | id: ${id} | proxy: ${proxy}`);
        this.cache.proxy[proxy].push(id);
        $persistentStore.write(JSON.stringify(this.cache), "bilipgc_db");
      }
    },
    /**
     * Delete Proxy Info
     * @param id mdid/epid/ssid
     */
    delete: (id: string): void => {
      let needUpdate: "N" | "HK" | "TW" | "MO" | false = false;
      if (this.cache.proxy.HK.includes(id)) needUpdate = "HK";
      else if (this.cache.proxy.TW.includes(id)) needUpdate = "TW";
      else if (this.cache.proxy.MO.includes(id)) needUpdate = "MO";
      else if (this.cache.proxy.N.includes(id)) needUpdate = "N";

      if (needUpdate) {
        log(`Delete Cache Proxy | id: ${id} | proxy: ${needUpdate}`);
        this.cache.proxy[needUpdate].splice(this.cache.proxy[needUpdate].indexOf(id), 1);
        $persistentStore.write(JSON.stringify(this.cache), "bilipgc_db");
      }
    }
  };
};
