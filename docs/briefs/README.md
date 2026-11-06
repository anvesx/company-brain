# docs/briefs

One brief per builder session. A brief names the goal, the files the builder owns, the frozen contract
tests the builder must turn green without editing, the commands that prove it, and what is out of scope.
Briefs never overlap in owned files.

| Brief                           | Package                                        | Status                         |
| ------------------------------- | ---------------------------------------------- | ------------------------------ |
| [graph-view.md](graph-view.md) | `modules/graph-view`, `apps/brain`, graph-store batch reads | Contract red, build pending |
