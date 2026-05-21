// lib/intents/dispatch.ts
// Routes an Intent + HandlerContext to the right handler. Single switch keeps
// adding a new intent simple: write a handler + register it here + add to
// the enum in lib/intents/types.ts.

import { handleGeneralChat } from "./handlers/generalChat";
import { handleLocationInfo } from "./handlers/locationInfo";
import { handleWeather } from "./handlers/weather";
import { handleSurpriseMe } from "./handlers/surpriseMe";
import { handleViewItineraries } from "./handlers/viewItineraries";
import { handleQuickPlan } from "./handlers/quickPlan";
import { handleModifyItinerary } from "./handlers/modifyItinerary";
import type { HandlerContext, HandlerEvent, Intent, IntentHandler } from "./types";

const REGISTRY: Record<Intent, IntentHandler> = {
  location_info:    handleLocationInfo,
  weather:          handleWeather,
  surprise_me:      handleSurpriseMe,
  view_itineraries: handleViewItineraries,
  quick_plan:       handleQuickPlan,
  modify_itinerary: handleModifyItinerary,
  general_chat:     handleGeneralChat,
};

export async function* dispatchIntent(
  ctx: HandlerContext
): AsyncGenerator<HandlerEvent> {
  const handler = REGISTRY[ctx.classification.intent] ?? handleGeneralChat;
  try {
    yield* handler(ctx);
  } catch (err) {
    yield {
      type: "error",
      message: `Handler failed: ${(err as Error).message}`,
    };
  }
}
