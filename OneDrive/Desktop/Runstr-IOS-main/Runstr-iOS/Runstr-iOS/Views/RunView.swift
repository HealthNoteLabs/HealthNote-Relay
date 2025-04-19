import SwiftUI
import MapKit
import CoreLocation

struct RunView: View {
    @StateObject private var viewModel = RunViewModel()
    @State private var showingCountdown = false
    @State private var countdown = 5
    @State private var countdownType = ""
    @State private var showPermissionAlert = false
    @State private var showingSummary = false
    
    var body: some View {
        ZStack {
            VStack(spacing: 0) {
                // Map view
                MapViewRepresentable(region: $viewModel.currentRegion, locations: viewModel.locations)
                    .frame(height: 250)
                    .overlay(
                        Image(systemName: "location.fill")
                            .foregroundColor(.blue)
                            .imageScale(.small)
                    )
                
                // Stats display
                VStack(spacing: 15) {
                    HStack(spacing: 0) {
                        StatBox(
                            title: "Distance",
                            value: viewModel.formattedDistance,
                            color: .blue
                        )
                        
                        Divider()
                            .frame(width: 1)
                            .background(Color.gray.opacity(0.3))
                        
                        StatBox(
                            title: "Duration",
                            value: viewModel.formattedDuration,
                            color: .orange
                        )
                    }
                    .frame(height: 90)
                    .background(Color(.systemBackground))
                    .cornerRadius(10)
                    .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
                    
                    HStack(spacing: 0) {
                        StatBox(
                            title: "Pace",
                            value: viewModel.formattedPace,
                            color: .green
                        )
                        
                        Divider()
                            .frame(width: 1)
                            .background(Color.gray.opacity(0.3))
                        
                        StatBox(
                            title: "Elevation",
                            value: viewModel.formattedElevation,
                            color: .purple
                        )
                    }
                    .frame(height: 90)
                    .background(Color(.systemBackground))
                    .cornerRadius(10)
                    .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
                }
                .padding(.horizontal)
                .padding(.top, 20)
                
                Spacer()
                
                // Control buttons
                controlButtons()
                    .padding(.bottom, 30)
            }
            
            // Countdown overlay
            if showingCountdown {
                countdownOverlay()
            }
            
            // Loading overlay
            if viewModel.savingRun {
                savingOverlay()
            }
        }
        .navigationTitle("Run")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            checkLocationPermission()
        }
        .alert("Location Permission Required", isPresented: $showPermissionAlert) {
            Button("Settings", action: openSettings)
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("Runstr needs location access to track your runs. Please enable it in Settings.")
        }
        .sheet(isPresented: $showingSummary) {
            if let runData = viewModel.lastRun {
                RunSummaryView(run: runData)
            }
        }
        .onChange(of: viewModel.showingSaveSuccess) { success in
            if success {
                // Show the summary after a short delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    showingSummary = true
                    viewModel.showingSaveSuccess = false
                }
            }
        }
    }
    
    private func controlButtons() -> some View {
        HStack(spacing: 40) {
            if viewModel.isTracking {
                if viewModel.isPaused {
                    // Resume button
                    ControlButton(
                        action: { viewModel.resumeRun() },
                        icon: "play.fill",
                        color: .green
                    )
                } else {
                    // Pause button
                    ControlButton(
                        action: { viewModel.pauseRun() },
                        icon: "pause.fill",
                        color: .orange
                    )
                }
                
                // Stop button
                ControlButton(
                    action: { startCountdown(type: "stop") },
                    icon: "stop.fill",
                    color: .red
                )
                
            } else {
                // Start button
                ControlButton(
                    action: { startCountdown(type: "start") },
                    icon: "play.fill",
                    color: .green
                )
            }
        }
    }
    
    private func countdownOverlay() -> some View {
        ZStack {
            Color.black.opacity(0.7)
                .edgesIgnoringSafeArea(.all)
            
            VStack {
                Text(countdownType == "start" ? "Starting Run" : "Stopping Run")
                    .font(.title2)
                    .fontWeight(.medium)
                    .foregroundColor(.white)
                    .padding()
                
                Text("\(countdown)")
                    .font(.system(size: 80, weight: .bold))
                    .foregroundColor(.white)
            }
        }
        .transition(.opacity)
        .zIndex(10)
    }
    
    private func savingOverlay() -> some View {
        ZStack {
            Color.black.opacity(0.5)
                .edgesIgnoringSafeArea(.all)
            
            VStack {
                ProgressView()
                    .scaleEffect(1.5)
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .padding()
                
                Text("Saving Run")
                    .font(.title3)
                    .fontWeight(.medium)
                    .foregroundColor(.white)
            }
            .padding(30)
            .background(Color(.systemGray6).opacity(0.8))
            .cornerRadius(15)
        }
        .transition(.opacity)
        .zIndex(20)
    }
    
    private func startCountdown(type: String) {
        countdownType = type
        countdown = 5
        
        withAnimation {
            showingCountdown = true
        }
        
        Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { timer in
            if countdown > 1 {
                countdown -= 1
            } else {
                timer.invalidate()
                
                withAnimation {
                    showingCountdown = false
                }
                
                if type == "start" {
                    viewModel.startRun()
                } else {
                    viewModel.stopRun()
                }
            }
        }
    }
    
    private func checkLocationPermission() {
        switch CLLocationManager().authorizationStatus {
        case .notDetermined:
            // Will be requested when starting run
            break
        case .restricted, .denied:
            showPermissionAlert = true
        default:
            break
        }
    }
    
    private func openSettings() {
        guard let settingsURL = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(settingsURL)
    }
}

// MARK: - Supporting Views

struct StatBox: View {
    let title: String
    let value: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            Text(title)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.gray)
            
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
    }
}

struct ControlButton: View {
    let action: () -> Void
    let icon: String
    let color: Color
    
    var body: some View {
        Button(action: action) {
            ZStack {
                Circle()
                    .fill(color)
                    .frame(width: 60, height: 60)
                    .shadow(color: color.opacity(0.4), radius: 5, x: 0, y: 2)
                
                Image(systemName: icon)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.white)
            }
        }
    }
}

struct MapViewRepresentable: UIViewRepresentable {
    @Binding var region: MKCoordinateRegion
    let locations: [CLLocation]
    
    func makeUIView(context: Context) -> MKMapView {
        let mapView = MKMapView()
        mapView.delegate = context.coordinator
        mapView.showsUserLocation = true
        mapView.showsCompass = true
        mapView.mapType = .standard
        
        // Add gesture recognizers
        let zoomGesture = UIPinchGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleZoom(_:)))
        mapView.addGestureRecognizer(zoomGesture)
        
        return mapView
    }
    
    func updateUIView(_ view: MKMapView, context: Context) {
        view.setRegion(region, animated: true)
        
        // Remove existing overlays
        view.removeOverlays(view.overlays)
        
        // Add run path overlay
        if locations.count > 1 {
            let coordinates = locations.map { $0.coordinate }
            let polyline = MKPolyline(coordinates: coordinates, count: coordinates.count)
            view.addOverlay(polyline)
        }
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, MKMapViewDelegate {
        var parent: MapViewRepresentable
        
        init(_ parent: MapViewRepresentable) {
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
        
        @objc func handleZoom(_ gesture: UIPinchGestureRecognizer) {
            if gesture.state == .changed {
                let mapView = gesture.view as! MKMapView
                let scale = gesture.scale
                
                // Calculate new span based on pinch scale
                let span = mapView.region.span
                let center = mapView.region.center
                
                let newLatDelta = span.latitudeDelta / scale
                let newLonDelta = span.longitudeDelta / scale
                
                // Update the region
                let newRegion = MKCoordinateRegion(
                    center: center,
                    span: MKCoordinateSpan(latitudeDelta: newLatDelta, longitudeDelta: newLonDelta)
                )
                
                mapView.setRegion(newRegion, animated: false)
                gesture.scale = 1.0
            }
        }
    }
}

// MARK: - Preview

struct RunView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            RunView()
        }
    }
} 