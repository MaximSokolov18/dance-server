ALTER TABLE "sessions" ADD CONSTRAINT "sessions_group_date_unique" UNIQUE("group_id","session_date");
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_session_client_unique" UNIQUE("session_id","client_id");
