import pako from "pako";
import URL from "url-parse";

import { checkNull } from "../utils";
import { DmViewReply } from "./protos/bilibili.community.service.dm.v1/DM";
import { PlayViewReq } from "./protos/bilibili.pgc.gateway.player.v2/PlayURL";
import { Cache, Fetch, checkPGCID, log, newRawBody } from "./utils";

// --- CONFIG ---
const APIHost = "https://bilipgc.cfm.moe";
// --- CONFIG ---

const cache = new Cache();
const { pathname } = new URL($request.url);

log(`url: ${$request.url} | pathname: ${pathname}`);

(async (): Promise<never> => {
  if (pathname === "/bilibili.pgc.gateway.player.v2.PlayURL/PlayView") {
    const rawBody = ($request as Response$request).body as Uint8Array;
    log(`rawBody === undefined: ${rawBody === undefined}`);

    const rawBody_header = rawBody.slice(0, 5);
    let rawBody_body = rawBody.slice(5);
    if (rawBody_header?.[0] === 1) {
      // Gzip
      rawBody_body = pako.ungzip(rawBody_body);
    }

    const rawBody_body_json = PlayViewReq.fromBinary(rawBody_body);

    const checkPGCID_data = await (async (): Promise<"HK" | "TW" | "MO" | null> => {
      for (const [id, prefix] of [[rawBody_body_json.epId, "ep"], [rawBody_body_json.seasonId, "ss"]]) {
        if (id !== 0 && !checkNull(id)) {
          const idStr = `${prefix}${id}`;

          const cacheData = cache.proxy.get(idStr);
          if (cacheData !== null) {
            log(`HIT Cache ${idStr} | Proxy: ${cacheData}`);
            return cacheData === "N" ? null : cacheData; // 命中缓存
          }

          const checkData = await checkPGCID(idStr);
          if (checkData === "error") {
            return null;
          } else {
            cache.proxy.add(idStr, checkData);
            log(`ADD Cache | pgcID: ${idStr} | Proxy: ${checkData}`);
            if (checkData === "N") return null;
            else return checkData;
          }
        }
      }
      return null;
    })();

    log(`checkPGCID_data: ${checkPGCID_data}`);
    if (checkPGCID_data !== null) {
      const headers = ($request as Response$request).headers;
      headers["X-Surge-Policy"] = `BiliPGC ${checkPGCID_data}`;
      $done<Request$done>({
        url: $request.url,
        body: ($request as Response$request).body,
        headers,
      });
    }
  } else if (pathname === "/bilibili.community.service.dm.v1.DM/DmView") {
    let rawBody: Uint8Array = $response.body as Uint8Array;
    log(`rawBody === undefined: ${rawBody === undefined}`);

    const rawBody_header = rawBody.slice(0, 5);
    let rawBody_body: Uint8Array = rawBody.slice(5);
    if (rawBody_header?.[0] === 1) {
      // Gzip
      rawBody_body = pako.ungzip(rawBody_body);
    }

    const rawBody_body_json = DmViewReply.fromBinary(rawBody_body);

    const zhHantSubtitle_Info =
      rawBody_body_json.subtitle?.subtitles?.find(i => i.lan === "zh-Hant"); // B站繁体字幕信息
    if (zhHantSubtitle_Info !== undefined) {
      log(`zhHantSubtitle_Info SUCCESS | zhHantSubtitle_Info.subtitleUrl: ${zhHantSubtitle_Info.subtitleUrl}`);

      // 获取简体字幕URL
      const zhHansSubtitle_Url = await (async (): Promise<string | null> => {
        const { response, data } = await Fetch.post({
          url: `${APIHost}/api/addSubtitle`,
          body: {
            subtitleUrl: zhHantSubtitle_Info.subtitleUrl,
          }
        });
        if (response.status === 200 && !checkNull(data)) {
          const data_json: {
            code: number;
            msg: string;
            url: string;
          } | null = (() => {
            try {
              return JSON.parse(data);
            } catch (e) {
              log(`Parse API Response Data | data: ${String(data)}`, "error");
              return null;
            }
          })();
          if (data_json !== null && data_json.code === 200) return data_json.url;
          else log(`API Response Error Data | data_json: ${JSON.stringify(data_json)}`, "error");
        } else log(`API Response Error Data | response.status: ${response.status} | data: ${JSON.stringify(data)}`, "error");
        return null;
      })();
      if (zhHansSubtitle_Url !== null) {
        log(`zhHansSubtitle_Url Success | zhHansSubtitle_Url: ${zhHansSubtitle_Url}`);
        if (rawBody_body_json.subtitle !== undefined) {
          rawBody_body_json.subtitle.subtitles.unshift({
            ...zhHantSubtitle_Info,
            id: zhHantSubtitle_Info.id + 1n,
            idStr: `${zhHantSubtitle_Info.id + 1n}`,
            lan: "zh-Hans",
            lanDoc: "繁化姬-简体",
            subtitleUrl: zhHansSubtitle_Url,
          }); // 添加简体字幕信息到字幕列表顶部

          // 构建返回数据
          rawBody_body = DmViewReply.toBinary(rawBody_body_json);
          rawBody = newRawBody(rawBody_header, rawBody_body);

          const respHeaders = $response.headers;
          if (respHeaders?.["Content-Encoding"]) respHeaders["Content-Encoding"] = "identity";
          if (respHeaders?.["content-encoding"]) respHeaders["content-encoding"] = "identity";
          $done<Response$done>({
            body: rawBody,
            headers: respHeaders,
          });
        }
      }
    };
  };

  $done({});
})().catch((e) => {
  // 异常处理
  log(`⚠ Public Error: ${e}`);
  $done({});
});
