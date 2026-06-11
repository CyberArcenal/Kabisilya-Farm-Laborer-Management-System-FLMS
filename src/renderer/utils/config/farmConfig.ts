// src/utils/farmConfig.ts
// ============================================================================
// Custom hooks for farm management settings (session, bukid, pitak, assignment,
// payment, debt, audit). All hooks rely on the SettingsContext.
// ============================================================================

import type { FarmAssignmentSettings, FarmAuditSettings, FarmBukidSettings, FarmDebtSettings, FarmPaymentSettings, FarmPitakSettings, FarmSessionSettings } from "../../api/utils/system_config";
import { useSettings } from "../../contexts/SettingsContext";



// ============================================================================
// Farm Session Hooks
// ============================================================================

export const useDefaultSessionId = (): number | undefined => {
  const { getSetting } = useSettings();
  return getSetting<number | undefined>("farm_session", "default_session_id", undefined);
};

export const useSeasonType = (): "tag-ulan" | "tag-araw" | "custom" | undefined => {
  const { getSetting } = useSettings();
  return getSetting<"tag-ulan" | "tag-araw" | "custom" | undefined>(
    "farm_session",
    "season_type",
    undefined
  );
};

export const useFarmSessionYear = (): number | undefined => {
  const { getSetting } = useSettings();
  return getSetting<number | undefined>("farm_session", "year", undefined);
};

export const useSessionStartDate = (): string | undefined => {
  const { getSetting } = useSettings();
  return getSetting<string | undefined>("farm_session", "start_date", undefined);
};

export const useSessionEndDate = (): string | undefined => {
  const { getSetting } = useSettings();
  return getSetting<string | undefined>("farm_session", "end_date", undefined);
};

export const useSessionStatus = (): "active" | "closed" | "archived" | undefined => {
  const { getSetting } = useSettings();
  return getSetting<"active" | "closed" | "archived" | undefined>(
    "farm_session",
    "status",
    undefined
  );
};

export const useSessionNotes = (): string | undefined => {
  const { getSetting } = useSettings();
  return getSetting<string | undefined>("farm_session", "notes", undefined);
};

export const useRequireDefaultSession = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("farm_session", "require_default_session", false);
};

/**
 * Hook that returns the entire farm session settings object.
 */
export const useFarmSessionSettings = (): Partial<FarmSessionSettings> => {
  const { getSetting } = useSettings();
  return {
    default_session_id: getSetting<number | undefined>("farm_session", "default_session_id", undefined),
    season_type: getSetting<"tag-ulan" | "tag-araw" | "custom" | undefined>("farm_session", "season_type", undefined),
    year: getSetting<number | undefined>("farm_session", "year", undefined),
    start_date: getSetting<string | undefined>("farm_session", "start_date", undefined),
    end_date: getSetting<string | undefined>("farm_session", "end_date", undefined),
    status: getSetting<"active" | "closed" | "archived" | undefined>("farm_session", "status", undefined),
    notes: getSetting<string | undefined>("farm_session", "notes", undefined),
    require_default_session: getSetting<boolean>("farm_session", "require_default_session", false),
  };
};

// ============================================================================
// Farm Bukid Hooks
// ============================================================================

export const useBukidNameFormat = (): string | undefined => {
  const { getSetting } = useSettings();
  return getSetting<string | undefined>("farm_bukid", "name_format", undefined);
};

export const useEnableLocationDescriptor = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("farm_bukid", "enable_location_descriptor", false);
};

export const useDefaultBukidStatus = (): "active" | "inactive" => {
  const { getSetting } = useSettings();
  return getSetting<"active" | "inactive">("farm_bukid", "default_status", "active");
};

export const useLocationRequired = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("farm_bukid", "location_required", false);
};

export const useMaxBukidPerSession = (): number => {
  const { getSetting } = useSettings();
  return getSetting<number>("farm_bukid", "max_bukid_per_session", 0); // 0 means no limit
};

/**
 * Hook that returns the entire farm bukid settings object.
 */
export const useFarmBukidSettings = (): Partial<FarmBukidSettings> => {
  const { getSetting } = useSettings();
  return {
    name_format: getSetting<string | undefined>("farm_bukid", "name_format", undefined),
    enable_location_descriptor: getSetting<boolean>("farm_bukid", "enable_location_descriptor", false),
    default_status: getSetting<"active" | "inactive">("farm_bukid", "default_status", "active"),
    location_required: getSetting<boolean>("farm_bukid", "location_required", false),
    max_bukid_per_session: getSetting<number>("farm_bukid", "max_bukid_per_session", 0),
  };
};

// ============================================================================
// Farm Pitak Hooks
// ============================================================================

export const usePitakRequireLocation = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("farm_pitak", "require_location", false);
};

/**
 * Hook that returns the entire farm pitak settings object.
 */
export const useFarmPitakSettings = (): Partial<FarmPitakSettings> => {
  const { getSetting } = useSettings();
  return {
    require_location: getSetting<boolean>("farm_pitak", "require_location", false),
  };
};

// ============================================================================
// Farm Assignment Hooks
// ============================================================================

export const useDefaultLuwangPerWorker = (): number => {
  const { getSetting } = useSettings();
  return getSetting<number>("farm_assignment", "default_luwang_per_worker", 5);
};

export const useDateBehavior = (): "system_date" | "manual_entry" => {
  const { getSetting } = useSettings();
  return getSetting<"system_date" | "manual_entry">(
    "farm_assignment",
    "date_behavior",
    "system_date"
  );
};

export const useAssignmentStatusOptions = (): ("active" | "completed" | "cancelled")[] => {
  const { getSetting } = useSettings();
  return getSetting<("active" | "completed" | "cancelled")[]>(
    "farm_assignment",
    "status_options",
    ["active", "completed", "cancelled"]
  );
};

export const useEnableNotesRemarks = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("farm_assignment", "enable_notes_remarks", true);
};

/**
 * Hook that returns the entire farm assignment settings object.
 */
export const useFarmAssignmentSettings = (): Partial<FarmAssignmentSettings> => {
  const { getSetting } = useSettings();
  return {
    default_luwang_per_worker: getSetting<number>("farm_assignment", "default_luwang_per_worker", 5),
    date_behavior: getSetting<"system_date" | "manual_entry">(
      "farm_assignment",
      "date_behavior",
      "system_date"
    ),
    status_options: getSetting<("active" | "completed" | "cancelled")[]>(
      "farm_assignment",
      "status_options",
      ["active", "completed", "cancelled"]
    ),
    enable_notes_remarks: getSetting<boolean>("farm_assignment", "enable_notes_remarks", true),
  };
};

// ============================================================================
// Farm Payment Hooks
// ============================================================================

export const useRatePerLuwang = (): number => {
  const { getSetting } = useSettings();
  return getSetting<number>("farm_payment", "rate_per_luwang", 230);
};

/**
 * Hook that returns the entire farm payment settings object.
 */
export const useFarmPaymentSettings = (): Partial<FarmPaymentSettings> => {
  const { getSetting } = useSettings();
  return {
    rate_per_luwang: getSetting<number>("farm_payment", "rate_per_luwang", 230),
  };
};

// ============================================================================
// Farm Debt Hooks
// ============================================================================

export const useDebtAllocationStrategy = (): "auto" | "equal" | "proportional" => {
  const { getSetting } = useSettings();
  return getSetting<"auto" | "equal" | "proportional">(
    "farm_debt",
    "debt_allocation_strategy",
    "auto"
  );
};

export const useDefaultInterestRate = (): number => {
  const { getSetting } = useSettings();
  return getSetting<number>("farm_debt", "default_interest_rate", 0);
};

export const usePaymentTermDays = (): number => {
  const { getSetting } = useSettings();
  return getSetting<number>("farm_debt", "payment_term_days", 30);
};

export const useGracePeriodDays = (): number => {
  const { getSetting } = useSettings();
  return getSetting<number>("farm_debt", "grace_period_days", 0);
};

export const useDebtLimit = (): number => {
  const { getSetting } = useSettings();
  return getSetting<number>("farm_debt", "debt_limit", 0); // 0 means no limit
};

export const useRequireDebtReason = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("farm_debt", "require_debt_reason", false);
};

export const useAutoApplyInterest = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("farm_debt", "auto_apply_interest", false);
};

/**
 * Hook that returns the entire farm debt settings object.
 */
export const useFarmDebtSettings = (): Partial<FarmDebtSettings> => {
  const { getSetting } = useSettings();
  return {
    debt_allocation_strategy: getSetting<"auto" | "equal" | "proportional">(
      "farm_debt",
      "debt_allocation_strategy",
      "auto"
    ),
    default_interest_rate: getSetting<number>("farm_debt", "default_interest_rate", 0),
    payment_term_days: getSetting<number>("farm_debt", "payment_term_days", 30),
    grace_period_days: getSetting<number>("farm_debt", "grace_period_days", 0),
    debt_limit: getSetting<number>("farm_debt", "debt_limit", 0),
    require_debt_reason: getSetting<boolean>("farm_debt", "require_debt_reason", false),
    auto_apply_interest: getSetting<boolean>("farm_debt", "auto_apply_interest", false),
  };
};

// ============================================================================
// Farm Audit Hooks
// ============================================================================

export const useLogActionsEnabled = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("farm_audit", "logActionsEnabled", true);
};

export const useAuditRetentionDays = (): number => {
  const { getSetting } = useSettings();
  return getSetting<number>("farm_audit", "auditRetentionDays", 30);
};

export const useEnableRealTimeLogging = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("farm_audit", "enableRealTimeLogging", false);
};

export const useNotifyOnCriticalEvents = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("farm_audit", "notifyOnCriticalEvents", false);
};

/**
 * Hook that returns the entire farm audit settings object.
 */
export const useFarmAuditSettings = (): Partial<FarmAuditSettings> => {
  const { getSetting } = useSettings();
  return {
    logActionsEnabled: getSetting<boolean>("farm_audit", "logActionsEnabled", true),
    auditRetentionDays: getSetting<number>("farm_audit", "auditRetentionDays", 30),
    enableRealTimeLogging: getSetting<boolean>("farm_audit", "enableRealTimeLogging", false),
    notifyOnCriticalEvents: getSetting<boolean>("farm_audit", "notifyOnCriticalEvents", false),
  };
};