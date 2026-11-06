# bin

The process entry point. `main.ts` builds identity from the environment, runs one sweep, prints one JSON
report line, and with `--once` exits; without it, it sweeps every 15 minutes. It lives outside `src/` because
`src/` holds the four sweep files and a folder holds at most five files with its README.
