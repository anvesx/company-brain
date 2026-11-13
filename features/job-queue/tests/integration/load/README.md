# Load tests

Fixed-rate producers against real workers and real Postgres 16, on one machine. They report queue
lag (enqueue to handler start) percentiles. The burst test is a 20 s burst, not the 5 min in the
checklist; the figures are one laptop, not a production cluster.
