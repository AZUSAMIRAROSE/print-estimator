import { useAppStore } from "@/stores/appStore";
import { saveTextFilePortable } from "@/utils/fileSave";

// ── Export helper ─────────────────────────────────────────────────────────────
export async function exportTabCSV(filename: string, headers: string[], rows: string[][], customSuccessMessage?: string) {
    try {
        const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
        const filePath = await saveTextFilePortable(
            {
                filters: [{ name: "CSV File", extensions: ["csv"] }],
                defaultPath: filename,
            },
            csv
        );

        if (!filePath) return;
        const { addNotification } = useAppStore.getState();
        addNotification({
            type: "success",
            title: "Exported Successfully",
            message: customSuccessMessage || `Saved to ${filePath}`,
            category: "export"
        });
    } catch (error: any) {
        const { addNotification } = useAppStore.getState();
        addNotification({
            type: "error",
            title: "Export Failed",
            message: error.message || "Failed to export CSV.",
            category: "system"
        });
    }
}
