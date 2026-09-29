-- ============================================================
-- NEXORA — demo seed (mirrors the current in-app demo experience)
-- Idempotent: clears previous demo rows, then inserts.
-- Fixed UUIDs so re-runs and cross-references stay stable.
-- Sources: src/lib/seed.ts (5 contacts, 12 meetings, 27 memories).
-- ============================================================

-- Clean previous demo data (child tables first)
delete from public.reminders;
delete from public.meeting_transcripts;
delete from public.commitments;
delete from public.memories;
delete from public.meetings;
delete from public.contacts;

-- One reference profile for the project owner
insert into public.profiles (id, name, email) values
  ('00000000-0000-4000-8000-0000000000af', 'Pavani', 'singarampavani08@gmail.com');

-- ---------- Contacts ----------
insert into public.contacts (id, name, role, company, email, hue) values
  ('c0000000-0000-4000-8000-000000000001', 'Rahul Sharma',  'VP Engineering',  'Acme Tech',        'rahul@acmetech.io',    250),
  ('c0000000-0000-4000-8000-000000000002', 'Priya Patel',   'Head of Product', 'Lumen Health',     'priya@lumenhealth.com', 300),
  ('c0000000-0000-4000-8000-000000000003', 'Arjun Mehta',   'CFO',             'Northwind Capital','arjun@northwind.vc',    200),
  ('c0000000-0000-4000-8000-000000000004', 'Sara Kim',      'Procurement Lead','Globex Retail',    'sara.kim@globex.com',   160),
  ('c0000000-0000-4000-8000-000000000005', 'Daniel Okafor', 'CTO',             'Brightpath Labs',  'daniel@brightpath.dev',  30);

-- ---------- Meetings (8 completed, 4 upcoming) ----------
insert into public.meetings (id, contact_id, title, purpose, meeting_date, status, summary) values
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Discovery call — platform fit', 'Understand Acme''s integration needs', '2026-07-14', 'completed', 'Explored Acme''s data pipeline and where our API fits. Rahul is interested but cautious about security.'),
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'Technical deep-dive',           'Walk through API and SSO',             '2026-08-19', 'completed', 'Reviewed REST API, SSO and audit logs. Agreed to run a 30-day pilot with the data team.'),
  ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'Pilot check-in',                'Review pilot progress',                '2026-09-16', 'completed', 'Pilot is going well; latency concern on bulk sync. Pricing for 200 seats to be proposed.'),
  ('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002', 'Roadmap alignment',             'Align on Q4 roadmap',                  '2026-08-05', 'completed', 'Priya wants patient-facing analytics in Q4 and is worried about HIPAA review timelines.'),
  ('d0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000002', 'Design review',                 'Review dashboard mockups',             '2026-09-10', 'completed', 'Mockups approved with changes to accessibility and mobile layout.'),
  ('d0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000003', 'Budget planning',               'FY27 budget review',                   '2026-08-27', 'completed', 'Arjun pushed for annual billing and a clear ROI model before committing.'),
  ('d0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000004', 'Vendor evaluation',             'Procurement requirements',             '2026-09-02', 'completed', 'Sara shared the security questionnaire and a hard deadline for contract signature.'),
  ('d0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000005', 'Architecture sync',             'Migration planning',                   '2026-09-21', 'completed', 'Discussed migrating from their legacy queue to our event API. Daniel prefers async updates.'),
  ('d0000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-000000000001', 'Pricing & rollout discussion',  'Finalize pricing and rollout plan for 200 seats', '2026-09-30', 'upcoming', null),
  ('d0000000-0000-4000-8000-000000000010', 'c0000000-0000-4000-8000-000000000002', 'Q4 kickoff',                    'Kick off analytics build',             '2026-10-02', 'upcoming', null),
  ('d0000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-000000000003', 'ROI review',                    'Present ROI model',                    '2026-10-05', 'upcoming', null),
  ('d0000000-0000-4000-8000-000000000012', 'c0000000-0000-4000-8000-000000000004', 'Contract review',               'Redlines and signature timeline',      '2026-10-07', 'upcoming', null);

-- ---------- Memories (27, mirroring src/lib/seed.ts) ----------
insert into public.memories (id, meeting_id, contact_id, type, content, topics, is_open, confidence) values
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'discussion',  'Acme ingests ~4M events/day and wants a single integration layer.', '{Integration}', false, 0.95),
  ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'concern',     'Rahul is worried about data residency and SOC 2 coverage.', '{Security,Compliance}', false, 0.95),
  ('e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'preference',  'Rahul prefers concise, technical briefs with numbers over slides.', '{Communication}', false, 0.95),
  ('e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'commitment',  'We promised to send our SOC 2 Type II report.', '{Security}', false, 0.95),
  ('e0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'decision',    'Agreed to run a 30-day pilot with Acme''s data team.', '{Pilot}', false, 0.95),
  ('e0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'discussion',  'Walked through SSO via Okta and exportable audit logs.', '{Security,Integration}', false, 0.95),
  ('e0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'commitment',  'We committed to provide a dedicated Slack support channel during the pilot.', '{Support,Pilot}', false, 0.95),
  ('e0000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'concern',     'Bulk sync latency spikes above 2s for batches over 50k records.', '{Performance}', false, 0.95),
  ('e0000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'commitment',  'We will share a pricing proposal for 200 seats before the next meeting.', '{Pricing}', true, 0.95),
  ('e0000000-0000-4000-8000-000000000010', 'd0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'followup',    'Follow up with benchmark results after the bulk sync fix.', '{Performance}', true, 0.95),
  ('e0000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'discussion',  'Rahul mentioned budget approval requires sign-off from their CFO.', '{Budget}', false, 0.95),
  ('e0000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002', 'discussion',  'Priya wants patient-facing analytics shipped in Q4.', '{Analytics,Roadmap}', false, 0.95),
  ('e0000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002', 'concern',     'Priya is worried HIPAA review could delay the Q4 launch.', '{Compliance,Timeline}', false, 0.95),
  ('e0000000-0000-4000-8000-000000000014', 'd0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002', 'commitment',  'We promised to share a HIPAA compliance checklist.', '{Compliance}', true, 0.95),
  ('e0000000-0000-4000-8000-000000000015', 'd0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000002', 'decision',    'Dashboard mockups approved with accessibility updates.', '{Design}', false, 0.95),
  ('e0000000-0000-4000-8000-000000000016', 'd0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000002', 'followup',    'Send revised mobile layouts by early October.', '{Design}', true, 0.95),
  ('e0000000-0000-4000-8000-000000000017', 'd0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000002', 'preference',  'Priya likes visual walkthroughs and short Loom videos.', '{Communication}', false, 0.95),
  ('e0000000-0000-4000-8000-000000000018', 'd0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000003', 'concern',     'Arjun is hesitant without a clear 12-month ROI model.', '{Budget,ROI}', false, 0.95),
  ('e0000000-0000-4000-8000-000000000019', 'd0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000003', 'decision',    'Annual billing preferred over monthly.', '{Pricing}', false, 0.95),
  ('e0000000-0000-4000-8000-000000000020', 'd0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000003', 'commitment',  'We will prepare an ROI model with three scenarios.', '{ROI}', true, 0.95),
  ('e0000000-0000-4000-8000-000000000021', 'd0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000004', 'discussion',  'Globex requires a completed security questionnaire from all vendors.', '{Security,Procurement}', false, 0.95),
  ('e0000000-0000-4000-8000-000000000022', 'd0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000004', 'concern',     'Contract must be signed by Oct 15 to fit the Q4 budget cycle.', '{Contract,Timeline}', false, 0.95),
  ('e0000000-0000-4000-8000-000000000023', 'd0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000004', 'followup',    'Return the completed security questionnaire.', '{Security}', true, 0.95),
  ('e0000000-0000-4000-8000-000000000024', 'd0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000005', 'discussion',  'Migrating from a legacy queue to our event API over two phases.', '{Migration,Integration}', false, 0.95),
  ('e0000000-0000-4000-8000-000000000025', 'd0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000005', 'preference',  'Daniel prefers async written updates over calls.', '{Communication}', false, 0.95),
  ('e0000000-0000-4000-8000-000000000026', 'd0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000005', 'commitment',  'We will draft a phased migration plan.', '{Migration}', true, 0.95);
