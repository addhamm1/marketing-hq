
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "approval_steps": {
                  Row: {
                    "approver_id": string,"card_stage": Database["public"]['Enums']["card_stage"] | null,"comment": string | null,"created_at": string,"decided_at": string | null,"id": string,"revision_reason": Database["public"]['Enums']["revision_reason"] | null,"status": Database["public"]['Enums']["step_status"],"step_index": number,"subject_id": string,"subject_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approver_id": string,"card_stage"?: Database["public"]['Enums']["card_stage"] | null,"comment"?: string | null,"created_at"?: string,"decided_at"?: string | null,"id"?: string,"revision_reason"?: Database["public"]['Enums']["revision_reason"] | null,"status": Database["public"]['Enums']["step_status"],"step_index": number,"subject_id": string,"subject_type": string
                  }
                  Update: {
                    "approver_id"?: string,"card_stage"?: Database["public"]['Enums']["card_stage"] | null,"comment"?: string | null,"created_at"?: string,"decided_at"?: string | null,"id"?: string,"revision_reason"?: Database["public"]['Enums']["revision_reason"] | null,"status"?: Database["public"]['Enums']["step_status"],"step_index"?: number,"subject_id"?: string,"subject_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "approval_steps_approver_id_fkey"
      columns: ["approver_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"attachments": {
                  Row: {
                    "card_id": string,"created_at": string,"id": string,"kind": string,"mime": string | null,"name": string,"size": number | null,"storage_path": string | null,"uploaded_by": string,"url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "card_id": string,"created_at"?: string,"id"?: string,"kind": string,"mime"?: string | null,"name": string,"size"?: number | null,"storage_path"?: string | null,"uploaded_by": string,"url"?: string | null
                  }
                  Update: {
                    "card_id"?: string,"created_at"?: string,"id"?: string,"kind"?: string,"mime"?: string | null,"name"?: string,"size"?: number | null,"storage_path"?: string | null,"uploaded_by"?: string,"url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "attachments_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attachments_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "v_card_flow"
      referencedColumns: ["card_id"]
    },{
      foreignKeyName: "attachments_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"attendance_edits": {
                  Row: {
                    "created_at": string,"edited_by": string | null,"id": string,"new_in": string | null,"new_out": string | null,"old_in": string | null,"old_out": string | null,"reason": string,"session_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"edited_by"?: string | null,"id"?: string,"new_in"?: string | null,"new_out"?: string | null,"old_in"?: string | null,"old_out"?: string | null,"reason": string,"session_id": string
                  }
                  Update: {
                    "created_at"?: string,"edited_by"?: string | null,"id"?: string,"new_in"?: string | null,"new_out"?: string | null,"old_in"?: string | null,"old_out"?: string | null,"reason"?: string,"session_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "attendance_edits_edited_by_fkey"
      columns: ["edited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_edits_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "attendance_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"attendance_sessions": {
                  Row: {
                    "auto_closed": boolean,"branch_id": string | null,"checked_in_at": string,"checked_out_at": string | null,"confirmed_at": string | null,"created_at": string,"field_card_id": string | null,"id": string,"is_late": boolean,"method": Database["public"]['Enums']["checkin_method"],"note": string | null,"user_id": string,"verify": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "auto_closed"?: boolean,"branch_id"?: string | null,"checked_in_at"?: string,"checked_out_at"?: string | null,"confirmed_at"?: string | null,"created_at"?: string,"field_card_id"?: string | null,"id"?: string,"is_late"?: boolean,"method": Database["public"]['Enums']["checkin_method"],"note"?: string | null,"user_id": string,"verify"?: NonNullable<Json>
                  }
                  Update: {
                    "auto_closed"?: boolean,"branch_id"?: string | null,"checked_in_at"?: string,"checked_out_at"?: string | null,"confirmed_at"?: string | null,"created_at"?: string,"field_card_id"?: string | null,"id"?: string,"is_late"?: boolean,"method"?: Database["public"]['Enums']["checkin_method"],"note"?: string | null,"user_id"?: string,"verify"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "attendance_sessions_branch_id_fkey"
      columns: ["branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_sessions_field_card_id_fkey"
      columns: ["field_card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_sessions_field_card_id_fkey"
      columns: ["field_card_id"]
isOneToOne: false
      referencedRelation: "v_card_flow"
      referencedColumns: ["card_id"]
    },{
      foreignKeyName: "attendance_sessions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"at": string,"id": string,"new_data": Json | null,"old_data": Json | null,"row_id": string | null,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"at"?: string,"id"?: string,"new_data"?: Json | null,"old_data"?: Json | null,"row_id"?: string | null,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"at"?: string,"id"?: string,"new_data"?: Json | null,"old_data"?: Json | null,"row_id"?: string | null,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"avatars": {
                  Row: {
                    "config": NonNullable<Json>,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "config": NonNullable<Json>,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "config"?: NonNullable<Json>,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "avatars_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"board_members": {
                  Row: {
                    "board_id": string,"created_at": string,"id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "board_id": string,"created_at"?: string,"id"?: string,"user_id": string
                  }
                  Update: {
                    "board_id"?: string,"created_at"?: string,"id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "board_members_board_id_fkey"
      columns: ["board_id"]
isOneToOne: false
      referencedRelation: "boards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "board_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"boards": {
                  Row: {
                    "archived_at": string | null,"created_at": string,"created_by": string | null,"description": string,"id": string,"is_pipeline": boolean,"name": string,"updated_at": string,"visibility": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"id"?: string,"is_pipeline"?: boolean,"name": string,"updated_at"?: string,"visibility"?: string,"workspace_id": string
                  }
                  Update: {
                    "archived_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"id"?: string,"is_pipeline"?: boolean,"name"?: string,"updated_at"?: string,"visibility"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "boards_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "boards_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"branch_secrets": {
                  Row: {
                    "branch_id": string,"hmac_secret": string,"kiosk_key_hash": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "branch_id": string,"hmac_secret"?: string,"kiosk_key_hash"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "branch_id"?: string,"hmac_secret"?: string,"kiosk_key_hash"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "branch_secrets_branch_id_fkey"
      columns: ["branch_id"]
isOneToOne: true
      referencedRelation: "branches"
      referencedColumns: ["id"]
    }
                  ]
                },"branches": {
                  Row: {
                    "area": string,"checkin_methods": (Database["public"]['Enums']["checkin_method"])[],"created_at": string,"id": string,"is_active": boolean,"map_key": string,"name_ar": string,"name_en": string,"public_ips": (unknown)[],"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "area"?: string,"checkin_methods"?: (Database["public"]['Enums']["checkin_method"])[],"created_at"?: string,"id"?: string,"is_active"?: boolean,"map_key"?: string,"name_ar": string,"name_en": string,"public_ips"?: (unknown)[],"slug": string
                  }
                  Update: {
                    "area"?: string,"checkin_methods"?: (Database["public"]['Enums']["checkin_method"])[],"created_at"?: string,"id"?: string,"is_active"?: boolean,"map_key"?: string,"name_ar"?: string,"name_en"?: string,"public_ips"?: (unknown)[],"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"brands": {
                  Row: {
                    "color": string,"created_at": string,"id": string,"name": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string,"created_at"?: string,"id"?: string,"name": string,"slug": string
                  }
                  Update: {
                    "color"?: string,"created_at"?: string,"id"?: string,"name"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"card_assignees": {
                  Row: {
                    "card_id": string,"created_at": string,"id": string,"role": Database["public"]['Enums']["assignee_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "card_id": string,"created_at"?: string,"id"?: string,"role"?: Database["public"]['Enums']["assignee_role"],"user_id": string
                  }
                  Update: {
                    "card_id"?: string,"created_at"?: string,"id"?: string,"role"?: Database["public"]['Enums']["assignee_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "card_assignees_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "card_assignees_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "v_card_flow"
      referencedColumns: ["card_id"]
    },{
      foreignKeyName: "card_assignees_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"card_events": {
                  Row: {
                    "actor_id": string | null,"card_id": string,"created_at": string,"data": NonNullable<Json>,"from_stage": Database["public"]['Enums']["card_stage"] | null,"id": string,"kind": string,"to_stage": Database["public"]['Enums']["card_stage"] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"card_id": string,"created_at"?: string,"data"?: NonNullable<Json>,"from_stage"?: Database["public"]['Enums']["card_stage"] | null,"id"?: string,"kind": string,"to_stage"?: Database["public"]['Enums']["card_stage"] | null
                  }
                  Update: {
                    "actor_id"?: string | null,"card_id"?: string,"created_at"?: string,"data"?: NonNullable<Json>,"from_stage"?: Database["public"]['Enums']["card_stage"] | null,"id"?: string,"kind"?: string,"to_stage"?: Database["public"]['Enums']["card_stage"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "card_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "card_events_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "card_events_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "v_card_flow"
      referencedColumns: ["card_id"]
    }
                  ]
                },"card_labels": {
                  Row: {
                    "card_id": string,"id": string,"label_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "card_id": string,"id"?: string,"label_id": string
                  }
                  Update: {
                    "card_id"?: string,"id"?: string,"label_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "card_labels_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "card_labels_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "v_card_flow"
      referencedColumns: ["card_id"]
    },{
      foreignKeyName: "card_labels_label_id_fkey"
      columns: ["label_id"]
isOneToOne: false
      referencedRelation: "labels"
      referencedColumns: ["id"]
    }
                  ]
                },"card_stage_periods": {
                  Row: {
                    "card_id": string,"entered_at": string,"id": string,"left_at": string | null,"stage": Database["public"]['Enums']["card_stage"]
                  }
                  ComputedFields: never
                  Insert: {
                    "card_id": string,"entered_at"?: string,"id"?: string,"left_at"?: string | null,"stage": Database["public"]['Enums']["card_stage"]
                  }
                  Update: {
                    "card_id"?: string,"entered_at"?: string,"id"?: string,"left_at"?: string | null,"stage"?: Database["public"]['Enums']["card_stage"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "card_stage_periods_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "card_stage_periods_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "v_card_flow"
      referencedColumns: ["card_id"]
    }
                  ]
                },"cards": {
                  Row: {
                    "approver_id": string | null,"archived_at": string | null,"board_id": string,"branch_id": string | null,"brand_id": string | null,"budget_note": string | null,"created_at": string,"created_by": string | null,"delivered_at": string | null,"description": string,"due_at": string | null,"due_notified_for": string | null,"format": string | null,"id": string,"is_late_submission": boolean,"key_message": string | null,"list_id": string,"missing_items": (string)[],"objective": string | null,"performance_notes": string | null,"platforms": (string)[],"position": string,"priority": Database["public"]['Enums']["card_priority"],"published_at": string | null,"reference_links": NonNullable<Json>,"request_kind": Database["public"]['Enums']["card_request_kind"] | null,"requester_id": string | null,"requesting_department_id": string | null,"returned_reason": string | null,"reviewer_id": string | null,"revision_count": number,"stage": Database["public"]['Enums']["card_stage"] | null,"stage_due_at": string | null,"stage_entered_at": string | null,"strategic_plan_id": string | null,"title": string,"updated_at": string,"urgent_reason": string | null,"vertical": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "approver_id"?: string | null,"archived_at"?: string | null,"board_id": string,"branch_id"?: string | null,"brand_id"?: string | null,"budget_note"?: string | null,"created_at"?: string,"created_by"?: string | null,"delivered_at"?: string | null,"description"?: string,"due_at"?: string | null,"due_notified_for"?: string | null,"format"?: string | null,"id"?: string,"is_late_submission"?: boolean,"key_message"?: string | null,"list_id": string,"missing_items"?: (string)[],"objective"?: string | null,"performance_notes"?: string | null,"platforms"?: (string)[],"position": string,"priority"?: Database["public"]['Enums']["card_priority"],"published_at"?: string | null,"reference_links"?: NonNullable<Json>,"request_kind"?: Database["public"]['Enums']["card_request_kind"] | null,"requester_id"?: string | null,"requesting_department_id"?: string | null,"returned_reason"?: string | null,"reviewer_id"?: string | null,"revision_count"?: number,"stage"?: Database["public"]['Enums']["card_stage"] | null,"stage_due_at"?: string | null,"stage_entered_at"?: string | null,"strategic_plan_id"?: string | null,"title": string,"updated_at"?: string,"urgent_reason"?: string | null,"vertical"?: string | null
                  }
                  Update: {
                    "approver_id"?: string | null,"archived_at"?: string | null,"board_id"?: string,"branch_id"?: string | null,"brand_id"?: string | null,"budget_note"?: string | null,"created_at"?: string,"created_by"?: string | null,"delivered_at"?: string | null,"description"?: string,"due_at"?: string | null,"due_notified_for"?: string | null,"format"?: string | null,"id"?: string,"is_late_submission"?: boolean,"key_message"?: string | null,"list_id"?: string,"missing_items"?: (string)[],"objective"?: string | null,"performance_notes"?: string | null,"platforms"?: (string)[],"position"?: string,"priority"?: Database["public"]['Enums']["card_priority"],"published_at"?: string | null,"reference_links"?: NonNullable<Json>,"request_kind"?: Database["public"]['Enums']["card_request_kind"] | null,"requester_id"?: string | null,"requesting_department_id"?: string | null,"returned_reason"?: string | null,"reviewer_id"?: string | null,"revision_count"?: number,"stage"?: Database["public"]['Enums']["card_stage"] | null,"stage_due_at"?: string | null,"stage_entered_at"?: string | null,"strategic_plan_id"?: string | null,"title"?: string,"updated_at"?: string,"urgent_reason"?: string | null,"vertical"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cards_approver_id_fkey"
      columns: ["approver_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cards_board_id_fkey"
      columns: ["board_id"]
isOneToOne: false
      referencedRelation: "boards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cards_branch_id_fkey"
      columns: ["branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cards_brand_id_fkey"
      columns: ["brand_id"]
isOneToOne: false
      referencedRelation: "brands"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cards_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cards_list_id_fkey"
      columns: ["list_id"]
isOneToOne: false
      referencedRelation: "lists"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cards_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cards_requesting_department_id_fkey"
      columns: ["requesting_department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cards_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cards_strategic_plan_id_fkey"
      columns: ["strategic_plan_id"]
isOneToOne: false
      referencedRelation: "strategic_plans"
      referencedColumns: ["id"]
    }
                  ]
                },"checklist_items": {
                  Row: {
                    "assignee_id": string | null,"checklist_id": string,"created_at": string,"done": boolean,"due_at": string | null,"id": string,"position": string,"text": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee_id"?: string | null,"checklist_id": string,"created_at"?: string,"done"?: boolean,"due_at"?: string | null,"id"?: string,"position"?: string,"text": string
                  }
                  Update: {
                    "assignee_id"?: string | null,"checklist_id"?: string,"created_at"?: string,"done"?: boolean,"due_at"?: string | null,"id"?: string,"position"?: string,"text"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "checklist_items_assignee_id_fkey"
      columns: ["assignee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checklist_items_checklist_id_fkey"
      columns: ["checklist_id"]
isOneToOne: false
      referencedRelation: "checklists"
      referencedColumns: ["id"]
    }
                  ]
                },"checklists": {
                  Row: {
                    "card_id": string,"created_at": string,"id": string,"position": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "card_id": string,"created_at"?: string,"id"?: string,"position"?: string,"title": string
                  }
                  Update: {
                    "card_id"?: string,"created_at"?: string,"id"?: string,"position"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "checklists_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checklists_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "v_card_flow"
      referencedColumns: ["card_id"]
    }
                  ]
                },"comments": {
                  Row: {
                    "author_id": string,"body": string,"card_id": string,"created_at": string,"edited_at": string | null,"id": string,"mentions": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"card_id": string,"created_at"?: string,"edited_at"?: string | null,"id"?: string,"mentions"?: (string)[]
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"card_id"?: string,"created_at"?: string,"edited_at"?: string | null,"id"?: string,"mentions"?: (string)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "v_card_flow"
      referencedColumns: ["card_id"]
    }
                  ]
                },"departments": {
                  Row: {
                    "created_at": string,"default_approver_id": string | null,"id": string,"is_marketing": boolean,"name_ar": string,"name_en": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"default_approver_id"?: string | null,"id"?: string,"is_marketing"?: boolean,"name_ar": string,"name_en": string,"slug": string
                  }
                  Update: {
                    "created_at"?: string,"default_approver_id"?: string | null,"id"?: string,"is_marketing"?: boolean,"name_ar"?: string,"name_en"?: string,"slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "departments_default_approver_fk"
      columns: ["default_approver_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"desks": {
                  Row: {
                    "assigned_user_id": string | null,"branch_id": string,"created_at": string,"id": string,"zone_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_user_id"?: string | null,"branch_id": string,"created_at"?: string,"id"?: string,"zone_name": string
                  }
                  Update: {
                    "assigned_user_id"?: string | null,"branch_id"?: string,"created_at"?: string,"id"?: string,"zone_name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "desks_assigned_user_id_fkey"
      columns: ["assigned_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "desks_branch_id_fkey"
      columns: ["branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["id"]
    }
                  ]
                },"holidays": {
                  Row: {
                    "created_at": string,"day": string,"id": string,"is_half_day": boolean,"name_ar": string,"name_en": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"day": string,"id"?: string,"is_half_day"?: boolean,"name_ar": string,"name_en": string
                  }
                  Update: {
                    "created_at"?: string,"day"?: string,"id"?: string,"is_half_day"?: boolean,"name_ar"?: string,"name_en"?: string
                  }
                  Relationships: [
                    
                  ]
                },"labels": {
                  Row: {
                    "board_id": string,"color": string,"created_at": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "board_id": string,"color"?: string,"created_at"?: string,"id"?: string,"name": string
                  }
                  Update: {
                    "board_id"?: string,"color"?: string,"created_at"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "labels_board_id_fkey"
      columns: ["board_id"]
isOneToOne: false
      referencedRelation: "boards"
      referencedColumns: ["id"]
    }
                  ]
                },"leave_balances": {
                  Row: {
                    "allowance": number,"id": string,"type_id": string,"updated_at": string,"used": number,"user_id": string,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "allowance"?: number,"id"?: string,"type_id": string,"updated_at"?: string,"used"?: number,"user_id": string,"year": number
                  }
                  Update: {
                    "allowance"?: number,"id"?: string,"type_id"?: string,"updated_at"?: string,"used"?: number,"user_id"?: string,"year"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "leave_balances_type_id_fkey"
      columns: ["type_id"]
isOneToOne: false
      referencedRelation: "request_types"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leave_balances_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"lists": {
                  Row: {
                    "archived_at": string | null,"board_id": string,"created_at": string,"id": string,"name": string,"position": string,"stage": Database["public"]['Enums']["card_stage"] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"board_id": string,"created_at"?: string,"id"?: string,"name": string,"position": string,"stage"?: Database["public"]['Enums']["card_stage"] | null
                  }
                  Update: {
                    "archived_at"?: string | null,"board_id"?: string,"created_at"?: string,"id"?: string,"name"?: string,"position"?: string,"stage"?: Database["public"]['Enums']["card_stage"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "lists_board_id_fkey"
      columns: ["board_id"]
isOneToOne: false
      referencedRelation: "boards"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string,"created_at": string,"data": NonNullable<Json>,"emailed_at": string | null,"id": string,"kind": string,"link": string | null,"read_at": string | null,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"created_at"?: string,"data"?: NonNullable<Json>,"emailed_at"?: string | null,"id"?: string,"kind": string,"link"?: string | null,"read_at"?: string | null,"title"?: string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"data"?: NonNullable<Json>,"emailed_at"?: string | null,"id"?: string,"kind"?: string,"link"?: string | null,"read_at"?: string | null,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"post_media": {
                  Row: {
                    "attachment_id": string | null,"created_at": string,"duration_seconds": number | null,"height": number | null,"id": string,"media_type": string,"position": string,"post_id": string,"storage_path": string,"thumbnail_path": string | null,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attachment_id"?: string | null,"created_at"?: string,"duration_seconds"?: number | null,"height"?: number | null,"id"?: string,"media_type": string,"position"?: string,"post_id": string,"storage_path": string,"thumbnail_path"?: string | null,"width"?: number | null
                  }
                  Update: {
                    "attachment_id"?: string | null,"created_at"?: string,"duration_seconds"?: number | null,"height"?: number | null,"id"?: string,"media_type"?: string,"position"?: string,"post_id"?: string,"storage_path"?: string,"thumbnail_path"?: string | null,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_media_attachment_id_fkey"
      columns: ["attachment_id"]
isOneToOne: false
      referencedRelation: "attachments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_media_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    }
                  ]
                },"posts": {
                  Row: {
                    "approved_by": string | null,"branch_id": string | null,"brand_id": string,"caption_ar": string,"caption_en": string,"card_id": string | null,"created_at": string,"first_comment": string,"format": string,"hashtags": (string)[],"id": string,"notes": string,"overdue_notified_at": string | null,"owner_id": string | null,"pillar": Database["public"]['Enums']["content_pillar"] | null,"platforms": (string)[],"published_at": string | null,"published_links": NonNullable<Json>,"publisher_id": string | null,"reminded_for": string | null,"review_comment": string | null,"scheduled_at": string | null,"status": Database["public"]['Enums']["post_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_by"?: string | null,"branch_id"?: string | null,"brand_id": string,"caption_ar"?: string,"caption_en"?: string,"card_id"?: string | null,"created_at"?: string,"first_comment"?: string,"format"?: string,"hashtags"?: (string)[],"id"?: string,"notes"?: string,"overdue_notified_at"?: string | null,"owner_id"?: string | null,"pillar"?: Database["public"]['Enums']["content_pillar"] | null,"platforms"?: (string)[],"published_at"?: string | null,"published_links"?: NonNullable<Json>,"publisher_id"?: string | null,"reminded_for"?: string | null,"review_comment"?: string | null,"scheduled_at"?: string | null,"status"?: Database["public"]['Enums']["post_status"],"updated_at"?: string
                  }
                  Update: {
                    "approved_by"?: string | null,"branch_id"?: string | null,"brand_id"?: string,"caption_ar"?: string,"caption_en"?: string,"card_id"?: string | null,"created_at"?: string,"first_comment"?: string,"format"?: string,"hashtags"?: (string)[],"id"?: string,"notes"?: string,"overdue_notified_at"?: string | null,"owner_id"?: string | null,"pillar"?: Database["public"]['Enums']["content_pillar"] | null,"platforms"?: (string)[],"published_at"?: string | null,"published_links"?: NonNullable<Json>,"publisher_id"?: string | null,"reminded_for"?: string | null,"review_comment"?: string | null,"scheduled_at"?: string | null,"status"?: Database["public"]['Enums']["post_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "posts_approved_by_fkey"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_branch_id_fkey"
      columns: ["branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_brand_id_fkey"
      columns: ["brand_id"]
isOneToOne: false
      referencedRelation: "brands"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_card_id_fkey"
      columns: ["card_id"]
isOneToOne: true
      referencedRelation: "cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_card_id_fkey"
      columns: ["card_id"]
isOneToOne: true
      referencedRelation: "v_card_flow"
      referencedColumns: ["card_id"]
    },{
      foreignKeyName: "posts_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_publisher_id_fkey"
      columns: ["publisher_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_seen": boolean,"created_at": string,"department_id": string | null,"display_name": string | null,"email": string,"full_name": string,"home_branch_id": string | null,"id": string,"locale": string,"must_change_password": boolean,"phone": string | null,"presence": Database["public"]['Enums']["presence_status"],"presence_updated_at": string,"status": Database["public"]['Enums']["profile_status"],"team_id": string | null,"title": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_seen"?: boolean,"created_at"?: string,"department_id"?: string | null,"display_name"?: string | null,"email": string,"full_name"?: string,"home_branch_id"?: string | null,"id": string,"locale"?: string,"must_change_password"?: boolean,"phone"?: string | null,"presence"?: Database["public"]['Enums']["presence_status"],"presence_updated_at"?: string,"status"?: Database["public"]['Enums']["profile_status"],"team_id"?: string | null,"title"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "avatar_seen"?: boolean,"created_at"?: string,"department_id"?: string | null,"display_name"?: string | null,"email"?: string,"full_name"?: string,"home_branch_id"?: string | null,"id"?: string,"locale"?: string,"must_change_password"?: boolean,"phone"?: string | null,"presence"?: Database["public"]['Enums']["presence_status"],"presence_updated_at"?: string,"status"?: Database["public"]['Enums']["profile_status"],"team_id"?: string | null,"title"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_home_branch_id_fkey"
      columns: ["home_branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"request_types": {
                  Row: {
                    "approval_chain": NonNullable<Json>,"category": string,"counts_working_days": boolean,"created_at": string,"form_schema": NonNullable<Json>,"id": string,"is_active": boolean,"is_leave": boolean,"key": string,"name_ar": string,"name_en": string,"requires_attachment_after_days": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "approval_chain"?: NonNullable<Json>,"category": string,"counts_working_days"?: boolean,"created_at"?: string,"form_schema"?: NonNullable<Json>,"id"?: string,"is_active"?: boolean,"is_leave"?: boolean,"key": string,"name_ar": string,"name_en": string,"requires_attachment_after_days"?: number | null
                  }
                  Update: {
                    "approval_chain"?: NonNullable<Json>,"category"?: string,"counts_working_days"?: boolean,"created_at"?: string,"form_schema"?: NonNullable<Json>,"id"?: string,"is_active"?: boolean,"is_leave"?: boolean,"key"?: string,"name_ar"?: string,"name_en"?: string,"requires_attachment_after_days"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"requests": {
                  Row: {
                    "created_at": string,"data": NonNullable<Json>,"days": number | null,"decided_at": string | null,"ends_on": string | null,"id": string,"requester_id": string,"starts_on": string | null,"status": Database["public"]['Enums']["request_status"],"submitted_at": string,"type_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"data"?: NonNullable<Json>,"days"?: number | null,"decided_at"?: string | null,"ends_on"?: string | null,"id"?: string,"requester_id": string,"starts_on"?: string | null,"status"?: Database["public"]['Enums']["request_status"],"submitted_at"?: string,"type_id": string
                  }
                  Update: {
                    "created_at"?: string,"data"?: NonNullable<Json>,"days"?: number | null,"decided_at"?: string | null,"ends_on"?: string | null,"id"?: string,"requester_id"?: string,"starts_on"?: string | null,"status"?: Database["public"]['Enums']["request_status"],"submitted_at"?: string,"type_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "requests_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "requests_type_id_fkey"
      columns: ["type_id"]
isOneToOne: false
      referencedRelation: "request_types"
      referencedColumns: ["id"]
    }
                  ]
                },"schedules": {
                  Row: {
                    "end_time": string,"id": string,"start_time": string,"timezone": string,"updated_at": string,"user_id": string,"workdays": (number)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "end_time"?: string,"id"?: string,"start_time"?: string,"timezone"?: string,"updated_at"?: string,"user_id": string,"workdays"?: (number)[]
                  }
                  Update: {
                    "end_time"?: string,"id"?: string,"start_time"?: string,"timezone"?: string,"updated_at"?: string,"user_id"?: string,"workdays"?: (number)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "schedules_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"settings": {
                  Row: {
                    "key": string,"updated_at": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"updated_at"?: string,"value": NonNullable<Json>
                  }
                  Update: {
                    "key"?: string,"updated_at"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"strategic_plans": {
                  Row: {
                    "created_at": string,"department_id": string,"for_month": string,"id": string,"is_late": boolean,"submitted_at": string,"submitted_by": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"department_id": string,"for_month": string,"id"?: string,"is_late"?: boolean,"submitted_at"?: string,"submitted_by": string
                  }
                  Update: {
                    "created_at"?: string,"department_id"?: string,"for_month"?: string,"id"?: string,"is_late"?: boolean,"submitted_at"?: string,"submitted_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "strategic_plans_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "strategic_plans_submitted_by_fkey"
      columns: ["submitted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"teams": {
                  Row: {
                    "color": string,"created_at": string,"department_id": string,"id": string,"name_ar": string,"name_en": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string,"created_at"?: string,"department_id": string,"id"?: string,"name_ar": string,"name_en": string,"slug": string
                  }
                  Update: {
                    "color"?: string,"created_at"?: string,"department_id"?: string,"id"?: string,"name_ar"?: string,"name_en"?: string,"slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teams_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                },"user_roles": {
                  Row: {
                    "created_at": string,"id": string,"role": Database["public"]['Enums']["app_role"],"team_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"role": Database["public"]['Enums']["app_role"],"team_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"role"?: Database["public"]['Enums']["app_role"],"team_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_roles_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_roles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"workspaces": {
                  Row: {
                    "created_at": string,"id": string,"name_ar": string,"name_en": string,"position": number,"slug": string,"team_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name_ar": string,"name_en": string,"position"?: number,"slug": string,"team_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name_ar"?: string,"name_en"?: string,"position"?: number,"slug"?: string,"team_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspaces_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "v_attendance_daily": {
                  Row: {
                    "checked_in": boolean | null,"day": string | null,"first_arrival": string | null,"hours": number | null,"is_late": boolean | null,"method": Database["public"]['Enums']["checkin_method"] | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "attendance_sessions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"v_card_flow": {
                  Row: {
                    "board_id": string | null,"brand_id": string | null,"card_id": string | null,"created_at": string | null,"days_to_deliver": number | null,"delivered_at": string | null,"due_at": string | null,"is_late_submission": boolean | null,"on_time": boolean | null,"request_kind": Database["public"]['Enums']["card_request_kind"] | null,"requesting_department_id": string | null,"revision_count": number | null,"stage": Database["public"]['Enums']["card_stage"] | null,"title": string | null,"vertical": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "board_id"?: string | null,"brand_id"?: string | null,"card_id"?: string | null,"created_at"?: string | null,"days_to_deliver"?: never,"delivered_at"?: string | null,"due_at"?: string | null,"is_late_submission"?: boolean | null,"on_time"?: never,"request_kind"?: Database["public"]['Enums']["card_request_kind"] | null,"requesting_department_id"?: string | null,"revision_count"?: number | null,"stage"?: Database["public"]['Enums']["card_stage"] | null,"title"?: string | null,"vertical"?: string | null
                         }
                        Update: {
                           "board_id"?: string | null,"brand_id"?: string | null,"card_id"?: string | null,"created_at"?: string | null,"days_to_deliver"?: never,"delivered_at"?: string | null,"due_at"?: string | null,"is_late_submission"?: boolean | null,"on_time"?: never,"request_kind"?: Database["public"]['Enums']["card_request_kind"] | null,"requesting_department_id"?: string | null,"revision_count"?: number | null,"stage"?: Database["public"]['Enums']["card_stage"] | null,"title"?: string | null,"vertical"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "cards_board_id_fkey"
      columns: ["board_id"]
isOneToOne: false
      referencedRelation: "boards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cards_brand_id_fkey"
      columns: ["brand_id"]
isOneToOne: false
      referencedRelation: "brands"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cards_requesting_department_id_fkey"
      columns: ["requesting_department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                },"v_leave_usage": {
                  Row: {
                    "allowance": number | null,"remaining": number | null,"type_id": string | null,"used": number | null,"user_id": string | null,"year": number | null
                  }
                  ComputedFields: never
                  Insert: {
                           "allowance"?: number | null,"remaining"?: never,"type_id"?: string | null,"used"?: number | null,"user_id"?: string | null,"year"?: number | null
                         }
                        Update: {
                           "allowance"?: number | null,"remaining"?: never,"type_id"?: string | null,"used"?: number | null,"user_id"?: string | null,"year"?: number | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "leave_balances_type_id_fkey"
      columns: ["type_id"]
isOneToOne: false
      referencedRelation: "request_types"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leave_balances_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"v_posts_monthly": {
                  Row: {
                    "brand_id": string | null,"month": string | null,"published": number | null,"scheduled": number | null,"target": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "posts_brand_id_fkey"
      columns: ["brand_id"]
isOneToOne: false
      referencedRelation: "brands"
      referencedColumns: ["id"]
    }
                  ]
                },"v_stage_durations": {
                  Row: {
                    "card_id": string | null,"entered_at": string | null,"hours": number | null,"left_at": string | null,"stage": Database["public"]['Enums']["card_stage"] | null
                  }
                  ComputedFields: never
                  Insert: {
                           "card_id"?: string | null,"entered_at"?: string | null,"hours"?: never,"left_at"?: string | null,"stage"?: Database["public"]['Enums']["card_stage"] | null
                         }
                        Update: {
                           "card_id"?: string | null,"entered_at"?: string | null,"hours"?: never,"left_at"?: string | null,"stage"?: Database["public"]['Enums']["card_stage"] | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "card_stage_periods_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "card_stage_periods_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "v_card_flow"
      referencedColumns: ["card_id"]
    }
                  ]
                },"v_workload": {
                  Row: {
                    "open_cards": number | null,"stage": Database["public"]['Enums']["card_stage"] | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "card_assignees_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "_branch_topic":
{ Args: { "p_branch_id": string,"p_method": Database["public"]['Enums']["checkin_method"] }; Returns: string
                           },
"_build_request_steps":
{ Args: { "p_chain": Json,"p_request_id": string,"p_requester": string }; Returns: boolean
                           },
"_check_line":
{ Args: { "p_line": Json,"p_strict": boolean }; Returns: undefined
                           },
"_create_card_step":
{ Args: { "p_card_id": string,"p_stage": Database["public"]['Enums']["card_stage"] }; Returns: string
                           },
"_creative_lead":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"_finish_request":
{ Args: { "p_request_id": string,"p_status": Database["public"]['Enums']["request_status"] }; Returns: undefined
                           },
"_has_wfh_today":
{ Args: { "p_user_id": string }; Returns: boolean
                           },
"_insert_department_card":
{ Args: { "p_kind": Database["public"]['Enums']["card_request_kind"],"p_late": boolean,"p_line": Json,"p_plan": string }; Returns: string
                           },
"_notify_role":
{ Args: { "p_data": Json,"p_kind": string,"p_link": string,"p_role": Database["public"]['Enums']["app_role"],"p_team"?: string }; Returns: undefined
                           },
"_require_requester":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"_resolve_approvers":
{ Args: { "p_requester": string,"p_resolver": string }; Returns: (string)[]
                           },
"_set_card_stage":
{ Args: { "p_card_id": string,"p_data"?: Json,"p_stage_due"?: string,"p_to": Database["public"]['Enums']["card_stage"] }; Returns: undefined
                           },
"admin_edit_session":
{ Args: { "p_new_in": string,"p_new_out": string,"p_reason": string,"p_session_id": string }; Returns: undefined
                           },
"admin_revoke_sessions":
{ Args: { "p_user_id": string }; Returns: undefined
                           },
"admin_rotate_qr_secret":
{ Args: { "p_branch_id": string }; Returns: undefined
                           },
"admin_set_kiosk_key_hash":
{ Args: { "p_branch_id": string,"p_hash": string }; Returns: undefined
                           },
"admin_set_roles":
{ Args: { "p_user_id": string,"roles": Json }; Returns: undefined
                           },
"admin_update_profile":
{ Args: { "p_user_id": string,"patch": Json }; Returns: undefined
                           },
"cairo_today":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"can_add_to_board":
{ Args: { "p_board_id": string }; Returns: boolean
                           },
"can_approve_posts":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"can_edit_board":
{ Args: { "p_board_id": string }; Returns: boolean
                           },
"can_edit_card":
{ Args: { "p_card_id": string }; Returns: boolean
                           },
"can_read_request_file":
{ Args: { "p_name": string }; Returns: boolean
                           },
"can_view_board":
{ Args: { "p_board_id": string }; Returns: boolean
                           },
"can_view_card":
{ Args: { "p_card_id": string }; Returns: boolean
                           },
"can_view_post":
{ Args: { "p_post_id": string }; Returns: boolean
                           },
"can_view_request":
{ Args: { "p_request_id": string }; Returns: boolean
                           },
"cancel_request":
{ Args: { "p_request_id": string }; Returns: undefined
                           },
"card_link":
{ Args: { "p_card_id": string }; Returns: string
                           },
"card_visible":
{ Args: { "p_approver_id": string,"p_board_id": string,"p_department_id": string }; Returns: boolean
                           },
"check_in":
{ Args: { "p_branch_id": string,"p_card_id"?: string,"p_method": Database["public"]['Enums']["checkin_method"],"p_note"?: string,"p_now"?: string,"p_user_id": string,"p_verify"?: Json }; Returns: string
                           },
"check_out":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"confirm_auto_checkout":
{ Args: { "p_actual_out": string,"p_session_id": string }; Returns: undefined
                           },
"create_internal_card":
{ Args: { "p_position": string,"p_title": string }; Returns: string
                           },
"create_post_from_card":
{ Args: { "p_card_id": string,"p_scheduled_at": string }; Returns: string
                           },
"cron_auto_checkout":
{ Args: { "p_now"?: string }; Returns: number
                           },
"cron_daily":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"cron_due_soon":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"cron_post_reminders":
{ Args: { "p_now"?: string }; Returns: number
                           },
"decide_post":
{ Args: { "p_approve": boolean,"p_comment"?: string,"p_post_id": string }; Returns: undefined
                           },
"decide_step":
{ Args: { "p_comment"?: string,"p_decision": Database["public"]['Enums']["step_status"],"p_reason"?: Database["public"]['Enums']["revision_reason"],"p_step_id": string }; Returns: undefined
                           },
"has_any_role":
{ Args: { "rs": (Database["public"]['Enums']["app_role"])[] }; Returns: boolean
                           },
"has_role":
{ Args: { "r": Database["public"]['Enums']["app_role"] }; Returns: boolean
                           },
"in_team":
{ Args: { "slug": string }; Returns: boolean
                           },
"is_active_user":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_board_member":
{ Args: { "p_board_id": string }; Returns: boolean
                           },
"is_marketing":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_marketing_writer":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_portal_user":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_team_app_user":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_team_lead_of":
{ Args: { "target": string }; Returns: boolean
                           },
"mark_post_published":
{ Args: { "p_links"?: Json,"p_post_id": string }; Returns: undefined
                           },
"move_card_stage":
{ Args: { "p_card_id": string,"p_payload"?: Json,"p_to": Database["public"]['Enums']["card_stage"] }; Returns: undefined
                           },
"my_access":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"my_department_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"my_open_session":
{ Args: Record<PropertyKey, never>; Returns: {
              "branch_id": string,"checked_in_at": string,"id": string,"is_late": boolean,"method": Database["public"]['Enums']["checkin_method"]
            }[]
                           },
"my_wfh_today":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"notify":
{ Args: { "p_body"?: string,"p_data"?: Json,"p_kind": string,"p_link": string,"p_title"?: string,"p_user_id": string }; Returns: undefined
                           },
"pipeline_board_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"post_visible":
{ Args: { "p_card_id": string }; Returns: boolean
                           },
"public_profiles":
{ Args: Record<PropertyKey, never>; Returns: {
              "department_id": string,"display_name": string,"id": string,"team_id": string,"title": string
            }[]
                           },
"require_password_change":
{ Args: { "p_user_id": string }; Returns: undefined
                           },
"resubmit_request":
{ Args: { "p_card_id": string,"payload": Json }; Returns: undefined
                           },
"set_card_reviewers":
{ Args: { "p_approver": string,"p_card_id": string,"p_reviewer": string }; Returns: undefined
                           },
"strategic_is_late":
{ Args: { "p_at": string,"p_for_month": string }; Returns: boolean
                           },
"submit_post":
{ Args: { "p_post_id": string }; Returns: undefined
                           },
"submit_request":
{ Args: { "data": Json,"type_key": string }; Returns: string
                           },
"submit_strategic_plan":
{ Args: { "payload": Json }; Returns: string
                           },
"submit_urgent_request":
{ Args: { "payload": Json }; Returns: string
                           },
"team_absences":
{ Args: { "p_from": string,"p_to": string }; Returns: {
              "category": string,"ends_on": string,"starts_on": string,"user_id": string
            }[]
                           },
"try_uuid":
{ Args: { "t": string }; Returns: string
                           },
"who_is_in":
{ Args: { "p_branch_id"?: string }; Returns: {
              "branch_id": string,"checked_in_at": string,"field_card_id": string,"method": Database["public"]['Enums']["checkin_method"],"note": string,"user_id": string
            }[]
                           },
"working_days":
{ Args: { "p_from": string,"p_to": string }; Returns: number
                           }
          }
          Enums: {
            "app_role": "super_admin"|"leadership"|"team_lead"|"traffic_manager"|"member"|"requester"|"final_approver"|"hr"|"guest","assignee_role": "design"|"copy"|"video"|"media_buying"|"other","card_priority": "low"|"normal"|"high"|"urgent","card_request_kind": "strategic"|"urgent"|"internal","card_stage": "request"|"performance_input"|"intake"|"brief_schedule"|"production"|"creative_review"|"confirmation"|"ready_to_publish"|"published"|"reported","checkin_method": "wifi"|"qr"|"field"|"home"|"manual","content_pillar": "awareness"|"engagement"|"insights"|"offer"|"community","post_status": "draft"|"in_review"|"approved"|"scheduled"|"published","presence_status": "available"|"focus"|"meeting"|"shoot"|"break"|"away","profile_status": "active"|"inactive","request_status": "pending"|"approved"|"rejected"|"cancelled","revision_reason": "brief_changed"|"quality"|"new_information"|"other","step_status": "waiting"|"active"|"approved"|"rejected"|"changes_requested"|"skipped"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "app_role": ["super_admin", "leadership", "team_lead", "traffic_manager", "member", "requester", "final_approver", "hr", "guest"],"assignee_role": ["design", "copy", "video", "media_buying", "other"],"card_priority": ["low", "normal", "high", "urgent"],"card_request_kind": ["strategic", "urgent", "internal"],"card_stage": ["request", "performance_input", "intake", "brief_schedule", "production", "creative_review", "confirmation", "ready_to_publish", "published", "reported"],"checkin_method": ["wifi", "qr", "field", "home", "manual"],"content_pillar": ["awareness", "engagement", "insights", "offer", "community"],"post_status": ["draft", "in_review", "approved", "scheduled", "published"],"presence_status": ["available", "focus", "meeting", "shoot", "break", "away"],"profile_status": ["active", "inactive"],"request_status": ["pending", "approved", "rejected", "cancelled"],"revision_reason": ["brief_changed", "quality", "new_information", "other"],"step_status": ["waiting", "active", "approved", "rejected", "changes_requested", "skipped"]
          }
        }
} as const
