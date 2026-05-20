# Shared Core

Shared data and domain helpers used by both the mobile app and website.

This package currently re-exports the existing storage, Supabase, profile, and
utility modules so the codebase has a stable shared boundary without a risky
all-at-once import rewrite. New cross-platform business logic should live here
or be exported from here.
