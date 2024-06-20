export const shouldIncludeFile = (
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

export const streamToString = (
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

export const json = (data: any) => {
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
