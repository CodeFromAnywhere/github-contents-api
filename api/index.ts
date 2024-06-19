import { Unzipped, unzip } from "fflate";

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
function isUtf8Encoded(bytes: Uint8Array) {
  try {
    new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes);
    return true;
  } catch {
    return false;
  }
}

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const includeExt = url.searchParams.get("include-ext")?.split(",");
  const excludeExt = url.searchParams.get("exclude-ext")?.split(",");
  const excludeDir = url.searchParams.get("exclude-dir")?.split(",");
  const includeDir = url.searchParams.get("include-dir")?.split(",");

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

  const response = await fetch(apiUrl);

  if (!response.ok || !response.body) {
    return new Response("Failed to fetch repository", {
      status: response.status,
    });
  }

  // Get the response as a readable stream
  const reader = response.body.getReader();

  // Create a stream to accumulate the binary data
  const chunks = [];
  let done, value;

  while ((({ done, value } = await reader.read()), !done)) {
    if (value) {
      chunks.push(value);
    }
  }

  // Concatenate all chunks into a single Uint8Array
  const zipData = new Uint8Array(
    chunks.reduce((acc, chunk) => {
      const chunkArray = Array.from(chunk);
      return acc.concat(chunkArray);
    }, [] as number[]),
  );

  // Use fflate to unzip the data
  const files = await new Promise<Unzipped>((resolve, reject) => {
    unzip(zipData, {}, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

  // Prepare the response data
  const fileContents: { [name: string]: string } = {};
  for (const [name, file] of Object.entries(files)) {
    const isUtf8 = isUtf8Encoded(file);
    if (isUtf8) {
      fileContents[name] = new TextDecoder("utf-8").decode(file);
    } else {
      fileContents[name] = "Binary or non-UTF-8 encoded data";
    }
  }

  // Do the filtering
  const filteredKeys = Object.keys(fileContents)
    .filter((path) => {
      if (!includeExt) {
        return true;
      }
      return includeExt.find((ext) => path.endsWith("." + ext));
    })
    .filter((path) => {
      if (!excludeExt) {
        return true;
      }
      return !excludeExt.find((ext) => path.endsWith("." + ext));
    })
    .filter((path) => {
      if (!includeDir) {
        return true;
      }
      return includeDir.find((dir) => path.split("/").find((d) => d === dir));
    })
    .filter((path) => {
      if (!excludeDir) {
        return true;
      }
      return !excludeDir.find((dir) => path.split("/").find((d) => d === dir));
    });

  if (isJson) {
    const finalJson = filteredKeys.reduce(
      (previous, current) => ({
        ...previous,
        [current]: fileContents[current],
      }),
      {},
    );
    return json(finalJson);
  }

  const fileString = filteredKeys
    .map((path) => {
      return `${path}:\n-----------------------\n\n${fileContents[path]}`;
    })
    .join("\n\n-----------------------\n\n");
  return new Response(fileString);
};
