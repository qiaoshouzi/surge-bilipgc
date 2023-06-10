export default (msg: string, type: "log" | "error" = "log"): void => {
  if (type === "error") msg = `[⚠ Error] ${msg}`;

  console.log(msg);
};
