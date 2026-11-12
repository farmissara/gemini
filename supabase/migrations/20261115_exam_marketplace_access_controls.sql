BEGIN;

REVOKE SELECT ON public.central_exam_packs FROM PUBLIC, anon, authenticated;
GRANT SELECT (
    id, title_th, title_en, strand, grade_level, description_th,
    pricing_type, price_thb, status, created_by, published_at, created_at, updated_at
) ON public.central_exam_packs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.central_exam_packs TO authenticated;

DROP POLICY IF EXISTS "School admins claim or buy central exam packs"
    ON public.school_exam_entitlements;
REVOKE INSERT, UPDATE ON public.school_exam_entitlements FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.school_exam_entitlements TO authenticated;
GRANT UPDATE (
    audit_status, verified_at, verified_by, revoked_at, revoked_by, revocation_reason
) ON public.school_exam_entitlements TO authenticated;

CREATE OR REPLACE FUNCTION public.list_central_exam_packs()
RETURNS TABLE (
    id TEXT,
    title_th TEXT,
    title_en TEXT,
    strand TEXT,
    grade_level TEXT,
    description_th TEXT,
    pricing_type TEXT,
    price_thb NUMERIC,
    status TEXT,
    question_count INTEGER,
    questions JSONB,
    created_by TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        p.id,
        p.title_th,
        p.title_en,
        p.strand,
        p.grade_level,
        p.description_th,
        p.pricing_type,
        p.price_thb,
        p.status,
        CASE
            WHEN jsonb_typeof(p.questions) = 'array' THEN jsonb_array_length(p.questions)
            ELSE 0
        END,
        CASE
            WHEN p.pricing_type = 'free'
              OR public.has_school_role(NULL, ARRAY['super_admin'])
              OR (
                  public.has_school_role(
                      public.current_user_school_id(),
                      ARRAY['admin', 'teacher', 'student', 'parent']
                  )
                  AND EXISTS (
                      SELECT 1
                      FROM public.school_exam_entitlements AS e
                      WHERE e.school_id = public.current_user_school_id()
                        AND e.pack_id = p.id
                        AND e.audit_status <> 'revoked'
                  )
              )
            THEN p.questions
            ELSE COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', q.item -> 'id',
                            'questionTh', q.item -> 'questionTh',
                            'questionEn', q.item -> 'questionEn',
                            'options', q.item -> 'options'
                        )
                        ORDER BY q.ordinality
                    )
                    FROM jsonb_array_elements(
                        CASE
                            WHEN jsonb_typeof(p.questions) = 'array' THEN p.questions
                            ELSE '[]'::jsonb
                        END
                    ) WITH ORDINALITY AS q(item, ordinality)
                    WHERE q.ordinality <= 3
                ),
                '[]'::jsonb
            )
        END,
        p.created_by,
        p.published_at,
        p.created_at,
        p.updated_at
    FROM public.central_exam_packs AS p
    WHERE auth.uid() IS NOT NULL
      AND (
          p.status = 'published'
          OR public.has_school_role(NULL, ARRAY['super_admin'])
      )
    ORDER BY p.updated_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_central_exam_packs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_central_exam_packs() TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_central_exam_pack(
    target_school_id TEXT,
    target_pack_id TEXT,
    target_payment_method TEXT,
    target_slip_data TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    pack_row public.central_exam_packs%ROWTYPE;
    entitlement_row public.school_exam_entitlements%ROWTYPE;
    claimed_by_name TEXT;
    claim_time TIMESTAMPTZ := NOW();
    is_paid BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication is required to claim an exam pack.'
            USING ERRCODE = '42501';
    END IF;

    IF target_school_id IS NULL
       OR NOT public.has_school_role(target_school_id, ARRAY['super_admin', 'admin']) THEN
        RAISE EXCEPTION 'Only an active school admin can claim an exam pack.'
            USING ERRCODE = '42501';
    END IF;

    SELECT *
    INTO pack_row
    FROM public.central_exam_packs
    WHERE id = target_pack_id
      AND status = 'published'
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'The exam pack is unavailable.'
            USING ERRCODE = '22023';
    END IF;

    is_paid := pack_row.pricing_type = 'paid';
    IF is_paid AND pack_row.price_thb <= 0 THEN
        RAISE EXCEPTION 'The paid exam pack has an invalid price.'
            USING ERRCODE = '22023';
    END IF;

    IF NOT is_paid AND target_payment_method IS DISTINCT FROM 'free' THEN
        RAISE EXCEPTION 'The payment method does not match this free exam pack.'
            USING ERRCODE = '22023';
    END IF;

    IF is_paid AND (
        target_payment_method IS NULL
        OR target_payment_method NOT IN ('promptpay', 'invoice')
    ) THEN
        RAISE EXCEPTION 'Choose a supported payment method for this paid exam pack.'
            USING ERRCODE = '22023';
    END IF;

    IF is_paid AND (
        target_slip_data IS NULL
        OR length(target_slip_data) > 7000000
        OR target_slip_data !~* '^data:image/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$'
    ) THEN
        RAISE EXCEPTION 'A valid payment slip image is required for this paid exam pack.'
            USING ERRCODE = '22023';
    END IF;

    SELECT COALESCE(NULLIF(BTRIM(profile.full_name_th), ''), auth.uid()::TEXT)
    INTO claimed_by_name
    FROM public.user_profiles AS profile
    WHERE profile.id = auth.uid();

    INSERT INTO public.school_exam_entitlements (
        id,
        school_id,
        pack_id,
        claim_type,
        amount_paid_thb,
        payment_method,
        claimed_by,
        claimed_at,
        slip_url,
        slip_attached_at,
        audit_status,
        verified_at,
        verified_by,
        revoked_at,
        revoked_by,
        revocation_reason
    )
    VALUES (
        'ent-' || target_school_id || '-' || target_pack_id,
        target_school_id,
        target_pack_id,
        CASE WHEN is_paid THEN 'purchased' ELSE 'free' END,
        CASE WHEN is_paid THEN pack_row.price_thb ELSE 0 END,
        CASE WHEN is_paid THEN target_payment_method ELSE 'free' END,
        COALESCE(claimed_by_name, auth.uid()::TEXT),
        claim_time,
        CASE WHEN is_paid THEN target_slip_data ELSE NULL END,
        CASE WHEN is_paid THEN claim_time ELSE NULL END,
        CASE WHEN is_paid THEN 'pending_audit' ELSE 'verified' END,
        CASE WHEN is_paid THEN NULL ELSE claim_time END,
        CASE WHEN is_paid THEN NULL ELSE 'system' END,
        NULL,
        NULL,
        NULL
    )
    ON CONFLICT (school_id, pack_id) DO UPDATE
    SET id = EXCLUDED.id,
        claim_type = EXCLUDED.claim_type,
        amount_paid_thb = EXCLUDED.amount_paid_thb,
        payment_method = EXCLUDED.payment_method,
        claimed_by = EXCLUDED.claimed_by,
        claimed_at = EXCLUDED.claimed_at,
        slip_url = EXCLUDED.slip_url,
        slip_attached_at = EXCLUDED.slip_attached_at,
        audit_status = EXCLUDED.audit_status,
        verified_at = EXCLUDED.verified_at,
        verified_by = EXCLUDED.verified_by,
        revoked_at = NULL,
        revoked_by = NULL,
        revocation_reason = NULL
    WHERE school_exam_entitlements.audit_status = 'revoked'
    RETURNING * INTO entitlement_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'This school already has an active entitlement for the exam pack.'
            USING ERRCODE = '23505';
    END IF;

    RETURN jsonb_build_object(
        'entitlement', to_jsonb(entitlement_row),
        'questions', pack_row.questions
    );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_central_exam_pack(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_central_exam_pack(TEXT, TEXT, TEXT, TEXT)
    TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
