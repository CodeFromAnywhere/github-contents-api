# 19th June, 2024

The first version, available at https://github.com/CodeFromAnywhere/github-contents-worker was hosted at Cloudflare.

However, it became evident quickly that Cloudflares woker limits are too limited for downloading a large zipfile and unzipping it.

I therefore changed everything to use the [Vercel Functions](https://vercel.com/docs/functions). The first problem I encountered is it's not so straightforward to create a catch-all endpoint - something that was easy with Cloudflare, due to the routing mechanism Vercel and Next has implemented everywhere.

However, I found a neat little trick; my setting my `vercel.json` to this, ensures everything leads to `index.ts`.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/:path*",
      "destination": "/api/index.ts"
    },
    {
      "source": "/",
      "destination": "/api/index.ts"
    }
  ],
  "functions": { "api/*.ts": { "maxDuration": 60, "memory": 1024 } },
  "public": true
}
```

Also, the max duration of the function is now 60s, the max for the free plan. This is quite a lot.

## Streaming instead of naive unzip library

After hosting it on vercel, things still didn't go well. After switching `fflate` into `unzipper`, things become much faster and I can now download big repos of over 100MB without timing out.

# 20th June 2024

I tried isomorphic-git. However, it doesn't support `--filter blob:none` yet which makes it too slow to put on a vercel function.

See https://github.com/isomorphic-git/isomorphic-git/issues/1123 and https://github.com/isomorphic-git/isomorphic-git/issues/685#issuecomment-455423505

Also, `git` through `child_process` also doesn't seem to work on vercel easily.

If that would work, maybe this would be a great way to get all logging information for any repo, including recent changes and all kinds of statistics.

For now let's let it pass.

# 24th of June, 2024

Discovered github has this feature too, at least for PR's:

> ProTip! Add .patch or .diff to the end of URLs for Git’s plaintext views.

When did this get added? Is it part of the API? Let's proxy this feature so I have it documented.
