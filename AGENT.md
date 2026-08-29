Perform a complete audit of this entire project/codebase.

Your first priority is to UNDERSTAND the system, not modify it.

IMPORTANT:

- Do NOT modify, delete, rename, or create any files during the audit.
- Read and analyze the entire project, including frontend, backend, database, configuration, services, utilities, tests, and documentation.
- Use the available context efficiently and inspect as much of the codebase as possible.
- Do NOT read unrelated Windows/system files outside the project directory.
- Never expose API keys, passwords, tokens, secrets, or other credentials.
- Do not assume something is broken without checking the actual implementation.

Analyze and understand:

1. Overall project architecture and structure
2. Frontend and UI architecture
3. Backend architecture
4. Database schema, relationships, queries, and data flow
5. Authentication and authorization
6. User/account data isolation
7. API routes and services
8. State management
9. Local storage, caching, and persistence
10. Database synchronization and offline behavior
11. Error handling
12. Security vulnerabilities
13. Performance and unnecessary resource usage
14. Race conditions and async issues
15. Duplicate operations and repeated events
16. Data integrity and consistency
17. Form validation
18. Loading, empty, and error states
19. Responsive/mobile behavior
20. UI/UX consistency and layout problems
21. Accessibility
22. Testing coverage and missing tests
23. Build/deployment configuration
24. Dependencies and outdated/problematic packages
25. Dead, duplicated, or unnecessary code
26. Incomplete or partially implemented features
27. Potential bugs and edge cases
28. Technical debt
29. Overall code quality and maintainability

For every issue you find, provide:

- Severity: CRITICAL / HIGH / MEDIUM / LOW
- Exact file path
- Function/component/class involved
- What the problem is
- Why it is a problem
- How it should be fixed
- Possible side effects or risks of fixing it

Also identify:

- What is already implemented correctly
- What should NOT be changed
- Areas that need more investigation
- Missing functionality
- Potential problems that may only appear under real-world usage

Pay special attention to:

- Data being shared between different users/accounts
- Local storage overwriting database data
- Database synchronization conflicts
- Duplicate database writes
- Duplicate notifications/achievements/events
- Authentication state
- Async operations and race conditions
- Stale state
- Data loss
- Incorrect caching
- Security and authorization
- Performance when the dataset becomes large

At the end, produce a prioritized improvement roadmap:

PHASE 1 — Critical bugs and data-loss risks
PHASE 2 — Security and account/data-isolation issues
PHASE 3 — Major functional bugs
PHASE 4 — Synchronization and reliability
PHASE 5 — Performance
PHASE 6 — UI/UX and responsive issues
PHASE 7 — Code quality and maintainability
PHASE 8 — Optional improvements

For each phase, rank the tasks by priority and explain the recommended order.

Create a concise PROJECT_AUDIT.md containing the final audit findings and roadmap so it can be used as a reference in future sessions.

DO NOT FIX ANYTHING YET.

The goal of this first task is to build a complete understanding of the project and produce a reliable audit before any modifications are made.
