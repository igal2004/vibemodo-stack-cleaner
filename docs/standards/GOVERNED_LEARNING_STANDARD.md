# VIBEMODO Stack Cleaner Governed Learning Standard

**Status:** Mandatory app-specific architecture and governance standard.  
**Applies to:** VIBEMODO Stack Cleaner, including app/script stack audits, theme and storefront residue detection, installed-app signature matching, cleanup recommendations, remediation previews, backup/restore guidance, and future stack-cleanup intelligence.

---

## 1. Core Rule

Stack Cleaner may learn from scan findings, installed-app signature matches, unattributed scripts, merchant accepted/rejected cleanup tasks, stale-preview blocks, remediation outcomes, and backup/restore outcomes.

However, cleanup behavior must remain controlled, explainable, merchant-approved, privacy-safe, auditable, backup-aware, and reversible where feasible.

Short rule:

```text
Learn cleanup risk patterns. Recommend safe cleanup. Never delete theme/app artifacts automatically. Snapshot before writes. Never claim attribution without evidence.
```

---

## 2. Approved Learning Inputs

- Stack scan history.
- Script and theme artifact findings.
- Installed-app signature matches.
- Unattributed script patterns.
- Merchant accepted/rejected cleanup recommendations.
- Remediation preview outcomes.
- Stale-preview blocks.
- Backup and restore outcomes.
- Storefront/theme scan results.
- Audit trail outcomes.

Restricted inputs:

- Customer-identifying data not required for stack cleanup.
- Identifiable cross-store theme or app-stack data.
- Private merchant app-stack strategy copied to another merchant.
- Unsupported assumptions about app ownership or script safety.

---

## 3. Learning Outputs

The app may produce:

- Better script attribution recommendations.
- Risk prioritization for app residue.
- Safer cleanup recommendations.
- Backup-required warnings.
- Theme/app artifact classification improvements.
- Merchant-specific cleanup playbooks.
- Rule or scoring improvements when versioned and governed.

Outputs must distinguish:

- verified attribution
- likely attribution
- unattributed artifact
- cleanup risk
- recommendation
- preview
- approved action
- applied change
- informational insight only

---

## 4. Merchant Control Modes

Required modes:

- Recommendations Only: no writes or cleanup actions.
- Approve Before Apply: default for theme, script, config, asset, or app-residue cleanup.
- Auto-Optimize Safe Mode: allowed only for read-only prioritization, grouping, or reporting improvements.
- Strict Manual Mode: all learned changes require explicit approval.

---

## 5. Versioning Requirements

Version before production-impacting use:

- script attribution rules
- app signature mappings
- cleanup risk scoring
- remediation eligibility rules
- backup requirements
- AI prompts used for cleanup recommendations
- stale-preview and safety classifiers

---

## 6. Safety Guardrails

The app must not:

- delete theme files, app blocks, scripts, assets, snippets, pixels, checkout-related code, legal/trust scripts, analytics, payment scripts, or storefront code automatically.
- claim a script belongs to a specific app without evidence.
- remove active tracking, checkout, payment, accessibility, security, consent, or legal functionality without explicit merchant approval.
- bypass backup/snapshot requirements where a write could affect storefront behavior.
- apply stale previews.
- mutate without audit log.
- use identifiable cross-store app-stack data.
- guarantee performance improvement without evidence.

---

## 7. Audit, Snapshot, And Rollback

Every production-impacting learned action must log:

- shop.
- theme/resource/script/artifact reference.
- rule or scoring version.
- attribution evidence.
- cleanup recommendation.
- preview state.
- merchant decision.
- backup/snapshot reference where feasible.
- applied change.
- timestamp.
- verification outcome.

Rollback or restore-from-snapshot must exist where feasible for theme, script, asset, and cleanup changes.

---

## 8. Experiments

Allowed experiments:

- comparing read-only prioritization strategies.
- improving explanation quality.
- ranking cleanup risks more accurately.
- testing attribution confidence thresholds in read-only mode.

Not allowed:

- automatic deletion or mutation experiments.
- testing cleanup on live storefront without approval and backup.
- sharing identifiable app-stack data across merchants.

---

## 9. Beta Gate

Stack Cleaner is not governed-learning ready until:

```text
[ ] Learning inputs are documented
[ ] Default mode is Approve Before Apply for cleanup writes
[ ] Recommendations separate verified attribution from likely attribution and unknown artifacts
[ ] Cleanup actions require preview, approval, and backup/snapshot where feasible
[ ] Stale preview protection is enforced
[ ] Audit logs are required for mutations
[ ] Performance improvement guarantees are blocked
[ ] Cross-store identifiable learning is disabled
[ ] Rule/scoring versions are traceable
[ ] Evidence log records current status
```

---

## 10. Product Principle

Stack Cleaner should become smarter about safe app-stack cleanup, but never by silently deleting merchant assets or pretending uncertain attribution is proven.
