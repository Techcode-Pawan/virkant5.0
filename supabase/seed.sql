-- =============================================================================
-- Seed Data: supabase/seed.sql
-- Product: ForgeWise AI (Vikrant 5.0)
-- NOTICE: The data below represents fictional demonstration industrial records
-- for local testing and development only.
-- =============================================================================

-- 1. Demo Organization
INSERT INTO organizations (id, name, slug, tier, max_storage_bytes)
VALUES (
    'c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b',
    'Vikrant Heavy Forge Industries',
    'vikrant-heavy-forge',
    'enterprise',
    107374182400
) ON CONFLICT (id) DO NOTHING;

-- 2. Demo Profiles
INSERT INTO profiles (id, organization_id, email, full_name, role, preferred_language, theme_preference)
VALUES 
(
    'a1111111-1111-1111-1111-111111111111',
    'c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b',
    'operator.rajesh@vikrant.internal',
    'Rajesh Sharma',
    'operator',
    'hi',
    'light'
),
(
    'a2222222-2222-2222-2222-222222222222',
    'c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b',
    'engineer.elena@vikrant.internal',
    'Elena Vance',
    'engineer',
    'en',
    'dark'
),
(
    'a3333333-3333-3333-3333-333333333333',
    'c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b',
    'admin.marcus@vikrant.internal',
    'Marcus Cole',
    'org_admin',
    'en',
    'light'
) ON CONFLICT (id) DO NOTHING;

-- 3. Demo Machines
INSERT INTO machines (id, organization_id, name, manufacturer, model, plant_location)
VALUES 
(
    'PMP-402',
    'c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b',
    'High-Pressure Boiler Feed Pump',
    'Flowserve',
    'HPX-150-B',
    'Boiler House 2, Bay C'
),
(
    'CNC-MILL-02',
    'c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b',
    '5-Axis Precision Machining Center',
    'Okuma',
    'MU-5000V',
    'Machining Cell 4'
),
(
    'HYD-PRESS-01',
    'c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b',
    '2000-Ton Hydraulic Forging Press',
    'Schuler',
    'HP-2000-M',
    'Heavy Forging Bay 1'
) ON CONFLICT (id) DO NOTHING;

-- 4. Demo Documents
INSERT INTO documents (id, organization_id, machine_id, title, file_name, file_key, mime_type, file_size_bytes, version, status, page_count)
VALUES 
(
    'd1111111-1111-1111-1111-111111111111',
    'c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b',
    'PMP-402',
    'Boiler Feed Pump PMP-402 Standard Operating Procedure & Maintenance Manual',
    'SOP_PMP_402_Boiler_Feed.pdf',
    'raw/c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b/sop_pmp_402.pdf',
    'application/pdf',
    4892100,
    '3.2',
    'ready',
    48
),
(
    'd2222222-2222-2222-2222-222222222222',
    'c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b',
    'CNC-MILL-02',
    'Okuma MU-5000V Spindle & Cooling Diagnostic Manual',
    'Okuma_MU5000V_Diagnostics.pdf',
    'raw/c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b/okuma_diagnostics.pdf',
    'application/pdf',
    8340210,
    '4.1',
    'ready',
    92
),
(
    'd3333333-3333-3333-3333-333333333333',
    'c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b',
    'HYD-PRESS-01',
    '2000-Ton Hydraulic Press Emergency Isolation & Valve Inspection SOP',
    'Hydraulic_Press_Isolation_SOP.docx',
    'raw/c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b/press_isolation.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    2150300,
    '2.0',
    'ready',
    26
) ON CONFLICT (id) DO NOTHING;

-- 5. Demo Document Chunks (with verified technical excerpts)
INSERT INTO document_chunks (id, document_id, organization_id, chunk_index, page_number, section_title, content, metadata_json)
VALUES 
(
    'c1111111-1111-1111-1111-111111111111',
    'd1111111-1111-1111-1111-111111111111',
    'c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b',
    0,
    14,
    'Section 3.2: Mechanical Seal Inspection & Torque Specifications',
    'When inspecting the cartridge mechanical seal on pump PMP-402, verify that seal flush plan 23 temperature does not exceed 65°C. Gland bolts must be torqued in a star pattern to exactly 48 Nm (35.4 ft-lb). Excessive gland torque causes seal face distortion and immediate fluid leakage. CAUTION: Ensure the suction and discharge valves are fully locked and tagged out (LOTO) prior to loosening any gland nuts.',
    '{"machine_id": "PMP-402", "equipment_type": "Pump", "pressure_rating": "42 bar"}'::jsonb
),
(
    'c2222222-2222-2222-2222-222222222222',
    'd1111111-1111-1111-1111-111111111111',
    'c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b',
    1,
    22,
    'Section 4.5: High Temperature & Vibration Troubleshooting',
    'Vibration readings exceeding 4.5 mm/s RMS on the inboard bearing housing indicate either shaft misalignment or cavitation. If cavitation noise (marbles in the casing) is audible, immediately check the suction strainer differential pressure. Clean suction basket if differential pressure exceeds 0.35 bar. Check net positive suction head available (NPSHa). Normal operating pressure on discharge manifold is 38.0 to 42.5 bar.',
    '{"machine_id": "PMP-402", "vibration_threshold_rms": "4.5 mm/s"}'::jsonb
),
(
    'c3333333-3333-3333-3333-333333333333',
    'd2222222-2222-2222-2222-222222222222',
    'c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b',
    0,
    34,
    'Section 5.1: Spindle Chiller High Temperature Warning E-304',
    'Alarm code E-304 triggers when the refrigerated spindle coolant loop returns a temperature greater than 88°C for more than 45 seconds. Diagnostic procedure: 1. Confirm external chiller fan is spinning freely and radiator fins are not clogged with metal dust or aerosolized cutting oil. 2. Verify coolant circulation flow rate is between 14.5 and 18.0 L/min. 3. Check thermostatic expansion valve bulb contact. WARNING: Do not run spindle above 3000 RPM while E-304 condition persists.',
    '{"machine_id": "CNC-MILL-02", "error_code": "E-304", "max_temp_c": 88}'::jsonb
),
(
    'c4444444-4444-4444-4444-444444444444',
    'd3333333-3333-3333-3333-333333333333',
    'c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b',
    0,
    8,
    'Section 2.1: Main Cylinder Pressure Relief Valve Chatter',
    'Chatter or rapid pulsing at main proportional relief valve PRV-102 indicates air entrapment in the pilot control line or a worn pilot orifice. 1. De-energize high-pressure pilot solenoid. 2. Bleed pilot port G1/4 using certified bleed nipple until bubble-free ISO VG 46 hydraulic oil flows. 3. Verify accumulator nitrogen pre-charge pressure is at 110 bar +/- 5 bar at 20°C ambient. DANGER: System operating pressure is 315 bar. Never tighten fittings under pressure.',
    '{"machine_id": "HYD-PRESS-01", "valve_tag": "PRV-102", "system_pressure_bar": 315}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 6. Demo Conversation & Citations
INSERT INTO conversations (id, organization_id, user_id, machine_id, title, language)
VALUES (
    'b1111111-1111-1111-1111-111111111111',
    'c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b',
    'a1111111-1111-1111-1111-111111111111',
    'PMP-402',
    'Mechanical seal bolt torque & inspection',
    'en'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO messages (id, conversation_id, sender, content, groundedness_status, latency_ms)
VALUES 
(
    'm1111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111111',
    'user',
    'What is the torque specification for the mechanical seal gland bolts on pump PMP-402, and what safety steps are required?',
    'supported',
    NULL
),
(
    'm2222222-2222-2222-2222-222222222222',
    'b1111111-1111-1111-1111-111111111111',
    'assistant',
    'According to the Boiler Feed Pump PMP-402 SOP:

1. **Torque Specification**: Gland bolts must be torqued in a star pattern to exactly **48 Nm (35.4 ft-lb)**. Do not exceed this value, as over-torquing distorts the seal faces and causes rapid fluid leakage.
2. **Seal Flush Monitoring**: Confirm Plan 23 seal flush temperature remains below **65°C**.
3. **MANDATORY SAFETY PROTOCOL**: Ensure suction and discharge valves are fully locked and tagged out (**LOTO**) and the casing is depressurized before loosening gland nuts.',
    'supported',
    342
) ON CONFLICT (id) DO NOTHING;

INSERT INTO citations (id, message_id, chunk_id, document_id, page_number, excerpt, relevance_score)
VALUES (
    'x1111111-1111-1111-1111-111111111111',
    'm2222222-2222-2222-2222-222222222222',
    'c1111111-1111-1111-1111-111111111111',
    'd1111111-1111-1111-1111-111111111111',
    14,
    'Gland bolts must be torqued in a star pattern to exactly 48 Nm (35.4 ft-lb). Excessive gland torque causes seal face distortion and immediate fluid leakage. CAUTION: Ensure the suction and discharge valves are fully locked and tagged out (LOTO) prior to loosening any gland nuts.',
    0.98
) ON CONFLICT (id) DO NOTHING;
