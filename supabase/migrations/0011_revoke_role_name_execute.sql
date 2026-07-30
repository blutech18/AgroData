-- ============================================================================
-- AGRODATA - Remove the last unnecessary EXECUTE grant
-- ----------------------------------------------------------------------------
-- current_role_name() is only ever called from inside is_admin(), which is
-- SECURITY DEFINER and therefore evaluates it with the owner's rights. No
-- client code calls it (the app's only RPC is resync_identity_sequences) and it
-- does not appear in any policy expression, so no role needs EXECUTE on it.
--
-- is_admin() and has_active_profile() keep their `authenticated` grant because
-- they DO appear in RLS policy expressions, which are evaluated as the calling
-- role.
-- ============================================================================

revoke all on function public.current_role_name() from public, anon, authenticated;
