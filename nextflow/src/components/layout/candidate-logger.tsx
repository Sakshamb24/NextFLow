"use client";

import { useEffect } from "react";
import { candidateLinkedIn } from "@/lib/sample-workflow";

export function CandidateLogger() {
  useEffect(() => {
    console.log(`[NextFlow) Candidate LinkedIn: ${candidateLinkedIn}`);
  }, []);

  return null;
}
