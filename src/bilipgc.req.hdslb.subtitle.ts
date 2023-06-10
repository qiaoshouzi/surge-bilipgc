import pako from "pako";
import URL from "url-parse";

import { checkNull } from "../utils";
import { Fetch, stringToSHA256 } from "./utils";

const { hostname, pathname } = new URL($request.url);

console.log(`url: ${$request.url} | hostname: ${hostname} | pathname: ${pathname}`);

(async (): Promise<never> => {
  if (/^https?:\/\/.*\.hdslb\.com\/.*bilipgc=true$/.test($request.url)) {
    const sha256 = stringToSHA256(hostname + pathname);
    const fileData = await (async (): Promise<string | null> => {
      const { response, data } = await Fetch.get(`https://bilipgc.cfm.moe/subtitle/${sha256}.json`);
      if (response.status === 200 && !checkNull(data)) {
        return data;
      } else return null;
    })();
    const headers = {
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Origin,No-Cache,X-Requested-With,If-Modified-Since,Pragma,Last-Modified,Cache-Control,Expires,Content-Type,Access-Control-Allow-Credentials,DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Cache-Webcdn,X-Bilibili-Key-Real-Ip,X-Upos-Auth,Range",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers": "Content-Length,X-Cache-Webcdn,Content-Type,Content-Length,Content-Md5",
      "Cache-Control": "max-age=31536000",
      "Code": "200",
      "Content-Encoding": "gzip",
      "Content-Type": "application/json",
      "Cross-Origin-Resource-Policy": "cross-origin",
    };
    if (fileData !== null) {
      console.log("替换成功");
      $done({
        response: {
          body: headers["Content-Encoding"] === "gzip" ? pako.gzip(fileData) : fileData,
          headers,
        },
      });
    }
  }

  $done({});
})().catch((e) => {
  // 异常处理
  console.log(`Error: ${e}`);
  $done({});
});
