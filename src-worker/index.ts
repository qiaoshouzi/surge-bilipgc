import { checkNull } from "../utils";
import { stringToSHA256 } from "./utils";

import { getAssetFromKV, NotFoundError } from "@cloudflare/kv-asset-handler";
// @ts-ignore
import manifestJSON from "__STATIC_CONTENT_MANIFEST";
const assetManifest = JSON.parse(manifestJSON);

type SubtitleData = {
  body: {
    content: string; // 字幕内容
    from: number; // 开始时间
    location: number; // 位置
    to: number; // 结束时间
  }[];
};

type FHJResponseData = {
  // https://docs.zhconvert.org/api/0-getting-started/#api-%E5%9B%9E%E6%87%89%E7%9A%84%E6%A8%99%E6%BA%96%E7%B5%90%E6%A7%8B
  code: number; //	错误码，非 0 时表示有错误发生
  msg: string; // 警告讯息或是错误讯息。
  data: {
    converter: string;
    text: string; // 翻译后的数据
    diff: string | null;
    usedModules: string[];
    jpTextStyles: string[];
    textFormat: string;
  };
  revisions: {
    build: string;
    msg: string;
    time: number;
  };
  execTime: number;
};

export interface Env {
  R2: R2Bucket;
  __STATIC_CONTENT: KVNamespace;
};

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // POST 请求的 body
    const body: { [key: string]: any } = await (async () => {
      if (request.method === "POST") {
        try {
          return await request.json();
        } catch (e) {
          return {};
        }
      } else return {};
    })();

    // 路由
    const respData = await (async (): Promise<{
      status: number;
      headers?: { [key: string]: string };
      body?: { [key: string]: any };
    }> => {
      // R2 Update
      if (pathname === "/api/addSubtitle" && request.method === "POST") {
        const { subtitleUrl: zhHantSubtitleUrl } = body;
        if (checkNull([zhHantSubtitleUrl])) {
          return {
            status: 400,
            body: { code: 400, msg: "参数错误" },
          };
        }
        if (!/^https?:\/\/.*hdslb\.com\/.*\.json?.*auth_key=.*$/.test(zhHantSubtitleUrl)) {
          return {
            status: 403,
            body: { code: 403, msg: "subtitleUrl 格式错误" },
          };
        }
        const zhHantSubtitleUrl_info = new URL(zhHantSubtitleUrl);
        const { hostname: zhHantSubtitleUrl_Hostname, pathname: zhHantSubtitleUrl_PathName } = zhHantSubtitleUrl_info;
        console.log(
          `zhHantSubtitleUrl_Hostname: ${zhHantSubtitleUrl_Hostname}`,
          `zhHantSubtitleUrl_PathName: ${zhHantSubtitleUrl_PathName}`
        );

        const r2Path = `subtitle/${await stringToSHA256(zhHantSubtitleUrl_Hostname + zhHantSubtitleUrl_PathName)}.json`;

        if (await env.R2.head(r2Path) === null) {
          // R2 中没有缓存
          console.log("R2 中没有缓存");

          const zhHantSubtitleData = await (async (): Promise<SubtitleData | null> => {
            return await fetch(zhHantSubtitleUrl)
              .then(async (resp) => {
                if (resp.status !== 200) return null;
                else return await resp.json() as SubtitleData;
              }).catch((e) => {
                console.log(e);
                return null;
              });
          })(); // 下载繁体字幕
          if (zhHantSubtitleData === null)
            return {
              status: 500,
              body: { code: 500, msg: `从 ${zhHantSubtitleUrl} 下载繁体字幕失败` },
            };
          console.log("下载繁体字幕成功");
          const zhHantSubtitleDataContents = (() => {
            try {
              return zhHantSubtitleData.body.map(i => i.content);
            } catch (e) {
              console.log(e);
              return null;
            }
          })(); // // B站繁体字幕内容[]
          if (zhHantSubtitleDataContents === null)
            return {
              status: 500,
              body: { code: 500, msg: `从 ${zhHantSubtitleUrl} 下载繁体字幕失败` },
            };
          console.log("获取繁体字幕内容成功");

          const zhHansSubtitle_DataContents = await (async (): Promise<string[] | null> => {
            return await fetch("https://api.zhconvert.org/convert", {
              method: "POST",
              body: JSON.stringify({
                outputFormat: "json",
                text: JSON.stringify(zhHantSubtitleDataContents),
                converter: "Simplified",
              }),
              headers: {
                "Content-Type": "application/json",
              },
            })
              .then(async (resp) => {
                if (resp.status !== 200) return null;
                else {
                  const data_json = await resp.json() as FHJResponseData;
                  console.log("繁化姬返回数据", JSON.stringify(data_json));
                  return JSON.parse(data_json.data.text) as string[];
                }
              }).catch((e) => {
                console.log(e);
                return null;
              });
          })(); // 繁化姬 繁体转简体 繁化姬简体字幕内容[]
          if (zhHansSubtitle_DataContents === null)
            return {
              status: 500,
              body: { code: 500, msg: "繁化姬繁体转简体失败" },
            };
          console.log("繁化姬繁体转简体成功");
          const zhHansSubtitle_DataBiliBili = {
            body: zhHansSubtitle_DataContents.map((value, index) => {
              const t = zhHantSubtitleData.body[index];
              t.content = value;
              return t;
            }),
          }; // 繁化姬简体字幕内容B站格式

          // 上传R2
          try {
            await env.R2.put(r2Path, JSON.stringify(zhHansSubtitle_DataBiliBili), {
              httpMetadata: {
                contentType: "application/json; charset=utf-8"
              }
            });
          } catch (e) {
            console.log(e);
            return {
              status: 500,
              body: { code: 500, msg: "R2Error" },
            };
          }
        }

        zhHantSubtitleUrl_info.searchParams.set("bilipgc", "true");

        return {
          status: 200,
          body: {
            code: 200,
            msg: "上传成功",
            url: zhHantSubtitleUrl_info.toString(),
          },
        };
      }

      return {
        status: 404,
      };
    })();

    // 构建 Response
    if (respData.status !== 404) {
      const resp = new Response(respData.body !== undefined ? JSON.stringify(respData.body) : null, {
        status: respData.status ?? 200,
      });
      const headers = respData.headers;
      if (headers !== undefined) {
        for (const key in headers) resp.headers.set(key, headers[key]);
      }
      if (respData.body !== undefined) {
        resp.headers.set("Content-Type", "application/json; charset=utf-8");
      }

      return resp;
    } else {
      return await getAssetFromKV({
        request,
        waitUntil: (promise: Promise<any>) => {
          ctx.waitUntil(promise);
        },
      }, {
        ASSET_NAMESPACE: env.__STATIC_CONTENT,
        ASSET_MANIFEST: assetManifest,
        cacheControl: {
          browserTTL: 60 * 60 * 24,
          edgeTTL: 60 * 60 * 24,
        },
      }).catch(async (e) => {
        if (e instanceof NotFoundError) return new Response("Not found", { status: 404 });
        else return new Response(e.message || e.toString(), { status: 500 });
      });
    };
  },
};
