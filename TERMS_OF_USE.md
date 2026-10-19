# TERMS_OF_USE.md — Terms of Use & Industrial Safety Disclaimer (Draft)

> **Platform**: ForgeWise AI (Vikrant 5.0 Platform)  
> **Effective Date**: October 20, 2026  
> **Notice**: This document is a technical and operational draft. Review and endorsement by qualified legal counsel in the governing jurisdiction is required prior to production deployment.

---

## 1. Acceptance of Terms
By accessing or using ForgeWise AI ("the Platform"), you and the legal entity you represent ("Customer", "Organization", "You") agree to be bound by these Terms of Use. If you do not have authorization to bind your organization or do not agree with these terms, do not use the Platform.

---

## 2. Safety-Critical Operational Disclaimer

### 2.1 Decision-Support Nature of the Platform
**ForgeWise AI is an automated technical retrieval and diagnostic decision-support system. It does NOT replace qualified, certified engineering personnel, approved plant safety protocols, or physical inspection.**

### 2.2 Mandatory Verification & Lockout/Tagout (LOTO) Compliance
1. **Physical Verification Required**: All machine clearances, torque values, pressure ratings, voltage limits, and chemical isolation sequences retrieved by the assistant must be verified against the official physical SOP document and OEM manual before executing maintenance.
2. **Hazardous Operations**: Prior to performing work on electrical panels, high-pressure steam/hydraulic lines, rotating machinery, or confined spaces, personnel MUST follow certified facility Lockout/Tagout (LOTO) procedures, de-energization checks, and safety interlocks.
3. **No Safety Bypass**: The Platform must never be used to circumvent physical safety interlocks, bypass machine emergency-stop (E-Stop) circuitry, or perform uncertified field modifications.

---

## 3. Account Responsibilities & Role Permissions
- Access is restricted to authorized personnel who have been provisioned credentials by their Organization Administrator.
- Users are responsible for safeguarding access tokens and passwords.
- Users must only perform actions permitted by their assigned organizational role (`Viewer`, `Operator`, `Engineer`, `Knowledge Manager`, `Org Admin`). Attempting to bypass role controls or access cross-tenant data is strictly prohibited and constitutes a material breach.

---

## 4. Acceptable Use and Prohibited Misuse
You agree not to:
- Upload files containing malicious software, macros, weaponized exploits, or unauthorized intellectual property.
- Attempt prompt injection or indirect jailbreaks intended to exfiltrate system prompts, database records, or third-party tenant data.
- Attempt to reverse engineer, decompile, or extract the source code or proprietary embeddings of the platform.
- Abuse API endpoints through automated scraping or deliberate denial-of-service traffic.

---

## 5. Intellectual Property & Uploaded Documentation
- **Customer Ownership**: The Customer retains all right, title, and interest in and to all manuals, SOPs, engineering schematics, and plant documentation uploaded to the platform.
- **Limited Processing License**: Customer grants the Platform a limited, non-exclusive license solely to parse, chunk, embed, index, and query uploaded content for Customer's authorized users.
- **Platform IP**: The ForgeWise AI software architecture, user interfaces, 3D interactive assembly visualizer, and custom algorithms remain the exclusive property of the Platform operator.

---

## 6. Service Availability & Third-Party Dependencies
While we design for 99.9% uptime, availability depends on external hosting, PostgreSQL infrastructure, and third-party AI provider inference APIs. Maintenance windows, upstream provider degradation, and scheduled updates may cause intermittent downtime.

---

## 7. Limitation of Liability
To the maximum extent permitted by applicable law, neither the Platform operator nor its licensors shall be liable for any indirect, incidental, consequential, or punitive damages, including machine equipment damage, plant downtime, production interruptions, or personal injury resulting from reliance on generated diagnostic output or failure to follow approved physical plant safety procedures.

---

## 8. Governing Law & Jurisdiction
- **Governing Jurisdiction Placeholder**: `[INSERT_APPLICABLE_STATE_OR_COUNTRY_JURISDICTION]`  
- **Dispute Resolution**: Any disputes arising under these terms shall be resolved through binding arbitration in `[INSERT_ARBITRATION_CITY_PLACEHOLDER]`.
- **Legal Notice Address**: `[LEGAL_ENTITY_NOTICE_ADDRESS_PLACEHOLDER]`
