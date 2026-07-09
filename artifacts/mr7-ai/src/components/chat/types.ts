import type { Settings, Chat, ChatMsg, Folder, Snippet, AutoTuneEma, CouncilPayload, GodmodePayload } from "@/lib/store";
import type { ProviderName, SubscriptionTier } from "@/lib/store";

export type AppState = {
  chats: Chat[];
  activeChatId: string | null;
  activeModel: string;
  activePersona: string | null;
  activeProvider: ProviderName;
  activeProviderModel: string;
  settings: Settings;
  memory: string[];
  customInstructions: string;
  snippets: Snippet[];
  subscription: { tier: SubscriptionTier };
  autoTuneEma?: AutoTuneEma;
};

export type AppAction =
  | { type: "ADD_MSG"; chatId: string; msg: ChatMsg }
  | { type: "PATCH_MSG"; chatId: string; msgId: string; patch: Partial<ChatMsg> }
  | { type: "EDIT_MSG"; chatId: string; msgId: string; content: string }
  | { type: "POP_MSG"; chatId: string }
  | { type: "DELETE_MSG"; chatId: string; msgId: string }
  | { type: "CLEAR_CHAT"; id: string }
  | { type: "RENAME_CHAT"; id: string; title: string }
  | { type: "BRANCH_CHAT"; chatId: string; upToMsgId: string }
  | { type: "BOOKMARK_MSG"; chatId: string; msgId: string }
  | { type: "REACT_MSG"; chatId: string; msgId: string; emoji: string; userId: string }
  | { type: "ADD_MEMORY"; entry: string }
  | { type: "USE_TOKENS"; amount: number }
  | { type: "SET_SETTINGS"; patch: Partial<Settings> }
  | { type: "SET_PERSONA"; persona: string | null }
  | { type: string; [key: string]: unknown };

export type AppDispatch = (action: AppAction) => void;
