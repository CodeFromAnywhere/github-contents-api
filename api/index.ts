import unzipper from "unzipper";
import { PassThrough, Readable } from "stream";
import { json, shouldIncludeFile, streamToString } from "./util.js";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const ext = url.searchParams.get("ext")?.split(",");
  const dir = url.searchParams.get("dir")?.split(",");
  const excludeExt = url.searchParams.get("exclude-ext")?.split(",");
  const excludeDir = url.searchParams.get("exclude-dir")?.split(",");

  const [_, owner, repo, branch] = url.pathname.split("/");
  const isJson = request.headers.get("accept") === "application/json";

  if (!owner) {
    return new Response(
      "You can use this API by going to /{owner}/{repository}/{branch}",
      { status: 404 },
    );
  }

  if (!repo) {
    return new Response("Please add your repository", { status: 404 });
  }

  if (!branch) {
    // for now, redirect to main always
    const newUrl = `${url.origin}/${owner}/${repo}/main`;
    return Response.redirect(newUrl, 302);
  }

  const apiUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;

  console.log({ apiUrl, url: request.url, method: request.method });
  const response = await fetch(apiUrl);

  if (!response.ok || !response.body) {
    return new Response("Failed to fetch repository", {
      status: response.status,
    });
  }
  const fileContents: { [name: string]: string } = {};

  const nodeStream = new PassThrough();
  Readable.fromWeb(response.body as any).pipe(nodeStream);

  // Stream the response and unzip it
  const unzipStream = nodeStream
    .pipe(unzipper.Parse())
    .on("entry", async (entry) => {
      const filePath = entry.path;
      const type = entry.type; // 'Directory' or 'File'
      const nameWithoutPrefix = filePath.split("/").slice(1).join("/");

      if (type === "File") {
        if (
          shouldIncludeFile(nameWithoutPrefix, ext, excludeExt, dir, excludeDir)
        ) {
          const content = await streamToString(entry);
          fileContents[nameWithoutPrefix] =
            content ||
            `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${nameWithoutPrefix}`;
        } else {
          entry.autodrain();
        }
      } else {
        entry.autodrain();
      }
    });

  // Wait until the stream is finished
  await new Promise((resolve, reject) => {
    unzipStream.on("end", resolve);
    unzipStream.on("error", reject);
  });

  if (isJson) {
    return json(fileContents);
  }

  const fileString = Object.keys(fileContents)
    .map((path) => {
      return `${path}:\n-----------------------\n\n${fileContents[path]}`;
    })
    .join("\n\n-----------------------\n\n");
  return new Response(fileString);
};
