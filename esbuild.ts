import { BuildOptions, buildSync } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

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

  // hash
  const fileNameList = fs.readdirSync(path.join(__dirname, "dist")).filter((v) => v.endsWith(".js"));
  let newFileNameList: string[] = [];
  for (const fileName of fileNameList) {
    const rawFilePath = path.join(__dirname, "dist", fileName);
    const raw = fs.readFileSync(rawFilePath, "utf8");
    const hash = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 10);
    const newFileName = `${fileName.replace(/\.js$/, "")}.${hash}.js`;
    const newFilePath = path.join(__dirname, "dist", newFileName);
    fs.renameSync(
      rawFilePath,
      newFilePath
    );
    newFileNameList.push(newFileName);
    const fileSize = fs.statSync(newFilePath).size / 1024
    console.log(`${newFileName}   ${fileSize.toFixed(1)}kb`);
  }

  // .sgmodule
  let sgmoduleRaw = fs.readFileSync(path.join(__dirname, "./BiliPGC.sgmodule"), "utf8");
  for (const i in fileNameList) {
    const fileName = fileNameList[i];
    const newFileName = newFileNameList[i];
    sgmoduleRaw = sgmoduleRaw.replace(
      new RegExp(`https://bilipgc.cfm.moe/${fileName}`, "g"), `https://bilipgc.cfm.moe/${newFileName}`
    );
  }
  fs.writeFileSync(
    path.join(__dirname, "dist", "BiliPGC.sgmodule"),
    sgmoduleRaw, "utf8"
  );
} catch (e) {
  process.stderr.write(e.stderr);
  process.exit(1);
};
