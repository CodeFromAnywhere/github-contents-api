import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";
import git from "isomorphic-git";
import { json } from "./util.js";

export const GET = async (request: Request) => {
  const url = new URL(request.url);

  const [_, __, owner, repo] = url.pathname.split("/");

  console.log("LOGLOG");
  if (!owner) {
    return new Response(
      "You can use this API by going to /log/{owner}/{repository}",
      { status: 404 },
    );
  }

  if (!repo) {
    return new Response("Please add your repository", { status: 404 });
  }

  const tempFolder = "/tmp";
  const repoFolder = path.join(tempFolder, repo);
  if (fs.existsSync(repoFolder)) {
    // remove repo first
    fs.rmSync(repoFolder, { recursive: true });
  }

  spawnSync(
    `git clone --filter=blob:none --no-checkout https://github.com/${owner}/${repo}.git`,
    { cwd: tempFolder, shell: true },
  );

  const exists = fs.existsSync(repoFolder);

  console.log({ exists, tempFolder, repoFolder });

  const logs = await git.log({ fs, dir: repoFolder });

  return json(logs);
};
