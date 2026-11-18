
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
                    "auto_closed": boolean,"branch_id": string | null,"checked_in_at": string,"checked_out_at": string | null,"checkin_accuracy_m": number | null,"checkin_lat": number | null,"checkin_lng": number | null,"checkin_place": string | null,"checkout_accuracy_m": number | null,"checkout_lat": number | null,"checkout_lng": number | null,"confirmed_at": string | null,"created_at": string,"distance_m": number | null,"field_card_id": string | null,"id": string,"is_late": boolean,"method": Database["public"]['Enums']["checkin_method"],"note": string | null,"shoot_id": string | null,"user_id": string,"verify": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "auto_closed"?: boolean,"branch_id"?: string | null,"checked_in_at"?: string,"checked_out_at"?: string | null,"checkin_accuracy_m"?: number | null,"checkin_lat"?: number | null,"checkin_lng"?: number | null,"checkin_place"?: string | null,"checkout_accuracy_m"?: number | null,"checkout_lat"?: number | null,"checkout_lng"?: number | null,"confirmed_at"?: string | null,"created_at"?: string,"distance_m"?: number | null,"field_card_id"?: string | null,"id"?: string,"is_late"?: boolean,"method": Database["public"]['Enums']["checkin_method"],"note"?: string | null,"shoot_id"?: string | null,"user_id": string,"verify"?: NonNullable<Json>
                  }
                  Update: {
                    "auto_closed"?: boolean,"branch_id"?: string | null,"checked_in_at"?: string,"checked_out_at"?: string | null,"checkin_accuracy_m"?: number | null,"checkin_lat"?: number | null,"checkin_lng"?: number | null,"checkin_place"?: string | null,"checkout_accuracy_m"?: number | null,"checkout_lat"?: number | null,"checkout_lng"?: number | null,"confirmed_at"?: string | null,"created_at"?: string,"distance_m"?: number | null,"field_card_id"?: string | null,"id"?: string,"is_late"?: boolean,"method"?: Database["public"]['Enums']["checkin_method"],"note"?: string | null,"shoot_id"?: string | null,"user_id"?: string,"verify"?: NonNullable<Json>
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
      foreignKeyName: "attendance_sessions_shoot_id_fkey"
      columns: ["shoot_id"]
isOneToOne: false
      referencedRelation: "shoots"
      referencedColumns: ["id"]
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
                    "config": NonNullable<Json>,"looks": NonNullable<Json>,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "config": NonNullable<Json>,"looks"?: NonNullable<Json>,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "config"?: NonNullable<Json>,"looks"?: NonNullable<Json>,"updated_at"?: string,"user_id"?: string
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
                },"branches": {
                  Row: {
                    "area": string,"checkin_methods": (Database["public"]['Enums']["checkin_method"])[],"created_at": string,"geofence_radius_m": number,"id": string,"is_active": boolean,"latitude": number | null,"location_confirmed_at": string | null,"longitude": number | null,"map_key": string,"name_ar": string,"name_en": string,"public_ips": (unknown)[],"slug": string,"branch_geofence_m": number | null
                  }
                  ComputedFields: "branch_geofence_m"
                  Insert: {
                    "area"?: string,"checkin_methods"?: (Database["public"]['Enums']["checkin_method"])[],"created_at"?: string,"geofence_radius_m"?: number,"id"?: string,"is_active"?: boolean,"latitude"?: number | null,"location_confirmed_at"?: string | null,"longitude"?: number | null,"map_key"?: string,"name_ar": string,"name_en": string,"public_ips"?: (unknown)[],"slug": string
                  }
                  Update: {
                    "area"?: string,"checkin_methods"?: (Database["public"]['Enums']["checkin_method"])[],"created_at"?: string,"geofence_radius_m"?: number,"id"?: string,"is_active"?: boolean,"latitude"?: number | null,"location_confirmed_at"?: string | null,"longitude"?: number | null,"map_key"?: string,"name_ar"?: string,"name_en"?: string,"public_ips"?: (unknown)[],"slug"?: string
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
                },"cron_log": {
                  Row: {
                    "at": string,"key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "at"?: string,"key": string
                  }
                  Update: {
                    "at"?: string,"key"?: string
                  }
                  Relationships: [
                    
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
                },"gate_item_cards": {
                  Row: {
                    "card_id": string,"item_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "card_id": string,"item_id": string
                  }
                  Update: {
                    "card_id"?: string,"item_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gate_item_cards_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gate_item_cards_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "v_card_flow"
      referencedColumns: ["card_id"]
    },{
      foreignKeyName: "gate_item_cards_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "gate_items"
      referencedColumns: ["id"]
    }
                  ]
                },"gate_item_exclusions": {
                  Row: {
                    "created_at": string,"due_on": string,"month": string,"template_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"due_on": string,"month": string,"template_id": string
                  }
                  Update: {
                    "created_at"?: string,"due_on"?: string,"month"?: string,"template_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gate_item_exclusions_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "gate_templates"
      referencedColumns: ["id"]
    }
                  ]
                },"gate_items": {
                  Row: {
                    "completed_at": string | null,"completed_by": string | null,"created_at": string,"customised": boolean,"due_on": string,"id": string,"kind": Database["public"]['Enums']["gate_kind"],"month": string,"name_ar": string,"name_en": string,"note": string,"owner_id": string | null,"position": number,"starts_on": string,"status": Database["public"]['Enums']["gate_status"],"template_id": string | null,"track_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"customised"?: boolean,"due_on": string,"id"?: string,"kind": Database["public"]['Enums']["gate_kind"],"month": string,"name_ar": string,"name_en": string,"note"?: string,"owner_id"?: string | null,"position"?: number,"starts_on": string,"status"?: Database["public"]['Enums']["gate_status"],"template_id"?: string | null,"track_id": string,"updated_at"?: string
                  }
                  Update: {
                    "completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"customised"?: boolean,"due_on"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["gate_kind"],"month"?: string,"name_ar"?: string,"name_en"?: string,"note"?: string,"owner_id"?: string | null,"position"?: number,"starts_on"?: string,"status"?: Database["public"]['Enums']["gate_status"],"template_id"?: string | null,"track_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gate_items_completed_by_fkey"
      columns: ["completed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gate_items_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gate_items_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "gate_templates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gate_items_track_id_fkey"
      columns: ["track_id"]
isOneToOne: false
      referencedRelation: "gate_tracks"
      referencedColumns: ["id"]
    }
                  ]
                },"gate_templates": {
                  Row: {
                    "created_at": string,"end_day": number,"id": string,"is_active": boolean,"kind": Database["public"]['Enums']["gate_kind"],"name_ar": string,"name_en": string,"owner_id": string | null,"position": number,"start_day": number,"track_id": string,"updated_at": string,"weekdays": (number)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"end_day": number,"id"?: string,"is_active"?: boolean,"kind": Database["public"]['Enums']["gate_kind"],"name_ar": string,"name_en": string,"owner_id"?: string | null,"position"?: number,"start_day": number,"track_id": string,"updated_at"?: string,"weekdays"?: (number)[]
                  }
                  Update: {
                    "created_at"?: string,"end_day"?: number,"id"?: string,"is_active"?: boolean,"kind"?: Database["public"]['Enums']["gate_kind"],"name_ar"?: string,"name_en"?: string,"owner_id"?: string | null,"position"?: number,"start_day"?: number,"track_id"?: string,"updated_at"?: string,"weekdays"?: (number)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "gate_templates_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gate_templates_track_id_fkey"
      columns: ["track_id"]
isOneToOne: false
      referencedRelation: "gate_tracks"
      referencedColumns: ["id"]
    }
                  ]
                },"gate_tracks": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"key": string,"name_ar": string,"name_en": string,"position": number,"subtitle_ar": string,"subtitle_en": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"key": string,"name_ar": string,"name_en": string,"position"?: number,"subtitle_ar"?: string,"subtitle_en"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"key"?: string,"name_ar"?: string,"name_en"?: string,"position"?: number,"subtitle_ar"?: string,"subtitle_en"?: string
                  }
                  Relationships: [
                    
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
                },"kudos": {
                  Row: {
                    "badge": string,"created_at": string,"from_id": string,"id": string,"message": string,"to_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "badge"?: string,"created_at"?: string,"from_id"?: string,"id"?: string,"message": string,"to_id": string
                  }
                  Update: {
                    "badge"?: string,"created_at"?: string,"from_id"?: string,"id"?: string,"message"?: string,"to_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "kudos_from_id_fkey"
      columns: ["from_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "kudos_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
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
                },"map_interactions": {
                  Row: {
                    "created_at": string,"from_id": string,"id": string,"kind": string,"to_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"from_id": string,"id"?: string,"kind": string,"to_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"from_id"?: string,"id"?: string,"kind"?: string,"to_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "map_interactions_from_id_fkey"
      columns: ["from_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "map_interactions_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"map_positions": {
                  Row: {
                    "branch_id": string,"tile_x": number,"tile_y": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "branch_id": string,"tile_x": number,"tile_y": number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "branch_id"?: string,"tile_x"?: number,"tile_y"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "map_positions_branch_id_fkey"
      columns: ["branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "map_positions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"meeting_actions": {
                  Row: {
                    "assignee_id": string | null,"card_id": string | null,"created_at": string,"created_by": string,"done": boolean,"due_on": string | null,"id": string,"meeting_id": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee_id"?: string | null,"card_id"?: string | null,"created_at"?: string,"created_by"?: string,"done"?: boolean,"due_on"?: string | null,"id"?: string,"meeting_id": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "assignee_id"?: string | null,"card_id"?: string | null,"created_at"?: string,"created_by"?: string,"done"?: boolean,"due_on"?: string | null,"id"?: string,"meeting_id"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meeting_actions_assignee_id_fkey"
      columns: ["assignee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meeting_actions_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meeting_actions_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "v_card_flow"
      referencedColumns: ["card_id"]
    },{
      foreignKeyName: "meeting_actions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meeting_actions_meeting_id_fkey"
      columns: ["meeting_id"]
isOneToOne: false
      referencedRelation: "meetings"
      referencedColumns: ["id"]
    }
                  ]
                },"meeting_attendees": {
                  Row: {
                    "meeting_id": string,"presence_set": boolean,"responded_at": string | null,"response": Database["public"]['Enums']["attendee_response"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "meeting_id": string,"presence_set"?: boolean,"responded_at"?: string | null,"response"?: Database["public"]['Enums']["attendee_response"],"user_id": string
                  }
                  Update: {
                    "meeting_id"?: string,"presence_set"?: boolean,"responded_at"?: string | null,"response"?: Database["public"]['Enums']["attendee_response"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meeting_attendees_meeting_id_fkey"
      columns: ["meeting_id"]
isOneToOne: false
      referencedRelation: "meetings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meeting_attendees_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"meeting_guests": {
                  Row: {
                    "created_at": string,"email": string,"id": string,"invited_at": string | null,"meeting_id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"id"?: string,"invited_at"?: string | null,"meeting_id": string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"id"?: string,"invited_at"?: string | null,"meeting_id"?: string,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meeting_guests_meeting_id_fkey"
      columns: ["meeting_id"]
isOneToOne: false
      referencedRelation: "meetings"
      referencedColumns: ["id"]
    }
                  ]
                },"meeting_rooms": {
                  Row: {
                    "branch_id": string | null,"capacity": number,"created_at": string,"id": string,"is_active": boolean,"name_ar": string,"name_en": string
                  }
                  ComputedFields: never
                  Insert: {
                    "branch_id"?: string | null,"capacity"?: number,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name_ar": string,"name_en": string
                  }
                  Update: {
                    "branch_id"?: string | null,"capacity"?: number,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name_ar"?: string,"name_en"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meeting_rooms_branch_id_fkey"
      columns: ["branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["id"]
    }
                  ]
                },"meeting_series": {
                  Row: {
                    "agenda": string,"audience": string,"cadence": Database["public"]['Enums']["meeting_cadence"],"created_at": string,"created_by": string | null,"duration_minutes": number,"ends_on": string | null,"id": string,"is_active": boolean,"month_days": (number)[],"online_url": string | null,"owner_id": string | null,"room_id": string | null,"start_time": string,"starts_on": string,"title": string,"title_ar": string | null,"updated_at": string,"weekdays": (number)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "agenda"?: string,"audience"?: string,"cadence": Database["public"]['Enums']["meeting_cadence"],"created_at"?: string,"created_by"?: string | null,"duration_minutes"?: number,"ends_on"?: string | null,"id"?: string,"is_active"?: boolean,"month_days"?: (number)[],"online_url"?: string | null,"owner_id"?: string | null,"room_id"?: string | null,"start_time": string,"starts_on"?: string,"title": string,"title_ar"?: string | null,"updated_at"?: string,"weekdays"?: (number)[]
                  }
                  Update: {
                    "agenda"?: string,"audience"?: string,"cadence"?: Database["public"]['Enums']["meeting_cadence"],"created_at"?: string,"created_by"?: string | null,"duration_minutes"?: number,"ends_on"?: string | null,"id"?: string,"is_active"?: boolean,"month_days"?: (number)[],"online_url"?: string | null,"owner_id"?: string | null,"room_id"?: string | null,"start_time"?: string,"starts_on"?: string,"title"?: string,"title_ar"?: string | null,"updated_at"?: string,"weekdays"?: (number)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "meeting_series_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meeting_series_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meeting_series_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "meeting_rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"meeting_series_members": {
                  Row: {
                    "series_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "series_id": string,"user_id": string
                  }
                  Update: {
                    "series_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meeting_series_members_series_id_fkey"
      columns: ["series_id"]
isOneToOne: false
      referencedRelation: "meeting_series"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meeting_series_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"meetings": {
                  Row: {
                    "agenda": string,"created_at": string,"detached": boolean,"ends_at": string,"id": string,"is_private": boolean,"location_text": string | null,"notes": string,"occurrence_on": string | null,"online_url": string | null,"organizer_id": string | null,"reminded_at": string | null,"room_id": string | null,"series_id": string | null,"starts_at": string,"status": Database["public"]['Enums']["meeting_status"],"title": string,"title_ar": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agenda"?: string,"created_at"?: string,"detached"?: boolean,"ends_at": string,"id"?: string,"is_private"?: boolean,"location_text"?: string | null,"notes"?: string,"occurrence_on"?: string | null,"online_url"?: string | null,"organizer_id"?: string | null,"reminded_at"?: string | null,"room_id"?: string | null,"series_id"?: string | null,"starts_at": string,"status"?: Database["public"]['Enums']["meeting_status"],"title": string,"title_ar"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "agenda"?: string,"created_at"?: string,"detached"?: boolean,"ends_at"?: string,"id"?: string,"is_private"?: boolean,"location_text"?: string | null,"notes"?: string,"occurrence_on"?: string | null,"online_url"?: string | null,"organizer_id"?: string | null,"reminded_at"?: string | null,"room_id"?: string | null,"series_id"?: string | null,"starts_at"?: string,"status"?: Database["public"]['Enums']["meeting_status"],"title"?: string,"title_ar"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meetings_organizer_id_fkey"
      columns: ["organizer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meetings_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "meeting_rooms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meetings_series_id_fkey"
      columns: ["series_id"]
isOneToOne: false
      referencedRelation: "meeting_series"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_preferences": {
                  Row: {
                    "digest_email": boolean,"push_enabled": boolean,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "digest_email"?: boolean,"push_enabled"?: boolean,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "digest_email"?: boolean,"push_enabled"?: boolean,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_preferences_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string,"created_at": string,"data": NonNullable<Json>,"emailed_at": string | null,"id": string,"kind": string,"link": string | null,"pushed_at": string | null,"read_at": string | null,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"created_at"?: string,"data"?: NonNullable<Json>,"emailed_at"?: string | null,"id"?: string,"kind": string,"link"?: string | null,"pushed_at"?: string | null,"read_at"?: string | null,"title"?: string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"data"?: NonNullable<Json>,"emailed_at"?: string | null,"id"?: string,"kind"?: string,"link"?: string | null,"pushed_at"?: string | null,"read_at"?: string | null,"title"?: string,"user_id"?: string
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
                    "avatar_seen": boolean,"birth_day": number | null,"birth_month": number | null,"celebrate": boolean,"created_at": string,"department_id": string | null,"display_name": string | null,"email": string,"full_name": string,"home_branch_id": string | null,"id": string,"joined_on": string | null,"locale": string,"must_change_password": boolean,"phone": string | null,"presence": Database["public"]['Enums']["presence_status"],"presence_updated_at": string,"status": Database["public"]['Enums']["profile_status"],"team_id": string | null,"title": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_seen"?: boolean,"birth_day"?: number | null,"birth_month"?: number | null,"celebrate"?: boolean,"created_at"?: string,"department_id"?: string | null,"display_name"?: string | null,"email": string,"full_name"?: string,"home_branch_id"?: string | null,"id": string,"joined_on"?: string | null,"locale"?: string,"must_change_password"?: boolean,"phone"?: string | null,"presence"?: Database["public"]['Enums']["presence_status"],"presence_updated_at"?: string,"status"?: Database["public"]['Enums']["profile_status"],"team_id"?: string | null,"title"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "avatar_seen"?: boolean,"birth_day"?: number | null,"birth_month"?: number | null,"celebrate"?: boolean,"created_at"?: string,"department_id"?: string | null,"display_name"?: string | null,"email"?: string,"full_name"?: string,"home_branch_id"?: string | null,"id"?: string,"joined_on"?: string | null,"locale"?: string,"must_change_password"?: boolean,"phone"?: string | null,"presence"?: Database["public"]['Enums']["presence_status"],"presence_updated_at"?: string,"status"?: Database["public"]['Enums']["profile_status"],"team_id"?: string | null,"title"?: string | null,"updated_at"?: string
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
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": string,"last_used_at": string | null,"p256dh": string,"user_agent": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: string,"last_used_at"?: string | null,"p256dh": string,"user_agent"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: string,"last_used_at"?: string | null,"p256dh"?: string,"user_agent"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
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
                },"seasonal_events": {
                  Row: {
                    "created_at": string,"ends_on": string,"id": string,"is_active": boolean,"items": (string)[],"key": string,"name_ar": string,"name_en": string,"starts_on": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ends_on": string,"id"?: string,"is_active"?: boolean,"items"?: (string)[],"key": string,"name_ar": string,"name_en": string,"starts_on": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"ends_on"?: string,"id"?: string,"is_active"?: boolean,"items"?: (string)[],"key"?: string,"name_ar"?: string,"name_en"?: string,"starts_on"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
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
                },"shoot_cards": {
                  Row: {
                    "card_id": string,"shoot_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "card_id": string,"shoot_id": string
                  }
                  Update: {
                    "card_id"?: string,"shoot_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shoot_cards_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shoot_cards_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "v_card_flow"
      referencedColumns: ["card_id"]
    },{
      foreignKeyName: "shoot_cards_shoot_id_fkey"
      columns: ["shoot_id"]
isOneToOne: false
      referencedRelation: "shoots"
      referencedColumns: ["id"]
    }
                  ]
                },"shoot_crew": {
                  Row: {
                    "call_time": string | null,"confirmed": boolean,"created_at": string,"external_name": string | null,"id": string,"role": string,"shoot_id": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "call_time"?: string | null,"confirmed"?: boolean,"created_at"?: string,"external_name"?: string | null,"id"?: string,"role"?: string,"shoot_id": string,"user_id"?: string | null
                  }
                  Update: {
                    "call_time"?: string | null,"confirmed"?: boolean,"created_at"?: string,"external_name"?: string | null,"id"?: string,"role"?: string,"shoot_id"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "shoot_crew_shoot_id_fkey"
      columns: ["shoot_id"]
isOneToOne: false
      referencedRelation: "shoots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shoot_crew_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"shoot_equipment": {
                  Row: {
                    "created_at": string,"id": string,"item": string,"owner_id": string | null,"packed": boolean,"quantity": number,"returned": boolean,"shoot_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"item": string,"owner_id"?: string | null,"packed"?: boolean,"quantity"?: number,"returned"?: boolean,"shoot_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"item"?: string,"owner_id"?: string | null,"packed"?: boolean,"quantity"?: number,"returned"?: boolean,"shoot_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shoot_equipment_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shoot_equipment_shoot_id_fkey"
      columns: ["shoot_id"]
isOneToOne: false
      referencedRelation: "shoots"
      referencedColumns: ["id"]
    }
                  ]
                },"shoot_shots": {
                  Row: {
                    "card_id": string | null,"created_at": string,"description": string,"done": boolean,"id": string,"notes": string,"position": number,"shoot_id": string,"shot_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "card_id"?: string | null,"created_at"?: string,"description": string,"done"?: boolean,"id"?: string,"notes"?: string,"position"?: number,"shoot_id": string,"shot_type"?: string
                  }
                  Update: {
                    "card_id"?: string | null,"created_at"?: string,"description"?: string,"done"?: boolean,"id"?: string,"notes"?: string,"position"?: number,"shoot_id"?: string,"shot_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shoot_shots_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shoot_shots_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "v_card_flow"
      referencedColumns: ["card_id"]
    },{
      foreignKeyName: "shoot_shots_shoot_id_fkey"
      columns: ["shoot_id"]
isOneToOne: false
      referencedRelation: "shoots"
      referencedColumns: ["id"]
    }
                  ]
                },"shoots": {
                  Row: {
                    "archived_at": string | null,"backup_plan": string,"branch_id": string | null,"brief": string,"call_time": string,"created_at": string,"created_by": string | null,"id": string,"location_name": string | null,"location_url": string | null,"producer_id": string | null,"shoot_on": string,"status": Database["public"]['Enums']["shoot_status"],"title": string,"updated_at": string,"wrap_time": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"backup_plan"?: string,"branch_id"?: string | null,"brief"?: string,"call_time"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"location_name"?: string | null,"location_url"?: string | null,"producer_id"?: string | null,"shoot_on": string,"status"?: Database["public"]['Enums']["shoot_status"],"title": string,"updated_at"?: string,"wrap_time"?: string | null
                  }
                  Update: {
                    "archived_at"?: string | null,"backup_plan"?: string,"branch_id"?: string | null,"brief"?: string,"call_time"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"location_name"?: string | null,"location_url"?: string | null,"producer_id"?: string | null,"shoot_on"?: string,"status"?: Database["public"]['Enums']["shoot_status"],"title"?: string,"updated_at"?: string,"wrap_time"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "shoots_branch_id_fkey"
      columns: ["branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shoots_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shoots_producer_id_fkey"
      columns: ["producer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
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
                },"week_plan_entries": {
                  Row: {
                    "branch_id": string | null,"created_at": string,"created_by": string | null,"day": string,"id": string,"kind": Database["public"]['Enums']["week_plan_kind"],"place": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "branch_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"day": string,"id"?: string,"kind": Database["public"]['Enums']["week_plan_kind"],"place"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "branch_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"day"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["week_plan_kind"],"place"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "week_plan_entries_branch_id_fkey"
      columns: ["branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "week_plan_entries_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "week_plan_entries_user_id_fkey"
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
"_build_gate_month":
{ Args: { "p_month": string }; Returns: number
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
"_distance_m":
{ Args: { "p_lat1": number,"p_lat2": number,"p_lng1": number,"p_lng2": number }; Returns: number
                           },
"_finish_request":
{ Args: { "p_request_id": string,"p_status": Database["public"]['Enums']["request_status"] }; Returns: undefined
                           },
"_generate_meetings":
{ Args: { "p_from": string,"p_series"?: string,"p_to": string }; Returns: number
                           },
"_has_wfh_today":
{ Args: { "p_user_id": string }; Returns: boolean
                           },
"_insert_department_card":
{ Args: { "p_kind": Database["public"]['Enums']["card_request_kind"],"p_late": boolean,"p_line": Json,"p_plan": string }; Returns: string
                           },
"_is_workday":
{ Args: { "p_day": string }; Returns: boolean
                           },
"_notify_role":
{ Args: { "p_data": Json,"p_kind": string,"p_link": string,"p_role": Database["public"]['Enums']["app_role"],"p_team"?: string }; Returns: undefined
                           },
"_once":
{ Args: { "p_key": string }; Returns: boolean
                           },
"_require_requester":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"_resolve_approvers":
{ Args: { "p_requester": string,"p_resolver": string }; Returns: (string)[]
                           },
"_roll_back_workday":
{ Args: { "p_day": string }; Returns: string
                           },
"_series_dates":
{ Args: { "p_from": string,"p_to": string,"s": Omit<Database["public"]['Tables']["meeting_series"]['Row'], Database["public"]['Tables']["meeting_series"]['ComputedFields']> }; Returns: string[]
                           },
"_set_card_stage":
{ Args: { "p_card_id": string,"p_data"?: Json,"p_stage_due"?: string,"p_to": Database["public"]['Enums']["card_stage"] }; Returns: undefined
                           },
"_sync_gate_months":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"admin_edit_session":
{ Args: { "p_new_in": string,"p_new_out": string,"p_reason": string,"p_session_id": string }; Returns: undefined
                           },
"admin_revoke_sessions":
{ Args: { "p_user_id": string }; Returns: undefined
                           },
"admin_set_roles":
{ Args: { "p_user_id": string,"roles": Json }; Returns: undefined
                           },
"admin_update_profile":
{ Args: { "p_user_id": string,"patch": Json }; Returns: undefined
                           },
"archive_meeting_series":
{ Args: { "p_id": string }; Returns: undefined
                           },
"branch_geofence_m":
{ Args: { "b": Omit<Database["public"]['Tables']["branches"]['Row'], Database["public"]['Tables']["branches"]['ComputedFields']> }; Returns: number
                           },
"cairo_today":
{ Args: Record<PropertyKey, never>; Returns: string
                           } |
{ Args: { "p_now": string }; Returns: string
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
"can_edit_meeting":
{ Args: { "p_meeting_id": string }; Returns: boolean
                           },
"can_edit_shoot":
{ Args: { "p_shoot_id": string }; Returns: boolean
                           },
"can_manage_gates":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"can_read_request_file":
{ Args: { "p_name": string }; Returns: boolean
                           },
"can_update_gate":
{ Args: { "p_item_id": string }; Returns: boolean
                           },
"can_view_board":
{ Args: { "p_board_id": string }; Returns: boolean
                           },
"can_view_card":
{ Args: { "p_card_id": string }; Returns: boolean
                           },
"can_view_meeting":
{ Args: { "p_meeting_id": string }; Returns: boolean
                           },
"can_view_post":
{ Args: { "p_post_id": string }; Returns: boolean
                           },
"can_view_request":
{ Args: { "p_request_id": string }; Returns: boolean
                           },
"can_view_shoot":
{ Args: { "p_shoot_id": string }; Returns: boolean
                           },
"cancel_meeting":
{ Args: { "p_id": string }; Returns: undefined
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
{ Args: { "p_accuracy_m"?: number,"p_branch_id"?: string,"p_card_id"?: string,"p_lat"?: number,"p_lng"?: number,"p_method": Database["public"]['Enums']["checkin_method"],"p_note"?: string,"p_now"?: string,"p_place"?: string,"p_shoot_id"?: string,"p_user_id": string,"p_verify"?: Json }; Returns: string
                           },
"check_out":
{ Args: { "p_accuracy_m": number,"p_lat": number,"p_lng": number }; Returns: undefined
                           },
"claim_once":
{ Args: { "p_key": string }; Returns: boolean
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
"cron_celebrations":
{ Args: { "p_now"?: string }; Returns: number
                           },
"cron_daily":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"cron_due_soon":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"cron_gates":
{ Args: { "p_now"?: string }; Returns: number
                           },
"cron_meetings":
{ Args: { "p_now"?: string }; Returns: number
                           },
"cron_post_reminders":
{ Args: { "p_now"?: string }; Returns: number
                           },
"cron_shoots":
{ Args: { "p_now"?: string }; Returns: number
                           },
"cron_strategic_reminders":
{ Args: { "p_now"?: string }; Returns: number
                           },
"cron_workflow_daily":
{ Args: { "p_now"?: string }; Returns: Json
                           },
"decide_post":
{ Args: { "p_approve": boolean,"p_comment"?: string,"p_post_id": string }; Returns: undefined
                           },
"decide_step":
{ Args: { "p_comment"?: string,"p_decision": Database["public"]['Enums']["step_status"],"p_reason"?: Database["public"]['Enums']["revision_reason"],"p_step_id": string }; Returns: undefined
                           },
"delete_gate_item":
{ Args: { "p_id": string }; Returns: undefined
                           },
"delete_gate_template":
{ Args: { "p_id": string }; Returns: undefined
                           },
"ensure_gate_month":
{ Args: { "p_month": string }; Returns: number
                           },
"has_any_role":
{ Args: { "rs": (Database["public"]['Enums']["app_role"])[] }; Returns: boolean
                           },
"has_role":
{ Args: { "r": Database["public"]['Enums']["app_role"] }; Returns: boolean
                           },
"in_meeting":
{ Args: { "p_meeting_id": string }; Returns: boolean
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
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_team_app_user":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_team_lead_of":
{ Args: { "target": string }; Returns: boolean
                           },
"map_interact":
{ Args: { "p_kind": string,"p_to": string }; Returns: undefined
                           },
"map_move":
{ Args: { "p_branch_id": string,"p_x": number,"p_y": number }; Returns: boolean
                           },
"mark_post_published":
{ Args: { "p_links"?: Json,"p_post_id": string }; Returns: undefined
                           },
"meeting_action_to_card":
{ Args: { "p_action_id": string,"p_board_id"?: string }; Returns: string
                           },
"meeting_busy":
{ Args: { "p_from": string,"p_to": string,"p_user_ids"?: (string)[] }; Returns: {
              "ends_at": string,"id": string,"kind": string,"starts_at": string
            }[]
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
"on_shoot_crew":
{ Args: { "p_shoot_id": string }; Returns: boolean
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
"respond_meeting":
{ Args: { "p_id": string,"p_response": Database["public"]['Enums']["attendee_response"] }; Returns: undefined
                           },
"resubmit_request":
{ Args: { "p_card_id": string,"payload": Json }; Returns: undefined
                           },
"save_gate_item":
{ Args: { "p": Json,"p_id": string }; Returns: string
                           },
"save_gate_template":
{ Args: { "p": Json,"p_id": string }; Returns: string
                           },
"save_meeting":
{ Args: { "p": Json,"p_id": string }; Returns: string
                           },
"save_meeting_notes":
{ Args: { "p_id": string,"p_notes": string }; Returns: undefined
                           },
"save_meeting_series":
{ Args: { "p": Json,"p_id": string }; Returns: string
                           },
"set_card_reviewers":
{ Args: { "p_approver": string,"p_card_id": string,"p_reviewer": string }; Returns: undefined
                           },
"set_gate_status":
{ Args: { "p_id": string,"p_note"?: string,"p_status": Database["public"]['Enums']["gate_status"] }; Returns: undefined
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
"team_week":
{ Args: { "p_department_id"?: string,"p_from": string,"p_to": string }; Returns: {
              "branch_id": string,"day": string,"department_id": string,"display_name": string,"kind": string,"place": string,"source": string,"team_id": string,"title": string,"user_id": string
            }[]
                           },
"try_uuid":
{ Args: { "t": string }; Returns: string
                           },
"upcoming_celebrations":
{ Args: { "p_days"?: number,"p_from"?: string }; Returns: {
              "day": string,"display_name": string,"kind": string,"user_id": string,"years": number
            }[]
                           },
"who_is_in":
{ Args: { "p_branch_id"?: string }; Returns: {
              "branch_id": string,"checked_in_at": string,"checkin_place": string,"field_card_id": string,"method": Database["public"]['Enums']["checkin_method"],"note": string,"user_id": string
            }[]
                           },
"workflow_assign_default_owners":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"working_days":
{ Args: { "p_from": string,"p_to": string }; Returns: number
                           }
          }
          Enums: {
            "app_role": "super_admin"|"leadership"|"team_lead"|"traffic_manager"|"member"|"requester"|"final_approver"|"hr"|"guest","assignee_role": "design"|"copy"|"video"|"media_buying"|"other","attendee_response": "pending"|"accepted"|"declined"|"tentative","card_priority": "low"|"normal"|"high"|"urgent","card_request_kind": "strategic"|"urgent"|"internal","card_stage": "request"|"performance_input"|"intake"|"brief_schedule"|"production"|"creative_review"|"confirmation"|"ready_to_publish"|"published"|"reported","checkin_method": "gps"|"wifi"|"qr"|"field"|"home"|"manual","content_pillar": "awareness"|"engagement"|"insights"|"offer"|"community","gate_kind": "phase"|"gate"|"checkpoint"|"recurring","gate_status": "not_started"|"in_progress"|"done"|"at_risk"|"missed"|"skipped","meeting_cadence": "daily"|"weekly"|"monthly","meeting_status": "scheduled"|"done"|"cancelled","post_status": "draft"|"in_review"|"approved"|"scheduled"|"published","presence_status": "available"|"focus"|"meeting"|"shoot"|"break"|"away","profile_status": "active"|"inactive","request_status": "pending"|"approved"|"rejected"|"cancelled","revision_reason": "brief_changed"|"quality"|"new_information"|"other","shoot_status": "planned"|"confirmed"|"wrapped"|"cancelled","step_status": "waiting"|"active"|"approved"|"rejected"|"changes_requested"|"skipped","week_plan_kind": "branch"|"field"|"home"|"away"
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
            "app_role": ["super_admin", "leadership", "team_lead", "traffic_manager", "member", "requester", "final_approver", "hr", "guest"],"assignee_role": ["design", "copy", "video", "media_buying", "other"],"attendee_response": ["pending", "accepted", "declined", "tentative"],"card_priority": ["low", "normal", "high", "urgent"],"card_request_kind": ["strategic", "urgent", "internal"],"card_stage": ["request", "performance_input", "intake", "brief_schedule", "production", "creative_review", "confirmation", "ready_to_publish", "published", "reported"],"checkin_method": ["gps", "wifi", "qr", "field", "home", "manual"],"content_pillar": ["awareness", "engagement", "insights", "offer", "community"],"gate_kind": ["phase", "gate", "checkpoint", "recurring"],"gate_status": ["not_started", "in_progress", "done", "at_risk", "missed", "skipped"],"meeting_cadence": ["daily", "weekly", "monthly"],"meeting_status": ["scheduled", "done", "cancelled"],"post_status": ["draft", "in_review", "approved", "scheduled", "published"],"presence_status": ["available", "focus", "meeting", "shoot", "break", "away"],"profile_status": ["active", "inactive"],"request_status": ["pending", "approved", "rejected", "cancelled"],"revision_reason": ["brief_changed", "quality", "new_information", "other"],"shoot_status": ["planned", "confirmed", "wrapped", "cancelled"],"step_status": ["waiting", "active", "approved", "rejected", "changes_requested", "skipped"],"week_plan_kind": ["branch", "field", "home", "away"]
          }
        }
} as const
