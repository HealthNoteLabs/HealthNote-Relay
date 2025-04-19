import SwiftUI
import Charts

struct StatsView: View {
    @State private var runs: [RunData] = []
    @State private var selectedTimeframe: Timeframe = .week
    @State private var totalDistance: Double = 0
    @State private var totalRuns: Int = 0
    @State private var averagePace: Double = 0
    @State private var showingFilterOptions = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Time filter
                timeframeSelector
                
                // Overview Cards
                overviewStatsSection
                
                // Weekly distance chart
                distanceChartSection
                
                // Pace trends chart
                paceChartSection
                
                // Personal bests
                personalBestSection
            }
            .padding()
        }
        .navigationTitle("Statistics")
        .onAppear {
            loadStats()
        }
        .onChange(of: selectedTimeframe) { _ in
            loadStats()
        }
    }
    
    private var timeframeSelector: some View {
        Picker("Timeframe", selection: $selectedTimeframe) {
            Text("Week").tag(Timeframe.week)
            Text("Month").tag(Timeframe.month)
            Text("Year").tag(Timeframe.year)
            Text("All").tag(Timeframe.all)
        }
        .pickerStyle(SegmentedPickerStyle())
        .padding(.horizontal)
    }
    
    private var overviewStatsSection: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
            StatCard(
                title: "Total Distance",
                value: formattedDistance(totalDistance),
                icon: "figure.walk",
                color: .blue
            )
            
            StatCard(
                title: "Total Runs",
                value: "\(totalRuns)",
                icon: "timer",
                color: .orange
            )
            
            StatCard(
                title: "Average Pace",
                value: formattedPace(averagePace),
                icon: "speedometer",
                color: .green
            )
            
            StatCard(
                title: "Elevation Gain",
                value: formattedElevation(runs.reduce(0) { $0 + $1.elevationGain }),
                icon: "mountain.2",
                color: .purple
            )
        }
    }
    
    @ViewBuilder
    private var distanceChartSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Distance Over Time")
                .font(.headline)
            
            if #available(iOS 16.0, *) {
                Chart {
                    ForEach(weeklyDistances(), id: \.date) { weekData in
                        BarMark(
                            x: .value("Date", weekData.date, unit: .day),
                            y: .value("Distance", weekData.distance)
                        )
                        .foregroundStyle(Color.blue.gradient)
                    }
                }
                .frame(height: 200)
                .chartYScale(domain: 0...(maxWeeklyDistance() * 1.1))
                .chartXAxis {
                    AxisMarks(values: .stride(by: .day)) { _ in
                        AxisGridLine()
                        AxisTick()
                        AxisValueLabel(format: .dateTime.weekday(.abbreviated))
                    }
                }
            } else {
                Text("Charts require iOS 16 or higher")
                    .foregroundColor(.secondary)
                    .frame(height: 200)
                    .frame(maxWidth: .infinity)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
    
    @ViewBuilder
    private var paceChartSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Pace Trend")
                .font(.headline)
            
            if #available(iOS 16.0, *) {
                Chart {
                    ForEach(paceData(), id: \.date) { paceData in
                        LineMark(
                            x: .value("Date", paceData.date),
                            y: .value("Pace", paceData.pace)
                        )
                        .foregroundStyle(Color.green.gradient)
                        .interpolationMethod(.catmullRom)
                    }
                }
                .frame(height: 200)
                .chartYScale(domain: 0...(maxPace() * 1.1))
                .chartXAxis {
                    AxisMarks(values: .stride(by: .day)) { _ in
                        AxisGridLine()
                        AxisTick()
                        AxisValueLabel(format: .dateTime.day())
                    }
                }
            } else {
                Text("Charts require iOS 16 or higher")
                    .foregroundColor(.secondary)
                    .frame(height: 200)
                    .frame(maxWidth: .infinity)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
    
    private var personalBestSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Personal Records")
                .font(.headline)
            
            VStack(spacing: 16) {
                PersonalBestRow(distance: "5K", time: bestTimeFor(distance: 5000))
                PersonalBestRow(distance: "10K", time: bestTimeFor(distance: 10000))
                PersonalBestRow(distance: "Half Marathon", time: bestTimeFor(distance: 21097))
                PersonalBestRow(distance: "Marathon", time: bestTimeFor(distance: 42195))
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
    
    // MARK: - Helper Methods
    
    private func loadStats() {
        let (startDate, endDate) = dateRangeFor(timeframe: selectedTimeframe)
        runs = PersistenceController.shared.fetchRunsInDateRange(from: startDate, to: endDate)
        
        // Calculate totals
        totalDistance = runs.reduce(0) { $0 + $1.distance }
        totalRuns = runs.count
        
        // Calculate average pace (weighted by distance)
        let totalDistanceForPace = runs.filter { $0.distance > 0 }.reduce(0) { $0 + $1.distance }
        let weightedPaceSum = runs.filter { $0.distance > 0 }.reduce(0) { $0 + ($1.pace * $1.distance) }
        averagePace = totalDistanceForPace > 0 ? weightedPaceSum / totalDistanceForPace : 0
    }
    
    private func dateRangeFor(timeframe: Timeframe) -> (Date, Date) {
        let endDate = Date()
        let calendar = Calendar.current
        
        let startDate: Date
        
        switch timeframe {
        case .week:
            startDate = calendar.date(byAdding: .day, value: -7, to: endDate)!
        case .month:
            startDate = calendar.date(byAdding: .month, value: -1, to: endDate)!
        case .year:
            startDate = calendar.date(byAdding: .year, value: -1, to: endDate)!
        case .all:
            startDate = calendar.date(byAdding: .year, value: -10, to: endDate)! // Arbitrarily far back
        }
        
        return (startDate, endDate)
    }
    
    private func weeklyDistances() -> [WeeklyDistance] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        
        var result: [WeeklyDistance] = []
        
        // Create a day for each of the last 7 days
        for dayOffset in (0..<7).reversed() {
            guard let date = calendar.date(byAdding: .day, value: -dayOffset, to: today) else {
                continue
            }
            
            // Get the distance for this day
            let dayDistance = runs.filter { run in
                guard let runDate = calendar.startOfDay(for: run.date) else { return false }
                return calendar.isDate(runDate, inSameDayAs: date)
            }.reduce(0) { $0 + $1.distance }
            
            result.append(WeeklyDistance(date: date, distance: dayDistance / 1000)) // Convert to km for chart
        }
        
        return result
    }
    
    private func maxWeeklyDistance() -> Double {
        let maxDistance = weeklyDistances().map { $0.distance }.max() ?? 0
        return maxDistance > 0 ? maxDistance : 10 // Default to 10 km if no data
    }
    
    private func paceData() -> [PaceData] {
        return runs.sorted { $0.date < $1.date }.map { run in
            let paceMinPerKm = (run.pace * 1000) / 60 // Convert to min/km
            return PaceData(date: run.date, pace: paceMinPerKm)
        }
    }
    
    private func maxPace() -> Double {
        let maxPace = paceData().map { $0.pace }.max() ?? 0
        return maxPace > 0 ? maxPace : 10 // Default to 10 min/km if no data
    }
    
    private func bestTimeFor(distance: Double) -> String {
        // Find the run closest to the target distance
        let targetRuns = runs.filter { abs($0.distance - distance) < distance * 0.05 } // Within 5% of target
        
        if let bestRun = targetRuns.min(by: { $0.duration < $1.duration }) {
            return bestRun.formattedDuration
        }
        
        return "--:--"
    }
    
    // MARK: - Formatting Helpers
    
    private func formattedDistance(_ distance: Double) -> String {
        let distanceUnit = UserDefaults.standard.string(forKey: "distanceUnit") ?? "km"
        let value = distanceUnit == "km" ? distance / 1000 : distance / 1609.34
        return String(format: "%.2f %@", value, distanceUnit)
    }
    
    private func formattedPace(_ pace: Double) -> String {
        if pace == 0 {
            return "--:--"
        }
        
        let distanceUnit = UserDefaults.standard.string(forKey: "distanceUnit") ?? "km"
        let multiplier = distanceUnit == "km" ? 1000 : 1609.34
        
        // Pace is in seconds per meter, convert to minutes per km or mile
        let paceInMinutesPerUnit = pace * multiplier / 60
        let minutes = Int(paceInMinutesPerUnit)
        let seconds = Int((paceInMinutesPerUnit - Double(minutes)) * 60)
        
        return String(format: "%d:%02d min/%@", minutes, seconds, distanceUnit)
    }
    
    private func formattedElevation(_ meters: Double) -> String {
        let distanceUnit = UserDefaults.standard.string(forKey: "distanceUnit") ?? "km"
        if distanceUnit == "mi" {
            // Convert to feet for imperial
            return String(format: "%.0f ft", meters * 3.28084)
        } else {
            return String(format: "%.0f m", meters)
        }
    }
}

// MARK: - Supporting Types

enum Timeframe {
    case week, month, year, all
}

struct WeeklyDistance {
    let date: Date
    let distance: Double // in km
}

struct PaceData {
    let date: Date
    let pace: Double // in min/km
}

// MARK: - Supporting Views

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                
                Text(title)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.primary)
                .padding(.top, 4)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
}

struct PersonalBestRow: View {
    let distance: String
    let time: String
    
    var body: some View {
        HStack {
            Image(systemName: "trophy")
                .foregroundColor(.yellow)
                .frame(width: 30)
            
            Text(distance)
                .font(.subheadline)
                .fontWeight(.medium)
            
            Spacer()
            
            Text(time)
                .font(.title3)
                .fontWeight(.semibold)
                .foregroundColor(.primary)
        }
    }
}

struct StatsView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            StatsView()
        }
    }
} 