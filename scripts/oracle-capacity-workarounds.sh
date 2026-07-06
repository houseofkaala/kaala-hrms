#!/usr/bin/env bash
# Oracle A1 "Out of capacity" — known issue in Mumbai and most regions.
set -euo pipefail

cat <<'GUIDE'

================================================================
  Oracle "Out of capacity" for VM.Standard.A1.Flex — Workarounds
================================================================

This is NOT a misconfiguration. OCI Always Free ARM instances are
heavily oversubscribed. Mumbai (ap-mumbai-1) is especially full.

TRY THESE (in order):
---------------------

1. DIFFERENT REGIONS (same account, new VCN each region)
   Hyderabad:  ap-hyderabad-1   ← often has better availability
   Singapore:  ap-singapore-1
   Tokyo:      ap-tokyo-1
   Seoul:      ap-seoul-1

   Create instance → change region dropdown (top-right) → repeat setup.

2. SMALLER A1 FIRST, THEN RESIZE
   Shape: VM.Standard.A1.Flex
   OCPUs: 1  (not 4)
   Memory: 6 GB
   Sometimes 1 OCPU provisions when 4 OCPU fails.
   After it runs, try Instance → Edit → scale to 4 OCPU / 24 GB.

3. AMD MICRO FALLBACK (Always Free, usually available)
   Shape: VM.Standard.E2.1.Micro
   1 GB RAM — tight but works without Docker:
   ./scripts/deploy-e2-direct.sh

4. RETRY AT OFF-PEAK TIMES
   Try: 2–6 AM IST, or weekends.
   Some users succeed after 20–50 attempts over several days.

5. AUTOMATED RETRY (OCI CLI — optional)
   Install: https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm
   Loop create until success (may take hours/days).

6. IF STILL BLOCKED — USE RENDER (FREE, WORKS NOW)
   ./scripts/deploy-hostinger-render.sh
   Hostinger DNS + Render hosting + free SSL.
   Trade-off: sleeps after 15 min idle; data resets on redeploy.

GUIDE