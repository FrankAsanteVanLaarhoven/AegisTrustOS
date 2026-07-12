# Compliance matrix (UK-first framing)

> **Disclaimer:** This product facilitates evidence collection and human review. It is not legal advice and does not replace CQC registration, SIA licensing employment law, DBS registered body processes, or solicitor-drafted contracts.

## By vertical phase

### Concierge (ACTIVE)
Typically: photo ID, right to work, two professional references; role-specific licence/insurance (e.g. chauffeur, beauty).

### Security (WAITLIST scaffold)
Adds: proof of address, SIA where required, insurance; elevated manual review. No live marketplace matching until operational controls ship.

### Care (WAITLIST scaffold)
Adds: Enhanced DBS, safeguarding training evidence, insurance; medication cert flag only. No clinical workflows, rostering, or CQC claims in MVP.

## Product enforcement
- Checklists live in `src/lib/compliance/matrix.ts` and Category.checklistJson  
- Evaluate on apply; missing required items surface in ops evidence pack  
- Gaps → REQUEST_MORE or blocked confidence — never silent pass  
- Manual adjudication always for first verify  

## Sources framing (external)
UK guidance evolves — monitor DBS, SIA, Skills for Care / CQC publications when moving care/security to ACTIVE.
