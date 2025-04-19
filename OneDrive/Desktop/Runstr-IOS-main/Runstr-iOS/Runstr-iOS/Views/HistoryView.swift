import SwiftUI

struct HistoryView: View {
    @Environment(\.managedObjectContext) private var viewContext
    
    @FetchRequest(
        entity: Run.entity(),
        sortDescriptors: [NSSortDescriptor(keyPath: \Run.date, ascending: false)],
        animation: .default
    )
    private var runs: FetchedResults<Run>
    
    @State private var selectedRun: RunData?
    @State private var isShowingDetail = false
    @State private var showingDeleteAlert = false
    @State private var runToDelete: String?
    
    var body: some View {
        ZStack {
            if runs.isEmpty {
                emptyStateView
            } else {
                runList
            }
        }
        .navigationTitle("Run History")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                EditButton()
            }
        }
        .sheet(isPresented: $isShowingDetail) {
            if let run = selectedRun {
                RunSummaryView(run: run)
            }
        }
        .alert(isPresented: $showingDeleteAlert) {
            Alert(
                title: Text("Delete Run"),
                message: Text("Are you sure you want to delete this run? This action cannot be undone."),
                primaryButton: .destructive(Text("Delete")) {
                    if let id = runToDelete {
                        deleteRun(id: id)
                    }
                },
                secondaryButton: .cancel()
            )
        }
    }
    
    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "figure.run")
                .font(.system(size: 60))
                .foregroundColor(.gray)
            
            Text("No Runs Yet")
                .font(.title)
                .fontWeight(.semibold)
            
            Text("Your completed runs will appear here.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            NavigationLink(destination: RunView()) {
                Text("Start Your First Run")
                    .font(.headline)
                    .foregroundColor(.white)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(10)
            }
            .padding(.top, 10)
        }
        .padding()
    }
    
    private var runList: some View {
        List {
            ForEach(runs, id: \.id) { run in
                RunRow(run: run)
                    .contentShape(Rectangle()) // Make the entire row tappable
                    .onTapGesture {
                        selectedRun = RunData.fromCoreDataEntity(run)
                        isShowingDetail = true
                    }
            }
            .onDelete { indexSet in
                let runsToDelete = indexSet.map { runs[$0] }
                for run in runsToDelete {
                    if let id = run.id {
                        runToDelete = id
                        showingDeleteAlert = true
                        return
                    }
                }
            }
        }
    }
    
    private func deleteRun(id: String) {
        PersistenceController.shared.deleteRun(id: id)
    }
}

struct RunRow: View {
    let run: Run
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 8) {
                Text(formattedDate)
                    .font(.headline)
                
                HStack {
                    Label(formattedDistance, systemImage: "figure.walk")
                        .font(.subheadline)
                    
                    Spacer()
                    
                    Label(formattedDuration, systemImage: "clock")
                        .font(.subheadline)
                }
                .foregroundColor(.secondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 8) {
                if run.isPostedToNostr {
                    Image(systemName: "bolt.fill")
                        .foregroundColor(.yellow)
                }
                
                Text(formattedPace)
                    .font(.headline)
                    .foregroundColor(.green)
            }
        }
        .padding(.vertical, 6)
    }
    
    private var formattedDate: String {
        guard let date = run.date else { return "Unknown Date" }
        
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        
        return formatter.string(from: date)
    }
    
    private var formattedDistance: String {
        let distanceUnit = UserDefaults.standard.string(forKey: "distanceUnit") ?? "km"
        let value = distanceUnit == "km" ? run.distance / 1000 : run.distance / 1609.34
        return String(format: "%.2f %@", value, distanceUnit)
    }
    
    private var formattedDuration: String {
        let duration = Int(run.duration)
        let hours = duration / 3600
        let minutes = (duration % 3600) / 60
        let seconds = duration % 60
        
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%02d:%02d", minutes, seconds)
        }
    }
    
    private var formattedPace: String {
        let distanceUnit = UserDefaults.standard.string(forKey: "distanceUnit") ?? "km"
        let multiplier = distanceUnit == "km" ? 1000 : 1609.34
        
        // Pace is in seconds per meter, convert to minutes per km or mile
        let paceInMinutesPerUnit = run.pace * multiplier / 60
        let minutes = Int(paceInMinutesPerUnit)
        let seconds = Int((paceInMinutesPerUnit - Double(minutes)) * 60)
        
        return String(format: "%d:%02d min/%@", minutes, seconds, distanceUnit)
    }
}

struct HistoryView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            HistoryView()
                .environment(\.managedObjectContext, PersistenceController.shared.container.viewContext)
        }
    }
} 