import { Fetch, log } from ".";

type areas = "N" | "HK" | "TW" | "MO"; // N 代表不需要代理

const reqBiliBiliAPI = async (url: string, proxy: areas = "N"): Promise<{ [key: string]: any } | null> => {
  log(`reqBiliBiliAPI: ${url} | proxy: ${proxy}`);
  try {
    const { response, data } = await Fetch.get({
      url,
      policy: proxy === "N" ? "DIRECT" : `BiliPGC ${proxy}`,
    });
    const data_json = (() => {
      try {
        return JSON.parse(data);
      } catch (e) {
        return null;
      }
    })();
    if (response.status === 200 && data_json !== null) {
      if (data_json.code !== 0) {
        const newProxy = proxy === "N" ? "HK" : proxy === "HK" ? "TW" : proxy === "TW" ? "MO" : null;
        log(`Retry reqBiliBiliAPI | newProxy: ${newProxy}`);
        if (newProxy !== null) return await reqBiliBiliAPI(url, newProxy);
      } else return data_json;
    }
    log(`reqBiliBiliAPI can't get data | response.status: ${response.status} | data: ${JSON.stringify(data ?? {})}`, "error");
    return null;
  } catch (e) {
    log(`reqBiliBiliAPI throw error: ${e}`, "error");
    return null;
  };
};

const parseTitle = (title: string): areas => {
  // （僅限港澳台地區）
  if (/^.*僅限.*港.*地區.*$/.test(title)) return "HK";
  else if (/^.*僅限.*台.*地區.*$/.test(title)) return "TW";
  else if (/^.*僅限.*澳.*地區.*$/.test(title)) return "MO";
  else return "N";
};

/**
 * 获取番剧地区
 * @param id mdid/ssid/epid
 * @returns HK/TW/MO/null
 */
export default async (id: string): Promise<areas | "error"> => {
  let title: string;
  if (id.startsWith("md")) {
    // https://api.bilibili.com/pgc/review/user?media_id={mdid}
    const mdid = id.replace("md", "");
    log(`checkPGCID | type: md | params: ${mdid}`);
    const apiUrl = `https://api.bilibili.com/pgc/review/user?media_id=${mdid}`;
    const respData = await reqBiliBiliAPI(apiUrl);
    if (respData === null) return "error";
    else {
      try {
        title = respData.result.media.title;
        log(`PGC title success ${title}`);
      } catch (e) {
        log(`PGC title error ${e}`, "error");
        return "error";
      }
    }
  } else if (id.startsWith("ss") || id.startsWith("ep")) {
    // https://api.bilibili.com/pgc/view/web/season?season_id={ssid}&ep_id={epid}
    const params = id.startsWith("ss") ? `season_id=${id.replace("ss", "")}` : `ep_id=${id.replace("ep", "")}`;
    log(`checkPGCID | type: ss/ep | params: ${params}`);
    const apiUrl = `https://api.bilibili.com/pgc/view/web/season?${params}`;
    const respData = await reqBiliBiliAPI(apiUrl);
    if (respData === null) return "error";
    else {
      try {
        title = respData.result.title;
        log(`PGC title success ${title}`);
      } catch (e) {
        log(`PGC title error ${e}`, "error");
        return "error";
      }
    }
  } else {
    log(`checkPGCID | type: unknown | id: ${id}`, "error");
    return "error";
  }

  return parseTitle(title);
};
