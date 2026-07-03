export type RuleEntry = { tag: string; renameFormat: string; matchCount: number };
export type RulesMap = Record<string, RuleEntry>;
export type RowMode = 'default' | 'editing' | 'deleting';
export type CustomRuleEntry = { matchText: string; renameFormat: string };
export type CustomRulesMap = Record<string, CustomRuleEntry>;
export type ConflictData = {
  fingerprint: string;
  customRule: { matchText: string; renameFormat: string };
  learnedRule: { tag: string; renameFormat: string };
} | null;
