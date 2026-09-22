package com.asabeafit.app.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseRoute
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.units.Energy
import androidx.health.connect.client.units.Length
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.ZoneOffset

/**
 * Health Connect integration for ASABEA FIT.
 *
 * Supports writing verified workout records to Android Health Connect:
 * - ExerciseSessionRecord (Walking, Jogging, Running)
 * - DistanceRecord (exact meters tracked via GPS)
 * - StepsRecord (device sensor steps)
 * - TotalCaloriesBurnedRecord (verified caloric expenditure)
 * - ExerciseRoute (recorded GPS waypoints)
 *
 * Adheres strictly to Android Health Connect standards. Does not fabricate data.
 */
class HealthConnectManager(private val context: Context) {

    private val healthConnectClient by lazy {
        HealthConnectClient.getOrCreate(context)
    }

    val permissions = setOf(
        HealthPermission.getWritePermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getWritePermission(DistanceRecord::class),
        HealthPermission.getWritePermission(StepsRecord::class),
        HealthPermission.getWritePermission(TotalCaloriesBurnedRecord::class)
    )

    fun isAvailable(): Boolean {
        return HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE
    }

    suspend fun hasAllPermissions(): Boolean {
        if (!isAvailable()) return false
        val granted = healthConnectClient.permissionController.getGrantedPermissions()
        return granted.containsAll(permissions)
    }

    /**
     * Inserts completed workout record with route and distance into Health Connect.
     */
    suspend fun writeWorkoutRecord(
        workoutType: String,
        startTime: Instant,
        endTime: Instant,
        distanceMeters: Double,
        caloriesKcal: Double,
        stepsCount: Long?,
        routePointsJson: String?
    ): Result<String> = withContext(Dispatchers.IO) {
        try {
            if (!isAvailable()) {
                return@withContext Result.failure(IllegalStateException("Health Connect is not available on this device"))
            }

            val exerciseType = when (workoutType.uppercase()) {
                "RUN" -> ExerciseSessionRecord.EXERCISE_TYPE_RUNNING
                "JOG" -> ExerciseSessionRecord.EXERCISE_TYPE_RUNNING
                "WALK" -> ExerciseSessionRecord.EXERCISE_TYPE_WALKING
                else -> ExerciseSessionRecord.EXERCISE_TYPE_OTHER_WORKOUT
            }

            // Build route if GPS points exist
            var exerciseRoute: ExerciseRoute? = null
            if (!routePointsJson.isNullOrBlank()) {
                val routeLocations = mutableListOf<ExerciseRoute.Location>()
                try {
                    val array = JSONArray(routePointsJson)
                    for (i in 0 until array.length()) {
                        val obj = array.getJSONObject(i)
                        val lat = obj.getDouble("lat")
                        val lng = obj.getDouble("lng")
                        val timeMs = obj.getLong("timestamp")
                        routeLocations.add(
                            ExerciseRoute.Location(
                                time = Instant.ofEpochMilli(timeMs),
                                latitude = lat,
                                longitude = lng
                            )
                        )
                    }
                    if (routeLocations.isNotEmpty()) {
                        exerciseRoute = ExerciseRoute(routeLocations)
                    }
                } catch (e: Exception) {
                    // Ignore malformed route gracefully
                }
            }

            // 1. Exercise Session Record
            val sessionRecord = ExerciseSessionRecord(
                startTime = startTime,
                startZoneOffset = ZoneOffset.UTC,
                endTime = endTime,
                endZoneOffset = ZoneOffset.UTC,
                exerciseType = exerciseType,
                title = "ASABEA FIT: $workoutType",
                notes = "Tracked with ASABEA FIT continuous tracking",
                exerciseRoute = exerciseRoute,
                metadata = Metadata.manualEntry()
            )

            // 2. Distance Record
            val distanceRecord = DistanceRecord(
                startTime = startTime,
                startZoneOffset = ZoneOffset.UTC,
                endTime = endTime,
                endZoneOffset = ZoneOffset.UTC,
                distance = Length.meters(distanceMeters),
                metadata = Metadata.manualEntry()
            )

            // 3. Calories Record
            val caloriesRecord = TotalCaloriesBurnedRecord(
                startTime = startTime,
                startZoneOffset = ZoneOffset.UTC,
                endTime = endTime,
                endZoneOffset = ZoneOffset.UTC,
                energy = Energy.kilocalories(caloriesKcal),
                metadata = Metadata.manualEntry()
            )

            val recordsToWrite = mutableListOf(sessionRecord, distanceRecord, caloriesRecord)

            // 4. Optional Steps Record (only if real steps recorded)
            if (stepsCount != null && stepsCount > 0) {
                val stepsRecord = StepsRecord(
                    startTime = startTime,
                    startZoneOffset = ZoneOffset.UTC,
                    endTime = endTime,
                    endZoneOffset = ZoneOffset.UTC,
                    count = stepsCount,
                    metadata = Metadata.manualEntry()
                )
                recordsToWrite.add(stepsRecord)
            }

            healthConnectClient.insertRecords(recordsToWrite)
            Result.success("Workout synced to Health Connect successfully")
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
