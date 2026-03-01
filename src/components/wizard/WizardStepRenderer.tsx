import React from "react";
import { StepBasicInfo } from "./StepBasicInfo";
import { StepBookSpec } from "./StepBookSpec";
import { StepTextSections } from "./StepTextSections";
import { StepCover } from "./StepCover";
import { StepJacket } from "./StepJacket";
import { StepEndleaves } from "./StepEndleaves";
import { StepBinding } from "./StepBinding";
import { StepFinishing } from "./StepFinishing";
import { StepPacking } from "./StepPacking";
import { StepDelivery } from "./StepDelivery";
import { StepPrePress } from "./StepPrePress";
import { StepPricing } from "./StepPricing";
import { StepAdditional } from "./StepAdditional";
import { StepNotes } from "./StepNotes";
import { StepReview } from "./StepReview";

interface Props {
  step: number;
}

export function WizardStepRenderer({ step }: Props) {
  switch (step) {
    case 1: return <StepBasicInfo />;
    case 2: return <StepBookSpec />;
    case 3: return <StepTextSections />;
    case 4: return <StepCover />;
    case 5: return <StepJacket />;
    case 6: return <StepEndleaves />;
    case 7: return <StepBinding />;
    case 8: return <StepFinishing />;
    case 9: return <StepPacking />;
    case 10: return <StepDelivery />;
    case 11: return <StepPrePress />;
    case 12: return <StepPricing />;
    case 13: return <StepAdditional />;
    case 14: return <StepNotes />;
    case 15: return <StepReview />;
    default: return <StepBasicInfo />;
  }
}