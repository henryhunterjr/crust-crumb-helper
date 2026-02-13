
-- Add unique constraint for upsert on member_tags (prevent duplicate tags per member)
ALTER TABLE public.member_tags ADD CONSTRAINT member_tags_member_id_tag_unique UNIQUE (member_id, tag);
