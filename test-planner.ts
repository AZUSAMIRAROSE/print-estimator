import { createDefaultEstimation } from "./src/stores/estimationStore";
import { runAutoPlanning, applyAutoPlanToInput } from "./src/domain/estimation/autoPlanner";

const estimation = createDefaultEstimation();
estimation.bookSpec.heightMM = 200;
estimation.bookSpec.widthMM = 130;
estimation.textSections[0].pages = 100;

console.log("Running auto-planning...");
try {
    const result = runAutoPlanning(estimation);

    if (result.sections[0]) {
        console.log("Diagnostics for Section 1:");
        console.log(JSON.stringify(result.sections[0].diagnostics, null, 2));

        // Log the first few rejected candidates in more detail if any
        if (result.sections[0].allCandidates && result.sections[0].allCandidates.length > 0) {
            console.log("\nFirst 3 candidates:");
            console.log(JSON.stringify(result.sections[0].allCandidates.slice(0, 3), null, 2));
        }
    }

} catch (e) {
    console.error("Error:", e);
}
