# LifeSwap legal and privacy project review

Reviewed September 6, 2026. Scope: the mobile repository, including its React
screens, Capacitor host, Firebase client access, booking transport, native
permissions, and app configuration. This is a source review for drafting legal
documents, not a penetration test or certification of compliance.

The connected Netlify backend, its payment handlers, deployed Firestore rules,
Firebase console settings, processor contracts, database region, production logs,
and email delivery configuration are not included here and were not audited.
No live customer records were accessed, payments made, or accounts deleted.

## Confirmed business decisions from the follow-up interview

The following updates supersede earlier open business questions in this review:

- Operator: Itay Simchai, Israel; international service; contact
  `nadrty8@gmail.com`; postal address explicitly pending.
- English PDF and Word documents are included beside the source drafts.
- Customers: 16+ for online and in-person bookings. Providers: 18+.
  No blanket parental permission rule was requested. Mandatory local consent and
  contractual-capacity requirements still apply.
- Customer money enters Itay Simchai's PayPal account. Itay reviews transactions;
  provider payout is on the agreed session day, before the session, not immediately
  after payment approval.
- A 5%-10% customer service fee is added to the listed session price. Rate depends
  on provider profile/prominence and must be shown to the customer before payment.
  It is not a deduction from the provider's listed price.
- Provider cancellation or no-show: full refund including service fee.
  Customer cancellation at least 24 hours before: full refund including fee.
  Customer cancellation less than 24 hours before: half of the total including fee.
  Customer no-show without notice: no refund, subject to mandatory rights.
- Immediate deletion is the requested policy; the incomplete current implementation
  remains a material gap, explicitly disclosed in the draft. Limited legally
  necessary retention must be defined and is not a blanket exception.
- No analytics, advertisements, or marketing emails. Essential operational
  notifications and infrastructure processing remain applicable.

### Implementation differences still to resolve

The inspected client has a session `price` but no demonstrated separate service-fee
amount/rate, fee-inclusive refund calculation, manual payout ledger, or no-show
state. The live payment backend was not available for verification. Match the
checkout and refund implementation to the interview before publishing these Terms.
Enforce age eligibility on customer/provider workflows and resolve the legality
and safety of international bookings by minors, especially in-person meetings.
Do not claim immediate deletion until it covers eligible shared/copied records.

PayPal's Israeli individual-account agreement requires age 18+. LifeSwap's 16+
customer policy does not override payment-account eligibility. A compliant payment
path for minors still needs verification.
[PayPal Israel agreement](https://www.paypal.com/il/legalhub/paypal/useragreement-full?locale.x=en_IL)

Israeli law places conditions on minors' legal transactions; the draft preserves
legally required consent rather than promising that parental consent is never
needed. International requirements also vary.
[Israeli Legal Capacity and Guardianship Law](https://www.gov.il/BlobFolder/generalpage/guardian_080825/he/guardianlaw0725.pdf)

The operator's standard refund schedule must yield to mandatory cancellation and
consumer remedies. Israeli distance-selling guidance describes statutory rights
which cannot be replaced merely by labeling a fee non-refundable.
[Israeli consumer guidance](https://www.gov.il/BlobFolder/generalpage/general_tuota/he/EN_Brushur_SITE.PDF)

Privacy disclosures should explain whether supplying data is voluntary and what
happens if required information is withheld; this has been added to the draft.
[Israeli Privacy Protection Authority guidance](https://www.gov.il/BlobFolder/rfp/data_minimization_public_hearing/en/PPA%20Opinion%20on%20Data%20Minimization%20-%20English%20Translation.pdf)

To regenerate the PDF, Word, and Markdown files after editing the JSON content,
run `python scripts/legal/export_documents.py` with `python-docx` and `reportlab`
installed. This command does not publish or deploy the documents.

## Earlier source-review findings

The remaining sections preserve the source-review evidence. Historical references
to unknown business choices or the former 18+ customer policy are superseded by
the confirmed interview decisions above; missing backend evidence remains missing.

## Deliverables and status

- `privacy-policy.md`: tailored Privacy Policy draft.
- `terms-of-use.md`: tailored Terms of Use draft.
- The same documents render at `/privacy` and `/terms` using the JSON content in
  `src/content/legal/`. Update the Markdown copies if that content changes.
- Legal links are available at registration, in the footer, and in Profile &
  Settings. Registration acknowledges the privacy notice separately from agreeing
  to the Terms; it does not imply consent to unrelated processing.
- The user supplied `nadrty8@gmail.com` as the contact. The legal operator name,
  address, jurisdiction, and explicit confirmation of the existing 18+ rule are
  still needed. The draft date is not an approved effective date.

These are reviewable drafts, not publish-ready legal advice. Local counsel should
review the final documents after the operator and backend facts are confirmed.
No documents were deployed to the connected website or App Store Connect.

## Journey and information map

| Journey | Observed behavior/data | Source |
| --- | --- | --- |
| Register/sign in | Email/password registration; name, email, UID, roles, provider/block status, creation time; terms checkbox is local form state | `src/app/(auth)/register/page.tsx`, `src/lib/auth.ts`, `src/lib/firebase.ts` |
| Authentication persistence | Firebase browser-local persistence retains login on the device; no exposed Google sign-in button in current app | `src/lib/firebase.ts`, auth pages |
| Profile | Display name and optional external image URL; email is read-only in this screen; no file upload | `src/app/(dashboard)/profile/page.tsx` |
| Provider application | Bio, experience, skills, LinkedIn, portfolio, motivation, identity, review state/dates | `src/lib/actions.ts`, `src/app/(dashboard)/become-provider/page.tsx` |
| Services | Provider identity/photo/link, description, category, price, availability; create, edit, pause, delete | `src/lib/types.ts`, `src/lib/actions.ts`, `src/components/services/ServiceFormDialog.tsx` |
| Browse/availability | Active service queries, availability, and booked slot data; client comments describe booked slots as public-readable but deployed rules were not available | `src/hooks/useServices.ts`, `src/hooks/useBookedSlots.ts`, `src/lib/types.ts` |
| Free booking | Firebase bearer token plus service ID/date/time sent to existing Netlify `/api/bookings/free` | `src/components/booking/BookingDialog.tsx`, `mobile/backend.ts` |
| Paid booking | Opens existing website checkout in Capacitor Browser; user signs in and chooses the slot again there; PayPal payment fields/status appear in the data model | `BookingDialog.tsx`, `mobile/policy.ts`, `src/lib/types.ts` |
| Cancellation | Authenticated `/api/cancel-booking`; client computes a preview; remote server implementation not included | `src/lib/actions.ts`, `src/lib/cancellation.ts` |
| Messaging | Message text, sender, timestamp; participants/names, last message/sender/time and per-user read times; no end-to-end encryption implemented in client | `src/hooks/useChats.ts`, `src/lib/actions.ts` |
| Calendar/email | Google/Outlook links include service, provider and session time; email templates include booking details and can include customer email in provider notice | `src/lib/email.ts` |
| Reports/admin | Report text and participants, status/resolution dates; administrators review applications, user accounts and reports; account block flag exists | `src/lib/actions.ts`, `src/app/(admin)/admin/`, `src/components/report/ReportDialog.tsx` |
| Delete account | Password reauthentication, removal of owned services and user profile, then Firebase Auth deletion | `src/app/(dashboard)/profile/page.tsx`, `src/lib/actions.ts` |
| Device behavior | Network availability; native routing; theme state; external links; no app requests for camera, microphone, contacts, or GPS located | `mobile/`, `capacitor.config.json`, `ios/App/App/Info.plist` |

Unused schema fields and installed-but-unused dependencies were not treated as
active collection. For example, `cvUrl`, review schemas, a storage-bucket config,
and a PayPal package do not prove CV uploads, active review collection, image
uploads, or an embedded mobile PayPal checkout.

## Findings that affect the documents

### 1. Complete deletion is not demonstrated

`deleteAccountData` deletes owned services and `users/{uid}` only. Its comment
refers to server-side cleanup, but no cleanup implementation is included. Records
in applications, reports, requests/bookings, chats/messages, booked slots, and
copies of names in shared records need explicit treatment. It is not enough to
assume all of these are legally retainable indefinitely.

There is also a partial-failure possibility because database deletion and Auth
deletion are separate steps. Open sessions/refunds need a deliberate process
before an account becomes inaccessible. A backend cleanup should be authorized,
retryable, auditable, and scoped to the requesting user while accounting for
other participants' rights.

The Privacy Policy therefore describes the current initial deletion accurately,
provides the supplied email for remaining-data requests, and marks the retention
schedule and cleanup process as incomplete. It does not invent a scheduled job.
Apple expects account deletion to cover associated user content, subject to lawful
retention exceptions. A policy disclosure alone does not fix an incomplete
implementation. [Apple account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/)

### 2. Retention, processor roles, and transfers need operational confirmation

No retention/TTL configuration or backup deletion schedule was found. Set periods
or meaningful criteria for each record class and document any legal holds. Verify
Firebase regions, Netlify processing, payment-record fields, processor agreements,
transfer safeguards, and support-request handling before removing the placeholders.
Firebase documents processing authentication-related IP addresses and user-agent
information, which is why the draft includes technical connection data even
without an app analytics SDK. [Firebase privacy documentation](https://firebase.google.com/support/privacy)

Email templates mention Resend, but the delivery code is absent. The policy uses
an operational-email provider category rather than falsely confirming Resend as
the current sender. External profile images make requests to arbitrary image
hosts; this deserves disclosure even though LifeSwap does not upload the image.

### 3. Verify payment terms against the actual server

The client policy gives a full refund for host cancellations, a full refund for
customer cancellation at least 24 hours before the session, and half below that
threshold. `refundFraction` also returns half for negative `hoursUntil`, and date
parsing uses local time without an explicit booking time zone. The live server
must define completed sessions, no-shows, time zones, and permitted cancellations.
The Terms avoid promising a retroactive refund for a delivered session.

Provider payout destination, commissions, settlement timing, tax handling,
merchant-of-record identity, payment environment and legal consumer cancellation
requirements cannot be established from the mobile client. These are unresolved,
not covered by invented percentages or timelines. The live checkout must show
clear pricing and currency, and agree with the published terms.

### 4. Identity and service eligibility remain business decisions

The existing Terms said 18+, but the registration screen does not verify age.
Retaining that draft requirement is not evidence of age verification. Confirm
intended age and countries served before publishing. Determine the operator's
legal identity rather than deriving it from a developer username or app bundle ID.
No independent provider background-check workflow was found, so approval is not
presented as verification or a guarantee. Payment eligibility for the actual
services sold also needs app-store review; the code alone does not settle this.

### 5. Access and moderation need separate verification

Client role guards and Firestore query filters are not substitutes for server-side
rules. The deployed rules must enforce access to private profiles, participant
messages/bookings, provider applications, and admin writes. Admin blocking exists,
but this does not establish a member-to-member blocking feature or operational
moderation response times. The Terms do not promise either.

### 6. Disclosure and agreement records

The app privacy manifest lists name, email, user ID and other user content.
Reconcile it and App Store Connect disclosures with actual messaging, transaction,
photo and diagnostic data and all SDK behavior; the draft is not an automatic
App Store privacy-label submission. Apple requires an accessible privacy notice
covering collection, use, sharing, retention and deletion. [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

The registration checkbox is not persisted with a terms version and timestamp in
the inspected profile creation flow. Consider versioned acceptance records and a
material-change notice process. Don't treat privacy-notice acknowledgment as
blanket consent. Where GDPR applies, notices must identify the controller,
purposes, legal grounds, recipients, retention and applicable rights; actual
territorial applicability must be assessed after the markets are confirmed.
[European Commission guidance](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/obligations_en)

## Publication handoff

1. Complete legal operator name, contact address, jurisdiction, age policy and
   intended markets. The support email is already supplied.
2. Confirm backend deletion/retention, transfers, email processing and payment
   arrangements; align actual behavior and the two drafts.
3. Obtain jurisdiction-specific legal review, set the effective date, and remove
   draft labels and bracketed items only after the facts are resolved.
4. Update both the app and connected checkout site's documents and legal links.
   This repository change does not update the separate live website.
5. Confirm privacy metadata, consent/notice records and rights-request operations.
