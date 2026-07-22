"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CommonAnswers, ParsedTranscript, StudentProfileFull, SpecialStatus, RegionAffinity } from "@/types/onboarding";

type OnboardingState = {
  transcript: ParsedTranscript | null;
  commonAnswers: Partial<CommonAnswers> | null;
  specialStatus: SpecialStatus[];
  regionAffinity: RegionAffinity | null;
  careerInterests: string[];
  conditionalAnswers: Record<string, boolean>;
  studentProfile: StudentProfileFull | null;
  setTranscript: (transcript: ParsedTranscript) => void;
  setCommonAnswers: (answers: Partial<CommonAnswers>) => void;
  setSpecialStatus: (values: SpecialStatus[]) => void;
  setRegionAffinity: (value: RegionAffinity) => void;
  setCareerInterests: (values: string[]) => void;
  setConditionalAnswers: (values: Record<string, boolean>) => void;
  setStudentProfile: (profile: StudentProfileFull) => void;
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      transcript: null,
      commonAnswers: null,
      specialStatus: ["해당없음"],
      regionAffinity: null,
      careerInterests: [],
      conditionalAnswers: {},
      studentProfile: null,
      setTranscript: (transcript) => set({ transcript }),
      setCommonAnswers: (commonAnswers) => set({ commonAnswers }),
      setSpecialStatus: (specialStatus) => set({ specialStatus }),
      setRegionAffinity: (regionAffinity) => set({ regionAffinity }),
      setCareerInterests: (careerInterests) => set({ careerInterests }),
      setConditionalAnswers: (conditionalAnswers) => set({ conditionalAnswers }),
      setStudentProfile: (studentProfile) => set({ studentProfile }),
    }),
    {
      name: "skkolarship-onboarding",
    },
  ),
);

