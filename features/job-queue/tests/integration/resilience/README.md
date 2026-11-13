# Resilience tests

Process death and contention on real Postgres 16: SIGKILL mid-job (a real child process), SIGTERM
graceful shutdown, three nodes racing for one queue, and one tenant's 100,000-job backlog beside
another tenant's single job.
