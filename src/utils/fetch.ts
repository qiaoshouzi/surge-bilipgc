type Method = "post" | "get" | "put" | "delete" | "head" | "options" | "patch";
type Query = string | HttpClientOptions;

function fetch<T = any>(query: Query, method: Method): Promise<{
  response: HttpClientCallbackResponse,
  data: T
}> {
  return new Promise((resolve, reject) => {
    $httpClient[method](query, (error: any | null, response: HttpClientCallbackResponse, data: any) => {
      if (error) reject(error);
      else resolve({ response, data });
    });
  });
};

export default {
  post: <T = any>(query: Query) => fetch<T>(query, "post"),
  get: <T = any>(query: Query) => fetch<T>(query, "get"),
  put: <T = any>(query: Query) => fetch<T>(query, "put"),
  delete: <T = any>(query: Query) => fetch<T>(query, "delete"),
  head: <T = any>(query: Query) => fetch<T>(query, "head"),
  options: <T = any>(query: Query) => fetch<T>(query, "options"),
  patch: <T = any>(query: Query) => fetch<T>(query, "patch"),
};
