# Security Policy

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability, exposed credential, or privacy incident. Contact the rifKANDO security owner privately with the affected URL or component, reproduction steps, impact, and any relevant logs. Do not include customer data, payment information, identity documents, tokens, passwords, or private keys in the report.

The security owner should acknowledge the report within two business days, triage severity, revoke or rotate exposed credentials, contain active exploitation, and document the resolution in the administrative audit trail.

## Required GitHub repository settings

These controls are configured in GitHub, not in application code. Enable them before public launch:

- Enable the dependency graph, Dependabot alerts, and Dependabot security updates.
- Enable secret scanning and push protection. Review every alert as a potential exposure, even if the secret has been revoked.
- Enable GitHub Code Security before adding CodeQL and dependency-review required checks for a private repository. Those GitHub features may require an eligible plan.
- Protect `main`: require pull requests, require the `Quality Gate` check, require the `Repository and dependency security` check, dismiss stale approvals, and block force pushes and direct pushes.
- Restrict repository administrators and Actions workflow write access to trusted maintainers.

## Release rule

Do not deploy a release with unresolved critical or high security findings. A temporary exception requires a written risk decision, an expiry date, a compensating control, and an owner responsible for removal.
