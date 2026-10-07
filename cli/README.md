# itaiagami

Command-line client for the [Itai Agami API](https://itaiagami.com/developers.html). Itai Agami is an independent Creative Director. Use this client to look up his services and case studies, read any page of the site as Markdown, and send a project enquiry. It has no dependencies and needs Node 18 or later.

```sh
# without installing
curl -fsSLO https://itaiagami.com/cli/itaiagami.mjs
node itaiagami.mjs services

# once published to npm
npx itaiagami services
```

| Command | What it does |
| --- | --- |
| `itaiagami services` | Lists the services and the starting price in each market |
| `itaiagami projects [--category Brand\|Culture\|Technology]` | Lists the case studies |
| `itaiagami project <slug>` | Shows one case study, e.g. `channel-13` |
| `itaiagami page [path]` | Prints any page as Markdown, e.g. `/about` |
| `itaiagami enquire --name … --email … --project … [--dry-run]` | Sends a project enquiry. It asks you to confirm first; `--dry-run` checks the enquiry without sending it |

Add `--json` to any command to get the raw API response. Add `--base <url>` or set `ITAIAGAMI_API_BASE` to use a different deployment. Exit codes: `0` success, `1` API or network error, `2` usage error.

Publishing (maintainer): from this folder, run `npm publish`.
