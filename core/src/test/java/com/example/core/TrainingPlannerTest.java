package com.example.core;

import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;

public class TrainingPlannerTest {
    @Test
    void notAllowedWithin2Days() {
        var res = TrainingPlanner.nextMinimumTargetWithRest(
                LocalDate.of(2025,10,26),
                LocalDate.of(2025,10,25),
                62.5, 6,
                0.5, 0.005,
                3, 12,
                0.10
        );
        assertEquals(TrainingPlanner.Status.NOT_ALLOWED, res.status);
        assertNotNull(res.earliest);
        assertNotNull(res.alt);
    }

    @Test
    void allowedAfter2Days() {
        var res = TrainingPlanner.nextMinimumTargetWithRest(
                LocalDate.of(2025,10,28),
                LocalDate.of(2025,10,25),
                62.5, 6,
                0.5, 0.005,
                3, 12,
                0.10
        );
        assertEquals(TrainingPlanner.Status.ALLOWED, res.status);
        assertNotNull(res.target);
        assertTrue(res.target.e1rm >= TrainingPlanner.e1rmEpley(62.5,6)*1.005);
    }
}
