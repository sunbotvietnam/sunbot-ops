# Sunbot Ops — focused next review

The current product goal is School Development & Opportunity Management. The following improvements are intentionally sequenced after the role/document upgrade rather than expanding Sunbot Ops into ERP scope.

1. **Approval exceptions on CEO dashboard** — pending Proposals; meetings completed without Discovery; Discovery completed without the post-meeting acknowledgement; E-profile opened but not followed up; opportunities idle beyond a threshold.
2. **Proposal + pricebook integration** — reuse the existing approved Sunbot pricebook/Quotation API so Proposal commercial sections use approved package/price data rather than free typing.
3. **Proposal versioning** — preserve v1.0, v1.1, etc. and approval history; never overwrite an externally shared final version.
4. **Re-entry intelligence** — require reason + recommended return date for NURTURE/BLOCKED/NOT_FIT outcomes so non-won meetings remain commercially useful.
5. **Leader dashboard** — show own portfolio plus Staff delegated portfolio with movement, overdue and approval exceptions, without exposing other leaders' teams.
6. **Staff quality KPI** — measure next-action hygiene, stage movement, useful field intelligence and meeting completeness; do not use call/email count alone.
7. **Server-side pagination/search** — introduce when outreach volume grows enough that loading up to 500 rows becomes a measurable startup cost.
8. **Document branding template** — once content flow is stable, move from generic Google Docs styling to one controlled Sunbot corporate template for Proposal and post-meeting PDF.
