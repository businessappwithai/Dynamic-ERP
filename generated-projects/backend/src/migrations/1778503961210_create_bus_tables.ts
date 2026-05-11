/**
 * Business Tables Migration
 * Creates all business entity tables
 *
 * Generated: 2026-05-11T12:52:41.214Z
 */

import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // ==========================================================================
  // Company (bus_company)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_company (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      : string (required) }}
      , name VARCHAR(255) NOT NULL
      : string }}
      , industry VARCHAR(255)
      : string }}
      , website VARCHAR(255)
      : string }}
      , phone VARCHAR(255)
      : string }}
      , email VARCHAR(255)
      : integer }}
      , employee_count INTEGER
      : decimal }}
      , annual_revenue DECIMAL(18,6)
      : string (required) }}
      , status VARCHAR(255) NOT NULL
      : string (required) }}
      , owner_id VARCHAR(255) NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_company_id ON bus_company (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_company_name ON bus_company (name)`.execute(db);

  // ==========================================================================
  // Contact (bus_contact)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_contact (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      : string }}
      , company_id VARCHAR(255)
      : string (required) }}
      , first_name VARCHAR(255) NOT NULL
      : string (required) }}
      , last_name VARCHAR(255) NOT NULL
      : string (required) (unique) }}
      , email VARCHAR(255) NOT NULL UNIQUE
      : string }}
      , phone VARCHAR(255)
      : string }}
      , mobile VARCHAR(255)
      : string }}
      , job_title VARCHAR(255)
      : string }}
      , department VARCHAR(255)
      : string (required) }}
      , status VARCHAR(255) NOT NULL
      : string }}
      , lead_source VARCHAR(255)
      : string (required) }}
      , owner_id VARCHAR(255) NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_contact_id ON bus_contact (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_contact_email ON bus_contact (email)`.execute(db);

  // ==========================================================================
  // Deal (bus_deal)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_deal (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      : string }}
      , company_id VARCHAR(255)
      : string }}
      , contact_id VARCHAR(255)
      : string (required) }}
      , name VARCHAR(255) NOT NULL
      : decimal }}
      , amount DECIMAL(18,6)
      : string (required) }}
      , currency VARCHAR(255) NOT NULL
      : string (required) }}
      , stage VARCHAR(255) NOT NULL
      : integer }}
      , probability INTEGER
      : date }}
      , expected_close_date DATE
      : date }}
      , actual_close_date DATE
      : string (required) }}
      , status VARCHAR(255) NOT NULL
      : text }}
      , description TEXT
      : string (required) }}
      , owner_id VARCHAR(255) NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_deal_id ON bus_deal (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_deal_name ON bus_deal (name)`.execute(db);

  // ==========================================================================
  // Deal Stage (bus_deal_stage)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_deal_stage (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      : string (required) }}
      , pipeline_id VARCHAR(255) NOT NULL
      : string (required) }}
      , name VARCHAR(255) NOT NULL
      : integer (required) }}
      , sort_order INTEGER NOT NULL
      : integer (required) }}
      , default_probability INTEGER NOT NULL
      : boolean (required) }}
      , is_won BOOLEAN NOT NULL
      : boolean (required) }}
      , is_lost BOOLEAN NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_deal_stage_id ON bus_deal_stage (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_deal_stage_name ON bus_deal_stage (name)`.execute(db);

  // ==========================================================================
  // Pipeline (bus_pipeline)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_pipeline (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      : string (required) }}
      , name VARCHAR(255) NOT NULL
      : boolean (required) }}
      , is_default BOOLEAN NOT NULL
      : boolean (required) }}
      , is_active BOOLEAN NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_pipeline_id ON bus_pipeline (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_pipeline_name ON bus_pipeline (name)`.execute(db);

  // ==========================================================================
  // Activity (bus_activity)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_activity (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      : string }}
      , contact_id VARCHAR(255)
      : string }}
      , company_id VARCHAR(255)
      : string }}
      , deal_id VARCHAR(255)
      : string (required) }}
      , activity_type VARCHAR(255) NOT NULL
      : string (required) }}
      , subject VARCHAR(255) NOT NULL
      : text }}
      , description TEXT
      : datetime }}
      , scheduled_at TIMESTAMPTZ
      : datetime }}
      , completed_at TIMESTAMPTZ
      : integer }}
      , duration_minutes INTEGER
      : string (required) }}
      , status VARCHAR(255) NOT NULL
      : string (required) }}
      , owner_id VARCHAR(255) NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_activity_id ON bus_activity (id)`.execute(db);

  // ==========================================================================
  // Note (bus_note)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_note (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      : string }}
      , contact_id VARCHAR(255)
      : string }}
      , company_id VARCHAR(255)
      : string }}
      , deal_id VARCHAR(255)
      : text (required) }}
      , content TEXT NOT NULL
      : boolean (required) }}
      , is_pinned BOOLEAN NOT NULL
      : string (required) }}
      , author_id VARCHAR(255) NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_note_id ON bus_note (id)`.execute(db);

  // ==========================================================================
  // Task (bus_task)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_task (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      : string }}
      , contact_id VARCHAR(255)
      : string }}
      , company_id VARCHAR(255)
      : string }}
      , deal_id VARCHAR(255)
      : string (required) }}
      , title VARCHAR(255) NOT NULL
      : text }}
      , description TEXT
      : string (required) }}
      , priority VARCHAR(255) NOT NULL
      : string (required) }}
      , status VARCHAR(255) NOT NULL
      : date }}
      , due_date DATE
      : datetime }}
      , completed_at TIMESTAMPTZ
      : string (required) }}
      , assigned_to VARCHAR(255) NOT NULL
      : string (required) }}
      , created_by VARCHAR(255) NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_task_id ON bus_task (id)`.execute(db);

  // ==========================================================================
  // Email Message (bus_email_message)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_email_message (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      : string }}
      , contact_id VARCHAR(255)
      : string }}
      , deal_id VARCHAR(255)
      : string }}
      , thread_id VARCHAR(255)
      : string (required) }}
      , subject VARCHAR(255) NOT NULL
      : text }}
      , body_text TEXT
      : text }}
      , body_html TEXT
      : string (required) }}
      , direction VARCHAR(255) NOT NULL
      : datetime }}
      , sent_at TIMESTAMPTZ
      : datetime }}
      , received_at TIMESTAMPTZ
      : datetime }}
      , opened_at TIMESTAMPTZ
      : integer (required) }}
      , open_count INTEGER NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_email_message_id ON bus_email_message (id)`.execute(db);

  // ==========================================================================
  // Email Template (bus_email_template)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_email_template (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      : string (required) }}
      , name VARCHAR(255) NOT NULL
      : string (required) }}
      , subject VARCHAR(255) NOT NULL
      : text (required) }}
      , body_html TEXT NOT NULL
      : text }}
      , body_text TEXT
      : string }}
      , category VARCHAR(255)
      : boolean (required) }}
      , is_active BOOLEAN NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_email_template_id ON bus_email_template (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_email_template_name ON bus_email_template (name)`.execute(db);

  // ==========================================================================
  // Product (bus_product)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_product (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      : string (required) }}
      , name VARCHAR(255) NOT NULL
      : string (required) (unique) }}
      , sku VARCHAR(255) NOT NULL UNIQUE
      : text }}
      , description TEXT
      : decimal (required) }}
      , unit_price DECIMAL(18,6) NOT NULL
      : string (required) }}
      , currency VARCHAR(255) NOT NULL
      : boolean (required) }}
      , is_active BOOLEAN NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_product_id ON bus_product (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_product_name ON bus_product (name)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_product_sku ON bus_product (sku)`.execute(db);

  // ==========================================================================
  // Quote (bus_quote)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_quote (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      : string (required) }}
      , deal_id VARCHAR(255) NOT NULL
      : string (required) (unique) }}
      , quote_number VARCHAR(255) NOT NULL UNIQUE
      : string (required) }}
      , status VARCHAR(255) NOT NULL
      : date }}
      , valid_until DATE
      : decimal (required) }}
      , subtotal DECIMAL(18,6) NOT NULL
      : decimal (required) }}
      , discount_amount DECIMAL(18,6) NOT NULL
      : decimal (required) }}
      , tax_amount DECIMAL(18,6) NOT NULL
      : decimal (required) }}
      , total_amount DECIMAL(18,6) NOT NULL
      : text }}
      , terms TEXT
      : text }}
      , notes TEXT
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_quote_id ON bus_quote (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_quote_quote_number ON bus_quote (quote_number)`.execute(db);

  // ==========================================================================
  // Quote Item (bus_quote_item)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_quote_item (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      : string (required) }}
      , quote_id VARCHAR(255) NOT NULL
      : string (required) }}
      , product_id VARCHAR(255) NOT NULL
      : string }}
      , description VARCHAR(255)
      : integer (required) }}
      , quantity INTEGER NOT NULL
      : decimal (required) }}
      , unit_price DECIMAL(18,6) NOT NULL
      : decimal (required) }}
      , discount_percent DECIMAL(18,6) NOT NULL
      : decimal (required) }}
      , total_price DECIMAL(18,6) NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_quote_item_id ON bus_quote_item (id)`.execute(db);

  // ==========================================================================
  // User (bus_user)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_user (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      : string (required) (unique) }}
      , email VARCHAR(255) NOT NULL UNIQUE
      : string (required) }}
      , first_name VARCHAR(255) NOT NULL
      : string (required) }}
      , last_name VARCHAR(255) NOT NULL
      : string (required) }}
      , role VARCHAR(255) NOT NULL
      : string }}
      , team_id VARCHAR(255)
      : boolean (required) }}
      , is_active BOOLEAN NOT NULL
      : datetime }}
      , last_login TIMESTAMPTZ
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_user_id ON bus_user (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_user_email ON bus_user (email)`.execute(db);

  // ==========================================================================
  // Team (bus_team)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_team (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      : string (required) }}
      , name VARCHAR(255) NOT NULL
      : string }}
      , manager_id VARCHAR(255)
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_team_id ON bus_team (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_team_name ON bus_team (name)`.execute(db);

}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS bus_company CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_contact CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_deal CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_deal_stage CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_pipeline CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_activity CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_note CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_task CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_email_message CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_email_template CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_product CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_quote CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_quote_item CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_user CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_team CASCADE`.execute(db);
}
