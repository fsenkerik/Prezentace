export type AssignmentStatus = "draft" | "open" | "closed";

export type BoardInfo = {
  ok: true;
  title: string;
  description: string | null;
  class_name: string;
  status: AssignmentStatus;
  opens_at: string | null;
  closes_at: string | null;
  topic_count: number;
  taken_count: number;
};

export type BoardTopic = {
  id: string;
  title: string;
  description: string | null;
  taken: boolean;
  taken_at: string | null;
  taken_by: string | null;
};

export type Board = {
  ok: true;
  assignment_id: string;
  title: string;
  description: string | null;
  class_name: string;
  status: AssignmentStatus;
  opens_at: string | null;
  closes_at: string | null;
  show_names: boolean;
  my_selection: {
    topic_id: string;
    student_name: string;
    created_at: string;
  } | null;
  topics: BoardTopic[];
};

export type RpcError = { ok: false; error: string };

/** Chybové kódy z claim_topic() a get_board(). Text uvidí žák uprostřed
 *  hodiny, takže musí být srozumitelný a říct, co dělat dál. */
export const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: "Tento výběr neexistuje nebo ještě nebyl spuštěn.",
  BAD_CODE: "Přístupový kód nesedí. Zkontroluj ho a zkus to znovu.",
  BAD_NAME: "Zadej prosím celé jméno.",
  NOT_OPEN: "Výběr zatím není otevřený.",
  NOT_YET: "Výběr se ještě neotevřel. Vydrž chvilku.",
  CLOSED: "Výběr je už uzavřený.",
  TOPIC_TAKEN: "Tohle téma si právě vzal někdo jiný. Vyber si prosím jiné.",
  ALREADY_PICKED: "Pod tímto jménem už si někdo téma vybral.",
  DEVICE_USED: "Z tohoto zařízení už jeden výběr proběhl.",
  RATE_LIMITED: "Příliš mnoho pokusů. Zkus to za pár minut.",
  CONFLICT: "Výběr se nepodařilo uložit. Zkus to prosím znovu.",
};

export function errorText(code: string | undefined): string {
  return (code && ERROR_MESSAGES[code]) || ERROR_MESSAGES.CONFLICT;
}
