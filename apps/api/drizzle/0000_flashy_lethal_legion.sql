CREATE TABLE "sessions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"travelogue_id" uuid NOT NULL,
	"client_mutation_id" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travelogue_members" (
	"travelogue_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'editor' NOT NULL,
	CONSTRAINT "travelogue_members_travelogue_id_user_id_pk" PRIMARY KEY("travelogue_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "travelogues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(80),
	"home_city_key" varchar(64) DEFAULT 'toronto' NOT NULL,
	"map_settings" jsonb DEFAULT '{"showFlightPaths":true,"highlightVisited":true}'::jsonb NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"storage_key" varchar(512) NOT NULL,
	"mime_type" varchar(64) NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"travelogue_id" uuid NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"city_key" varchar(64),
	"name" varchar(200) NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"material" varchar(10) DEFAULT 'brass' NOT NULL,
	"start_year" integer,
	"start_month" integer,
	"end_year" integer,
	"end_month" integer,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tv_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pairing_code" varchar(8) NOT NULL,
	"travelogue_id" uuid,
	"display_label" varchar(80),
	"claimed_by_user_id" uuid,
	"device_token_hash" varchar(255),
	"expires_at" timestamp with time zone NOT NULL,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tv_sessions_pairing_code_unique" UNIQUE("pairing_code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"password_hash" varchar(255),
	"display_name" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travelogue_members" ADD CONSTRAINT "travelogue_members_travelogue_id_travelogues_id_fk" FOREIGN KEY ("travelogue_id") REFERENCES "public"."travelogues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travelogue_members" ADD CONSTRAINT "travelogue_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travelogues" ADD CONSTRAINT "travelogues_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_images" ADD CONSTRAINT "trip_images_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_travelogue_id_travelogues_id_fk" FOREIGN KEY ("travelogue_id") REFERENCES "public"."travelogues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tv_sessions" ADD CONSTRAINT "tv_sessions_travelogue_id_travelogues_id_fk" FOREIGN KEY ("travelogue_id") REFERENCES "public"."travelogues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tv_sessions" ADD CONSTRAINT "tv_sessions_claimed_by_user_id_users_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sync_outbox_client_mutation" ON "sync_outbox" USING btree ("travelogue_id","client_mutation_id");