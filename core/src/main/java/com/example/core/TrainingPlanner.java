package com.example.core;

import java.time.LocalDate;
import static java.lang.Math.*;

public final class TrainingPlanner {
    public static class Plan {
        public final double weight; public final int reps; public final double e1rm;
        public Plan(double weight, int reps, double e1rm){ this.weight=weight; this.reps=reps; this.e1rm=e1rm; }
        @Override public String toString(){ return String.format("%.1f kg ? %d reps (e1RM=%.2f)", weight, reps, e1rm); }
    }
    public enum Status { ALLOWED, NOT_ALLOWED }
    public static class NextPlan {
        public final Status status; public final LocalDate earliest; public final Plan target; public final Plan alt;
        public NextPlan(Status status, LocalDate earliest, Plan target, Plan alt){
            this.status=status; this.earliest=earliest; this.target=target; this.alt=alt;
        }
    }
    public static double e1rmEpley(double w, int r){ return w * (1.0 + r / 30.0); }
    public static double roundToStep(double x, double step){ return Math.round(x / step) * step; }
    public static LocalDate earliestNextDate(LocalDate lastDate, long minRestDays){ return lastDate.plusDays(minRestDays); }

    public static NextPlan nextMinimumTargetWithRest(
            LocalDate today, LocalDate lastDate,
            double lastW, int lastR,
            double plateStep,
            double minGainRate,
            int minReps, int maxReps,
            double expandRatio
    ){
        LocalDate earliest = earliestNextDate(lastDate, 2);
        double prev = e1rmEpley(lastW, lastR);
        double minReq = prev * (1.0 + minGainRate);

        if (today.isBefore(earliest)) {
            double altW = max(plateStep, roundToStep(lastW * 0.9, plateStep));
            int altR = max(minReps, lastR - 1);
            Plan alt = new Plan(altW, altR, e1rmEpley(altW, altR));
            return new NextPlan(Status.NOT_ALLOWED, earliest, null, alt);
        }

        Plan cand1 = new Plan(lastW, lastR + 1, e1rmEpley(lastW, lastR + 1));
        if (cand1.reps >= minReps && cand1.reps <= maxReps && cand1.e1rm >= minReq) {
            return new NextPlan(Status.ALLOWED, earliest, cand1, null);
        }

        double upW = roundToStep(lastW + plateStep, plateStep);
        Plan cand2 = new Plan(upW, lastR, e1rmEpley(upW, lastR));
        if (cand2.e1rm >= minReq) {
            return new NextPlan(Status.ALLOWED, earliest, cand2, null);
        }

        double wMin = max(plateStep, roundToStep(lastW * (1 - expandRatio), plateStep));
        double wMax = roundToStep(lastW * (1 + expandRatio), plateStep);
        Plan best = null;
        for (double w = wMin; w <= wMax + 1e-9; w += plateStep) {
            for (int r = minReps; r <= maxReps; r++) {
                double e = e1rmEpley(w, r);
                if (e >= minReq) {
                    Plan cand = new Plan(roundToStep(w, plateStep), r, e);
                    if (isBetter(cand, best, lastW, lastR)) best = cand;
                }
            }
        }
        return new NextPlan(Status.ALLOWED, earliest, best != null ? best : cand2, null);
    }

    private static boolean isBetter(Plan b, Plan a, double lastW, int lastR){
        if (a == null) return true;
        double aw = abs(a.weight - lastW), bw = abs(b.weight - lastW);
        if (bw != aw) return bw < aw;
        int ar = abs(a.reps - lastR),  br = abs(b.reps - lastR);
        if (br != ar) return br < ar;
        return b.e1rm < a.e1rm;
    }
}
