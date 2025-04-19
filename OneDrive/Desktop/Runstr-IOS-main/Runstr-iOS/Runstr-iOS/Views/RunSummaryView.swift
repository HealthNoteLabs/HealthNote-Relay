import SwiftUI
import MapKit

struct RunSummaryView: View {
    let run: RunData
    @State private var mapRegion = MKCoordinateRegion()
    @State private var routeCoordinates: [CLLocationCoordinate2D] = []
    @State private var showShareSheet = false
    @State private var shareImage: UIImage?
    @State private var note: String = ""
    @State private var isShowingNostrShare = false
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Map with route
                    ZStack(alignment: .topTrailing) {
                        MapView(region: $mapRegion, routeCoordinates: routeCoordinates)
                            .frame(height: 250)
                            .cornerRadius(12)
                            .padding(.horizontal)
                        
                        Button(action: {
                            zoomToFitRoute()
                        }) {
                            Image(systemName: "arrow.up.left.and.down.right.magnifyingglass")
                                .foregroundColor(.white)
                                .padding(8)
                                .background(Color.blue)
                                .clipShape(Circle())
                                .shadow(radius: 2)
                        }
                        .padding([.top, .trailing], 16)
                    }
                    
                    // Stats cards
                    VStack(spacing: 15) {
                        HStack {
                            SummaryCard(
                                title: "Distance",
                                value: run.formattedDistance,
                                icon: "figure.walk",
                                color: .blue
                            )
                            
                            SummaryCard(
                                title: "Duration",
                                value: run.formattedDuration,
                                icon: "clock",
                                color: .orange
                            )
                        }
                        
                        HStack {
                            SummaryCard(
                                title: "Pace",
                                value: run.formattedPace,
                                icon: "speedometer",
                                color: .green
                            )
                            
                            SummaryCard(
                                title: "Calories",
                                value: "\(run.caloriesBurned) kcal",
                                icon: "flame",
                                color: .red
                            )
                        }
                        
                        SummaryCard(
                            title: "Elevation Gain",
                            value: run.formattedElevation,
                            icon: "mountain.2",
                            color: .purple
                        )
                    }
                    .padding(.horizontal)
                    
                    // Splits section
                    if !run.splits.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Splits")
                                .font(.headline)
                                .padding(.horizontal)
                            
                            SplitsView(splits: run.splits)
                                .frame(height: 180)
                                .padding(.horizontal)
                        }
                    }
                    
                    // Note section
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Add Note")
                            .font(.headline)
                            .padding(.horizontal)
                        
                        TextEditor(text: $note)
                            .frame(height: 100)
                            .padding(8)
                            .background(Color(.systemGray6))
                            .cornerRadius(8)
                            .padding(.horizontal)
                    }
                    
                    // Share buttons
                    HStack(spacing: 20) {
                        Button(action: {
                            saveNote()
                            generateShareImage()
                            showShareSheet = true
                        }) {
                            Label("Share", systemImage: "square.and.arrow.up")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        
                        Button(action: {
                            saveNote()
                            isShowingNostrShare = true
                        }) {
                            Label("Nostr", systemImage: "bolt")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                    }
                    .padding(.horizontal)
                    .padding(.top, 10)
                }
                .padding(.vertical)
            }
            .navigationTitle("Run Summary")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        saveNote()
                        dismiss()
                    }
                }
            }
            .onAppear {
                loadRunData()
            }
            .sheet(isPresented: $showShareSheet) {
                if let image = shareImage {
                    ShareSheet(items: [image])
                }
            }
            .sheet(isPresented: $isShowingNostrShare) {
                NostrShareView(run: run, note: note)
            }
        }
    }
    
    private func loadRunData() {
        // Convert location dictionaries to coordinates
        var coordinates: [CLLocationCoordinate2D] = []
        
        for locationDict in run.locations {
            guard let latitude = locationDict["latitude"] as? Double,
                  let longitude = locationDict["longitude"] as? Double else {
                continue
            }
            
            let coordinate = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
            coordinates.append(coordinate)
        }
        
        routeCoordinates = coordinates
        
        if let firstLocation = coordinates.first {
            // Set initial region
            mapRegion = MKCoordinateRegion(
                center: firstLocation,
                span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
            )
            
            // Zoom to fit the entire route
            zoomToFitRoute()
        }
        
        // Load existing note if any
        if let existingRun = PersistenceController.shared.fetchRun(by: run.id),
           let existingNote = existingRun.userNote {
            note = existingNote
        }
    }
    
    private func zoomToFitRoute() {
        guard !routeCoordinates.isEmpty else { return }
        
        var minLat = routeCoordinates[0].latitude
        var maxLat = minLat
        var minLon = routeCoordinates[0].longitude
        var maxLon = minLon
        
        for coordinate in routeCoordinates {
            minLat = min(minLat, coordinate.latitude)
            maxLat = max(maxLat, coordinate.latitude)
            minLon = min(minLon, coordinate.longitude)
            maxLon = max(maxLon, coordinate.longitude)
        }
        
        let center = CLLocationCoordinate2D(
            latitude: (minLat + maxLat) / 2,
            longitude: (minLon + maxLon) / 2
        )
        
        let span = MKCoordinateSpan(
            latitudeDelta: (maxLat - minLat) * 1.2, // Add 20% padding
            longitudeDelta: (maxLon - minLon) * 1.2
        )
        
        mapRegion = MKCoordinateRegion(center: center, span: span)
    }
    
    private func saveNote() {
        PersistenceController.shared.updateRunNote(id: run.id, note: note)
    }
    
    private func generateShareImage() {
        let renderer = ImageRenderer(content: SummaryShareView(run: run, note: note))
        renderer.scale = UIScreen.main.scale
        
        if let uiImage = renderer.uiImage {
            shareImage = uiImage
        }
    }
}

// MARK: - Supporting Views

struct SummaryCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
                .frame(width: 40)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .foregroundColor(.gray)
                
                Text(value)
                    .font(.title3)
                    .fontWeight(.semibold)
            }
            
            Spacer()
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
}

struct SplitsView: View {
    let splits: [[String: Any]]
    
    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Header
                HStack {
                    Text("Split")
                        .fontWeight(.medium)
                        .frame(width: 50, alignment: .leading)
                    
                    Text("Distance")
                        .fontWeight(.medium)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    
                    Text("Time")
                        .fontWeight(.medium)
                        .frame(width: 60, alignment: .trailing)
                    
                    Text("Pace")
                        .fontWeight(.medium)
                        .frame(width: 80, alignment: .trailing)
                }
                .font(.caption)
                .foregroundColor(.gray)
                .padding(.vertical, 8)
                .padding(.horizontal, 12)
                .background(Color(.systemGray6))
                
                // Splits rows
                ForEach(0..<splits.count, id: \.self) { index in
                    SplitRow(split: splits[index], index: index)
                        .background(index % 2 == 0 ? Color(.systemBackground) : Color(.systemGray6).opacity(0.3))
                }
            }
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color.gray.opacity(0.2), lineWidth: 1)
            )
        }
    }
}

struct SplitRow: View {
    let split: [String: Any]
    let index: Int
    
    var body: some View {
        HStack {
            Text("\(split["number"] as? Int ?? (index + 1))")
                .frame(width: 50, alignment: .leading)
            
            Text(formattedDistance)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            Text(formattedDuration)
                .frame(width: 60, alignment: .trailing)
            
            Text(formattedPace)
                .frame(width: 80, alignment: .trailing)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .font(.callout)
    }
    
    var formattedDistance: String {
        let distance = split["distance"] as? Double ?? 0
        let distanceUnit = UserDefaults.standard.string(forKey: "distanceUnit") ?? "km"
        
        if distanceUnit == "km" {
            return String(format: "%.2f km", distance / 1000)
        } else {
            return String(format: "%.2f mi", distance / 1609.34)
        }
    }
    
    var formattedDuration: String {
        let duration = split["duration"] as? Double ?? 0
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        
        return String(format: "%d:%02d", minutes, seconds)
    }
    
    var formattedPace: String {
        let pace = split["pace"] as? Double ?? 0
        let distanceUnit = UserDefaults.standard.string(forKey: "distanceUnit") ?? "km"
        let multiplier = distanceUnit == "km" ? 1000 : 1609.34
        
        // Convert pace to min/km or min/mile
        let paceMinutes = Int(pace * multiplier / 60)
        let paceSeconds = Int(pace * multiplier) % 60
        
        return String(format: "%d:%02d", paceMinutes, paceSeconds)
    }
}

struct MapView: UIViewRepresentable {
    @Binding var region: MKCoordinateRegion
    let routeCoordinates: [CLLocationCoordinate2D]
    
    func makeUIView(context: Context) -> MKMapView {
        let mapView = MKMapView()
        mapView.delegate = context.coordinator
        mapView.showsUserLocation = false
        mapView.isScrollEnabled = true
        mapView.isZoomEnabled = true
        
        return mapView
    }
    
    func updateUIView(_ mapView: MKMapView, context: Context) {
        mapView.setRegion(region, animated: true)
        
        // Remove existing overlays
        mapView.removeOverlays(mapView.overlays)
        
        // Add route polyline
        if routeCoordinates.count > 1 {
            let polyline = MKPolyline(coordinates: routeCoordinates, count: routeCoordinates.count)
            mapView.addOverlay(polyline)
            
            // Add start and end markers
            if let first = routeCoordinates.first, let last = routeCoordinates.last {
                addMarker(to: mapView, at: first, title: "Start", color: .green)
                
                if first != last {
                    addMarker(to: mapView, at: last, title: "Finish", color: .red)
                }
            }
        }
    }
    
    private func addMarker(to mapView: MKMapView, at coordinate: CLLocationCoordinate2D, title: String, color: UIColor) {
        let annotation = MKPointAnnotation()
        annotation.coordinate = coordinate
        annotation.title = title
        mapView.addAnnotation(annotation)
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, MKMapViewDelegate {
        var parent: MapView
        
        init(_ parent: MapView) {
            self.parent = parent
        }
        
        func mapView(_ mapView: MKMapView, rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
            if let polyline = overlay as? MKPolyline {
                let renderer = MKPolylineRenderer(polyline: polyline)
                renderer.strokeColor = .systemBlue
                renderer.lineWidth = 4
                return renderer
            }
            return MKOverlayRenderer(overlay: overlay)
        }
        
        func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
            guard !annotation.isKind(of: MKUserLocation.self) else {
                return nil
            }
            
            let identifier = "MarkerAnnotation"
            var annotationView = mapView.dequeueReusableAnnotationView(withIdentifier: identifier) as? MKMarkerAnnotationView
            
            if annotationView == nil {
                annotationView = MKMarkerAnnotationView(annotation: annotation, reuseIdentifier: identifier)
            } else {
                annotationView?.annotation = annotation
            }
            
            // Configure marker colors
            if annotation.title == "Start" {
                annotationView?.markerTintColor = .systemGreen
                annotationView?.glyphImage = UIImage(systemName: "flag.fill")
            } else if annotation.title == "Finish" {
                annotationView?.markerTintColor = .systemRed
                annotationView?.glyphImage = UIImage(systemName: "flag.checkered")
            }
            
            return annotationView
        }
    }
}

struct SummaryShareView: View {
    let run: RunData
    let note: String
    
    var body: some View {
        VStack(spacing: 20) {
            Text("My Run with Runstr")
                .font(.title2)
                .fontWeight(.bold)
            
            HStack(spacing: 20) {
                VStack(alignment: .leading, spacing: 8) {
                    statRow(title: "Distance", value: run.formattedDistance, icon: "figure.walk")
                    statRow(title: "Time", value: run.formattedDuration, icon: "clock")
                    statRow(title: "Pace", value: run.formattedPace, icon: "speedometer")
                    statRow(title: "Calories", value: "\(run.caloriesBurned) kcal", icon: "flame")
                    statRow(title: "Elevation", value: run.formattedElevation, icon: "mountain.2")
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }
            
            if !note.isEmpty {
                Text(note)
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
            }
            
            Text("Runstr - Run Tracking")
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding()
        .frame(width: UIScreen.main.bounds.width - 40)
        .background(Color.white)
    }
    
    private func statRow(title: String, value: String, icon: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .frame(width: 20)
            
            Text(title)
                .fontWeight(.medium)
                .frame(width: 80, alignment: .leading)
            
            Text(value)
                .fontWeight(.semibold)
        }
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    
    func makeUIViewController(context: Context) -> UIActivityViewController {
        let controller = UIActivityViewController(activityItems: items, applicationActivities: nil)
        return controller
    }
    
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

// This is a placeholder since we haven't implemented the Nostr view yet
struct NostrShareView: View {
    let run: RunData
    let note: String
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        VStack {
            Text("Share to Nostr")
                .font(.title)
                .padding()
            
            Text("This feature will be implemented soon")
                .padding()
            
            Button("Close") {
                dismiss()
            }
            .padding()
        }
    }
}

// MARK: - PersistenceController extension
extension PersistenceController {
    func fetchRun(by id: String) -> Run? {
        let fetchRequest: NSFetchRequest<Run> = Run.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %@", id)
        
        do {
            let runs = try container.viewContext.fetch(fetchRequest)
            return runs.first
        } catch {
            print("Failed to fetch run: \(error.localizedDescription)")
            return nil
        }
    }
}

// MARK: - Previews
struct RunSummaryView_Previews: PreviewProvider {
    static var previews: some View {
        let sampleRun = RunData(
            id: UUID().uuidString,
            date: Date(),
            distance: 5000,
            duration: 1500,
            pace: 0.3,
            elevationGain: 45,
            elevationLoss: 45,
            splits: [
                ["number": 1, "distance": 1000, "duration": 300, "pace": 0.3],
                ["number": 2, "distance": 1000, "duration": 300, "pace": 0.3],
                ["number": 3, "distance": 1000, "duration": 300, "pace": 0.3],
                ["number": 4, "distance": 1000, "duration": 300, "pace": 0.3],
                ["number": 5, "distance": 1000, "duration": 300, "pace": 0.3]
            ],
            locations: [
                ["latitude": 37.7749, "longitude": -122.4194, "timestamp": Date().timeIntervalSince1970],
                ["latitude": 37.7750, "longitude": -122.4190, "timestamp": Date().timeIntervalSince1970 + 60],
                ["latitude": 37.7752, "longitude": -122.4185, "timestamp": Date().timeIntervalSince1970 + 120]
            ]
        )
        
        return RunSummaryView(run: sampleRun)
    }
} 