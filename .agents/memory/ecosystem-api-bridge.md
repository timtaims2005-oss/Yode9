---
name: Ecosystem API bridge
description: Web, Expo, and chat access the ecosystem through a shared governed API contract.
---

The ecosystem now has a shared server boundary for status and governed runs. Web and Expo use the same contract, while legacy chat remains intact and can opt into ecosystem context through pipeline options. Sensitive runs fail closed without a TEE provider, and provider availability is reported from runtime configuration.

**Why:** A shared API boundary prevents duplicated orchestration behavior across web and mobile and keeps provider credentials out of clients.

**How to apply:** Add new ecosystem capabilities to the API contract first, then consume them from web/Expo. Keep external services adapter-based and explicitly unavailable until their real integration is authorized and configured.