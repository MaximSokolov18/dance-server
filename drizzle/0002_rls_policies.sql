-- Allow the backend server role full access to all tables.
-- These permissive policies are required because RLS is enabled
-- and blocks all access by default until at least one policy exists.
-- All tables are accessed exclusively by the server-side backend,
-- so "allow all" is the correct policy here. --> statement-breakpoint

CREATE POLICY "backend_all" ON "clients" FOR ALL USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "backend_all" ON "groups" FOR ALL USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "backend_all" ON "enrollments" FOR ALL USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "backend_all" ON "subscriptions" FOR ALL USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "backend_all" ON "holidays" FOR ALL USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "backend_all" ON "sessions" FOR ALL USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "backend_all" ON "attendance" FOR ALL USING (true) WITH CHECK (true);
