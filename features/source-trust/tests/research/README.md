# Research replication

`synthetic.ts` builds a seeded world with pure-rand xoroshiro128plus (seed 42): 20 sources with
accuracy uniform in [0.3, 0.95], 500 items with 4 candidate values, and 5 copiers at share 0.8.
`replication.test.ts` measures precision for majority vote, accuracy rounds, and rounds plus copy
edges, prints each as "x of 500", and asserts the Dong 2009 Table 3 direction.
