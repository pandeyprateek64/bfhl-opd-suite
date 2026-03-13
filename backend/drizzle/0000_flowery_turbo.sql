CREATE TYPE "public"."role" AS ENUM('ADMIN', 'PRICING_LEAD', 'UNDERWRITER', 'SALES_HEAD', 'SALES_EXEC');--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_id" integer,
	"user_id" integer,
	"action" varchar(50) NOT NULL,
	"old_value" varchar(100),
	"new_value" varchar(100),
	"description" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "allocation_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_date" date NOT NULL,
	"total_cases" integer NOT NULL,
	"uw1_name" varchar(50) NOT NULL,
	"uw1_count" integer NOT NULL,
	"uw1_pct" numeric(5, 1),
	"uw2_name" varchar(50) NOT NULL,
	"uw2_count" integer NOT NULL,
	"uw2_pct" numeric(5, 1),
	"emp_threshold" integer DEFAULT 1000,
	"source" varchar(20) DEFAULT 'MANUAL',
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "allocation_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" integer,
	"client_name" varchar(200) NOT NULL,
	"rm_name" varchar(100),
	"date_of_request" date,
	"expected_closure" date,
	"case_type" varchar(20),
	"employee_count" integer,
	"allocated_uw" varchar(50) NOT NULL,
	"priority" varchar(10),
	"auto_assigned" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_ref" varchar(50) NOT NULL,
	"tool_source" varchar(20) NOT NULL,
	"client_name" varchar(200) NOT NULL,
	"client_id" varchar(50),
	"employee_count" integer,
	"family_construct" varchar(50),
	"coverage_type" varchar(20),
	"product_type" varchar(50) NOT NULL,
	"wallet_si" integer,
	"plan_tier" varchar(20),
	"wellness_mode" varchar(10),
	"rate_per_employee" numeric(10, 2),
	"net_premium" numeric(14, 2),
	"gst" numeric(14, 2),
	"gross_premium" numeric(14, 2),
	"benefit_count" integer DEFAULT 0,
	"rates_json" jsonb,
	"brokerage" numeric(5, 2),
	"insurance_margin" numeric(5, 2),
	"opex_loading" numeric(5, 2),
	"status" varchar(20) DEFAULT 'DRAFT',
	"priority" varchar(10) DEFAULT 'MEDIUM',
	"channel" varchar(20) DEFAULT 'Direct',
	"broker_name" varchar(100),
	"region" varchar(50),
	"assigned_to" integer,
	"generated_by" integer,
	"quote_date" date,
	"due_date" date,
	"notes_json" jsonb DEFAULT '[]',
	"revision_count" integer DEFAULT 0,
	"margin_percent" numeric(5, 1),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "quotes_quote_ref_unique" UNIQUE("quote_ref")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"role" varchar(20) DEFAULT 'SALES_EXEC' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_batches" ADD CONSTRAINT "allocation_batches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_cases" ADD CONSTRAINT "allocation_cases_batch_id_allocation_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."allocation_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activity_quote_id" ON "activity_log" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "idx_quotes_status" ON "quotes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_quotes_generated_by" ON "quotes" USING btree ("generated_by");--> statement-breakpoint
CREATE INDEX "idx_quotes_created_at" ON "quotes" USING btree ("created_at");