# YardVest Project OS architecture

## One continuous record

A property-check submission creates or links one contact, one property, one lead and one project/opportunity. That project advances through the complete commercial and delivery journey; later workflows must never duplicate the customer and property unnecessarily.

## Stage model

`new_lead → property_review → advisor_contact → consultation_booked → consultation_complete → feasibility → reservation → proposal → contract_sent → contract_signed → deposit_due → deposit_paid → design_engineering → permits → pre_construction → construction → inspections → handover → complete`

Alternative terminal/holding stages: `nurture`, `not_eligible`, `lost`, `cancelled`.

## Delivery phases

1. **Foundation:** Supabase project, authentication, RLS, migrations, environments, user roles.
2. **Acquisition:** Three-step property/rent funnel, advisor requests, centralized contact/property/project creation.
3. **Sales operations:** Dashboard, lead record, activities, tasks, property reviews and consultation scheduling.
4. **Commercial:** Reservations, proposal generation, document templates, contract status and Stripe payments.
5. **Customer portal:** Project status, consultation, review, proposal, reservation, contract, deposit and next action.
6. **Delivery:** Design, permits, construction milestones, inspections, handover, photos and documents.

## Integration boundaries

- Supabase: database, auth, storage, RLS and Edge Functions.
- Stripe: reservation and deposit payments; Stripe remains transaction source of truth.
- Transactional email: integration adapter (Resend or equivalent); secrets remain server-side.
- E-signature: provider adapter; no simulated legal signature.
- Scheduling: native availability schema first, isolated so a third-party scheduler can be substituted.

## Implemented foundation

- Public property intake creates linked contact, property, lead and project records.
- Advisor and partner inquiries enter central staff queues.
- Customer and staff views authenticate with Supabase and rely on RLS.
- Consultation booking rejects duplicate advisor/start-time reservations.
- Stripe Checkout uses server-created sessions; signed, idempotent webhooks update payment and project state.
- Transactional email is sent server-side through Resend.
- Product catalog seeds YardVest One, YardVest Two and Suite Plus with Modern/Coastal styles.
- Automated tests cover validation, project-stage transitions, webhook signatures, asset integrity and the no-localStorage rule.

Production activation still requires a Supabase project and deployment secrets. Legal e-signature remains an integration boundary: contract records and status tracking are implemented in the schema, but a production e-sign provider must be selected and configured before contracts can be legally signed online.
