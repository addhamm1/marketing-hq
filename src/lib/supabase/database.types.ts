
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "audit_log": {
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
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
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
"is_marketing":
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
"my_access":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"public_profiles":
{ Args: Record<PropertyKey, never>; Returns: {
              "department_id": string,"display_name": string,"id": string,"team_id": string,"title": string
            }[]
                           },
"require_password_change":
{ Args: { "p_user_id": string }; Returns: undefined
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
