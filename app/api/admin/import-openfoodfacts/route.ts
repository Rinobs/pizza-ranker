import { NextResponse } from "next/server";
import {
  runOpenFoodFactsInitialImport,
  type OpenFoodFactsImportProgressEvent,
} from "@/lib/open-food-facts-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let isImportRunning = false;

function formatSseEvent(event: OpenFoodFactsImportProgressEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST() {
  if (isImportRunning) {
    return NextResponse.json(
      {
        success: false,
        error: "Ein Open-Food-Facts-Import läuft bereits.",
      },
      { status: 409 }
    );
  }

  isImportRunning = true;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: OpenFoodFactsImportProgressEvent) => {
        controller.enqueue(encoder.encode(formatSseEvent(event)));
      };

      try {
        await runOpenFoodFactsInitialImport(send);
      } catch (error) {
        const message =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "Der Import wurde unerwartet abgebrochen.";

        send({
          type: "summary",
          percent: 100,
          imported: 0,
          skipped: 0,
          errors: 1,
          categories: [
            {
              tag: "global",
              label: message,
              imported: 0,
              skipped: 0,
              errors: 1,
            },
          ],
        });
      } finally {
        isImportRunning = false;
        controller.close();
      }
    },
    cancel() {
      isImportRunning = false;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
    },
  });
}
