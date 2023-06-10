import URL from "url-parse";

import { checkNull } from "../utils";
import { Fetch, log } from "./utils";

// --- CONFIG ---
const APIHost = "https://bilipgc.cfm.moe";
// --- CONFIG ---

const { hostname, pathname } = new URL($request.url);

log(`url: ${$request.url} | hostname: ${hostname} | pathname: ${pathname}`);

(async (): Promise<never> => {
  if (hostname === "api.bilibili.com" && pathname === "/x/player/v2") {
    const body_json = (() => {
      try {
        return JSON.parse($response.body as string) as {
          code: number; // 0 ok
          message: string;
          ttl: number;
          data: {
            subtitle: {
              allow_submit: boolean;
              lan: string;
              lan_doc: string;
              subtitles: {
                ai_status: number;
                ai_type: number;
                id: number;
                id_str: string;
                is_lock: boolean;
                lan: string;
                lan_doc: string;
                subtitle_url: string;
                type: number;
              }[];
            };
          };
        };
      } catch (e) {
        return null;
      }
    })();
    if (body_json !== null) {
      const zhHantSubtitle_Info =
        body_json.data.subtitle?.subtitles?.find(i => i.lan === "zh-Hant"); // B站繁体字幕信息
      if (zhHantSubtitle_Info !== undefined) {
        const zhHantSubtitle_Url =
          zhHantSubtitle_Info.subtitle_url.startsWith("http") ?
            zhHantSubtitle_Info.subtitle_url :
            `https:${zhHantSubtitle_Info.subtitle_url}`;
        log(`zhHantSubtitle_Info SUCCESS | zhHantSubtitle_Url: ${zhHantSubtitle_Url}`);

        // 获取简体字幕URL
        const zhHansSubtitle_Url = await (async (): Promise<string | null> => {
          const { response, data } = await Fetch.post({
            url: `${APIHost}/api/addSubtitle`,
            body: {
              subtitleUrl: zhHantSubtitle_Url,
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
          if (body_json.data.subtitle !== undefined) {
            body_json.data.subtitle.subtitles.unshift({
              ...zhHantSubtitle_Info,
              id: zhHantSubtitle_Info.id + 1,
              id_str: String(zhHantSubtitle_Info.id + 1),
              lan: "zh-Hans",
              lan_doc: "繁化姬-简体",
              subtitle_url: zhHansSubtitle_Url,
            }); // 添加简体字幕信息到字幕列表顶部

            $done<Response$done>({
              body: JSON.stringify(body_json),
            });
          }
        }
      };
    }
  }

  $done({});
})().catch((e) => {
  // 异常处理
  log(`⚠ Public Error: ${e}`);
  $done({});
});
