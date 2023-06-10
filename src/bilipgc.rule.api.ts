import URL from "url-parse";

import { checkNull } from "../utils";
import { Cache, checkPGCID, log } from "./utils";

const cache = new Cache();
const { hostname, pathname, query } = new URL($request.url, true);

log(`url: ${$request.url} | hostname: ${hostname} | pathname: ${pathname}`);

(async (): Promise<never> => {
  let matched = false;
  if (
    (hostname === "space.bilibili.com" && pathname.startsWith("/11783021")) ||
    (hostname === "api.bilibili.com" && query.mid === "11783021") ||
    (hostname === "app.bilibili.com" && query.vmid === "11783021")
  ) {
    // 哔哩哔哩番剧出差
    matched = true;
    $done<Rule$done>({ matched });
  } else {
    const pgcID = ((): string | undefined => {
      if (hostname === "www.bilibili.com" && /^\/bangumi\/play\/(ss|ep)\d+$/.test(pathname)) {
        return pathname.replace("/bangumi/play/", "");
      } else if (hostname === "api.bilibili.com" && [
        "/pgc/player/web/playurl",
        "/pgc/view/web/season",
        "/pgc/view/v2/app/season"
      ].includes(pathname)) {
        if (query.ep_id !== undefined) return `ep${query.ep_id}`;
        else if (query.season_id !== undefined) return `ss${query.season_id}`;
        else return undefined;
      }
    })();
    if (!checkNull([pgcID]) && typeof pgcID === "string") {
      const cacheData = cache.proxy.get(pgcID);
      if (cacheData !== null && cacheData !== "N") {
        matched = true;
      } else if (cacheData === null) {
        const checkData = await checkPGCID(pgcID);
        if (checkData === "error") {
          log(`checkPGC error | pgcID: ${pgcID}`, "error");
        } else {
          cache.proxy.add(pgcID, checkData);
          if (checkData !== "N") matched = true;
        }
      }
    }
  }

  $done({ matched });
})().catch((e) => {
  // 异常处理
  log(`⚠ Public Error: ${e}`);
  $done({});
});
