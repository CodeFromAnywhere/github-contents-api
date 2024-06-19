import unzipper from "unzipper";
import { PassThrough, Readable } from "stream";

const json = (data: any) => {
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
    },
  });
};
export const mergeObjectsArray = <T extends { [key: string]: any }>(
  objectsArray: T[],
): T => {
  const result = objectsArray.reduce((previous, current) => {
    return { ...previous, ...current };
  }, {} as T);

  return result;
};

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

  console.log({ apiUrl });
  const response = await fetch(apiUrl);

  response.headers.forEach((value, key) => {
    console.log({ key, value });
  });

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

const shouldIncludeFile = (
  filePath: string,
  includeExt: string[] | undefined,
  excludeExt: string[] | undefined,
  includeDir: string[] | undefined,
  excludeDir: string[] | undefined,
) => {
  const ext = filePath.split(".").pop()!;

  if (includeExt && !includeExt.includes(ext)) return false;
  if (excludeExt && excludeExt.includes(ext)) return false;
  if (includeDir && !includeDir.some((d) => filePath.startsWith(d)))
    return false;
  if (excludeDir && excludeDir.some((d) => filePath.startsWith(d)))
    return false;

  return true;
};

const streamToString = (
  stream: NodeJS.ReadableStream,
): Promise<string | null> => {
  const chunks: any[] = [];

  return new Promise<string | null>((resolve, reject) => {
    const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });

    stream.on("data", (chunk) => {
      try {
        // Decode each chunk to check for UTF-8 validity
        decoder.decode(chunk, { stream: true });
        chunks.push(chunk);
      } catch (error) {
        // If an error is thrown, the stream is not valid UTF-8
        resolve(null);
      }
    });
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", () => resolve(null));
  });
};
