

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "public_key" "text" NOT NULL,
    "github_username" "text"
);


ALTER TABLE "public"."admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "github_username" "text" NOT NULL,
    "avatar_url" "text" NOT NULL,
    "public_key" "text" NOT NULL,
    "last_key_fetch" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_admin" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."group_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."office_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "emoji" "text" NOT NULL,
    "description" "text" NOT NULL,
    "signature" "jsonb",
    "group_id" "uuid" NOT NULL,
    "public_signal" "text" NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "metadata" "jsonb",
    "group_members" "text"[],
    "doxxed_member_id" "uuid"
);


ALTER TABLE "public"."office_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plonky2_timings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "operation" "text" NOT NULL,
    "duration_ms" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."plonky2_timings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_upvotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "nullifier" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."request_upvotes" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_github_username_key" UNIQUE ("github_username");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."office_requests"
    ADD CONSTRAINT "office_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plonky2_timings"
    ADD CONSTRAINT "plonky2_timings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_upvotes"
    ADD CONSTRAINT "request_upvotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_upvotes"
    ADD CONSTRAINT "request_upvotes_request_id_nullifier_key" UNIQUE ("request_id", "nullifier");



CREATE INDEX "office_requests_deleted_idx" ON "public"."office_requests" USING "btree" ("deleted");



ALTER TABLE ONLY "public"."office_requests"
    ADD CONSTRAINT "office_requests_doxxed_member_id_fkey" FOREIGN KEY ("doxxed_member_id") REFERENCES "public"."group_members"("id");



ALTER TABLE ONLY "public"."request_upvotes"
    ADD CONSTRAINT "request_upvotes_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."office_requests"("id");



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON TABLE "public"."admins" TO "anon";
GRANT ALL ON TABLE "public"."admins" TO "authenticated";
GRANT ALL ON TABLE "public"."admins" TO "service_role";



GRANT ALL ON TABLE "public"."group_members" TO "anon";
GRANT ALL ON TABLE "public"."group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."group_members" TO "service_role";



GRANT ALL ON TABLE "public"."office_requests" TO "anon";
GRANT ALL ON TABLE "public"."office_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."office_requests" TO "service_role";



GRANT ALL ON TABLE "public"."plonky2_timings" TO "anon";
GRANT ALL ON TABLE "public"."plonky2_timings" TO "authenticated";
GRANT ALL ON TABLE "public"."plonky2_timings" TO "service_role";



GRANT ALL ON TABLE "public"."request_upvotes" TO "anon";
GRANT ALL ON TABLE "public"."request_upvotes" TO "authenticated";
GRANT ALL ON TABLE "public"."request_upvotes" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






RESET ALL;
