import { BuildOptions, buildSync } from "esbuild";
import fs from "node:fs";
import path from "node:path";

const deleteFolderRecursive = (folderPath: string): void => {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // 递归删除子文件夹
        deleteFolderRecursive(curPath);
      } else {
        // 删除文件
        fs.unlinkSync(curPath);
      }
    });
    // 删除空文件夹
    fs.rmdirSync(folderPath);
  }
};

const globalOptions: BuildOptions = {
  minify: true,
  bundle: true,
  outdir: "./dist/",
};

try {
  deleteFolderRecursive(path.resolve(__dirname, "./dist/")); // 清空 dist 目录

  buildSync({
    ...globalOptions,
    entryPoints: [
      "./src/bilipgc.req.hdslb.subtitle.ts",
      "./src/bilipgc.rule.api.ts",
      "./src/bilipgc.resp.web.subtitle.ts",
    ],
  });

  buildSync({
    ...globalOptions,
    entryPoints: ["./src/bilipgc.grpc.ts"],
    inject: ["./src/text-polyfill.js"],
  });

  // .sgmodule
  fs.writeFileSync(
    path.resolve(__dirname, "./dist/BiliPGC.sgmodule"),
    fs.readFileSync(path.resolve(__dirname, "./BiliPGC.sgmodule"), "utf-8"),
    "utf-8"
  );
} catch (e) {
  process.stderr.write(e.stderr);
  process.exit(1);
};
