# bin

`run.mjs [--docs 10000] [--only rank|catalog]`: prints the host, starts the servers, runs each k6 script with `--summary-export`, stops the servers, exits with k6's status (99 when a threshold fails).
