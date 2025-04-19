import SwiftUI
import HealthKit

struct SettingsView: View {
    @AppStorage("distanceUnit") private var distanceUnit: String = "km"
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding: Bool = true
    
    @State private var isShowingHealthPermission = false
    @State private var isShowingLocationPermission = false
    @State private var isShowingResetConfirmation = false
    @State private var weight: String = ""
    @State private var userProfile = UserProfile()
    
    // Environment
    @EnvironmentObject private var permissionManager: PermissionManager
    
    var body: some View {
        Form {
            // User Profile Section
            Section(header: Text("Profile")) {
                TextField("Name", text: $userProfile.name)
                
                HStack {
                    Text("Weight")
                    Spacer()
                    TextField("Weight", text: $weight)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                    
                    Text(distanceUnit == "km" ? "kg" : "lbs")
                        .foregroundColor(.secondary)
                }
                
                Picker("Gender", selection: $userProfile.gender) {
                    Text("Male").tag("male")
                    Text("Female").tag("female")
                    Text("Other").tag("other")
                }
                
                DatePicker("Birthday", selection: $userProfile.birthday, displayedComponents: .date)
            }
            
            // Units Section
            Section(header: Text("Units")) {
                Picker("Distance Unit", selection: $distanceUnit) {
                    Text("Kilometers").tag("km")
                    Text("Miles").tag("mi")
                }
                .pickerStyle(SegmentedPickerStyle())
            }
            
            // App Permissions Section
            Section(header: Text("Permissions")) {
                Button(action: {
                    isShowingLocationPermission = true
                }) {
                    HStack {
                        Image(systemName: "location")
                            .foregroundColor(.blue)
                            .frame(width: 30)
                        
                        VStack(alignment: .leading) {
                            Text("Location Services")
                                .foregroundColor(.primary)
                            
                            Text(locationStatusText)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .alert(isPresented: $isShowingLocationPermission) {
                    Alert(
                        title: Text("Location Services"),
                        message: Text("Runstr needs location access to track your runs. Please enable it in Settings."),
                        primaryButton: .default(Text("Open Settings")) {
                            openSettings()
                        },
                        secondaryButton: .cancel()
                    )
                }
                
                Button(action: {
                    isShowingHealthPermission = true
                }) {
                    HStack {
                        Image(systemName: "heart")
                            .foregroundColor(.red)
                            .frame(width: 30)
                        
                        VStack(alignment: .leading) {
                            Text("Health Access")
                                .foregroundColor(.primary)
                            
                            Text(healthKitStatusText)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .alert(isPresented: $isShowingHealthPermission) {
                    Alert(
                        title: Text("Health Access"),
                        message: Text("Runstr can integrate with Apple Health to save your runs and read health data. Would you like to enable this integration?"),
                        primaryButton: .default(Text("Enable")) {
                            requestHealthPermission()
                        },
                        secondaryButton: .cancel()
                    )
                }
            }
            
            // App Integration Section
            Section(header: Text("Integrations")) {
                NavigationLink(destination: Text("Nostr integration settings will go here")) {
                    HStack {
                        Image(systemName: "bolt")
                            .foregroundColor(.yellow)
                            .frame(width: 30)
                        
                        Text("Nostr Integration")
                    }
                }
            }
            
            // App Info Section
            Section(header: Text("About")) {
                HStack {
                    Text("Version")
                    Spacer()
                    Text("1.0.0")
                        .foregroundColor(.secondary)
                }
                
                NavigationLink(destination: Text("Privacy policy details will go here")) {
                    Text("Privacy Policy")
                }
                
                NavigationLink(destination: Text("Terms of use details will go here")) {
                    Text("Terms of Use")
                }
            }
            
            // Reset Section
            Section {
                Button(action: {
                    isShowingResetConfirmation = true
                }) {
                    HStack {
                        Spacer()
                        Text("Reset App Data")
                            .foregroundColor(.red)
                        Spacer()
                    }
                }
                .alert(isPresented: $isShowingResetConfirmation) {
                    Alert(
                        title: Text("Reset App Data"),
                        message: Text("This will delete all your runs and reset all settings. This action cannot be undone."),
                        primaryButton: .destructive(Text("Reset")) {
                            resetAppData()
                        },
                        secondaryButton: .cancel()
                    )
                }
            }
        }
        .navigationTitle("Settings")
        .onAppear {
            loadUserProfile()
            loadWeightFromHealthKit()
        }
        .onChange(of: userProfile) { _ in
            saveUserProfile()
        }
        .onChange(of: weight) { newWeight in
            if let weightValue = Double(newWeight) {
                userProfile.weight = weightValue
                saveUserProfile()
            }
        }
    }
    
    // MARK: - Computed Properties
    
    private var locationStatusText: String {
        switch permissionManager.locationStatus {
        case .authorizedAlways:
            return "Always Allowed"
        case .authorizedWhenInUse:
            return "Allowed While Using"
        case .denied:
            return "Denied"
        case .restricted:
            return "Restricted"
        case .notDetermined:
            return "Not Determined"
        @unknown default:
            return "Unknown"
        }
    }
    
    private var healthKitStatusText: String {
        return permissionManager.healthKitPermissionGranted ? "Allowed" : "Not Allowed"
    }
    
    // MARK: - Methods
    
    private func openSettings() {
        guard let settingsURL = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(settingsURL)
    }
    
    private func requestHealthPermission() {
        permissionManager.requestHealthPermission { success in
            // Handle success if needed
        }
    }
    
    private func loadUserProfile() {
        if let profileData = UserDefaults.standard.data(forKey: "userProfile"),
           let profile = try? JSONDecoder().decode(UserProfile.self, from: profileData) {
            userProfile = profile
            weight = String(format: "%.1f", profile.weight)
        }
    }
    
    private func saveUserProfile() {
        if let profileData = try? JSONEncoder().encode(userProfile) {
            UserDefaults.standard.set(profileData, forKey: "userProfile")
        }
    }
    
    private func loadWeightFromHealthKit() {
        if permissionManager.healthKitPermissionGranted {
            HealthKitService.shared.fetchUserWeight { weightValue, error in
                if let weight = weightValue {
                    let convertedWeight = distanceUnit == "km" ? weight : weight * 2.20462 // Convert to lbs if using imperial
                    DispatchQueue.main.async {
                        self.weight = String(format: "%.1f", convertedWeight)
                        self.userProfile.weight = convertedWeight
                    }
                }
            }
        }
    }
    
    private func resetAppData() {
        // Reset UserDefaults
        let domain = Bundle.main.bundleIdentifier!
        UserDefaults.standard.removePersistentDomain(forName: domain)
        UserDefaults.standard.synchronize()
        
        // Reset Core Data
        let context = PersistenceController.shared.container.viewContext
        let fetchRequest: NSFetchRequest<NSFetchRequestResult> = Run.fetchRequest()
        let deleteRequest = NSBatchDeleteRequest(fetchRequest: fetchRequest)
        
        do {
            try PersistenceController.shared.container.persistentStoreCoordinator.execute(deleteRequest, with: context)
            try context.save()
        } catch {
            print("Failed to reset Core Data: \(error)")
        }
        
        // Reset state
        distanceUnit = "km"
        userProfile = UserProfile()
        weight = ""
        
        // Reset onboarding flag (optional, typically you might not want to reset this)
        hasCompletedOnboarding = false
    }
}

// MARK: - Supporting Types

struct UserProfile: Codable, Equatable {
    var name: String = ""
    var weight: Double = 70 // Default in kg
    var gender: String = "male"
    var birthday: Date = Calendar.current.date(byAdding: .year, value: -30, to: Date()) ?? Date()
}

// MARK: - Preview

struct SettingsView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            SettingsView()
                .environmentObject(PermissionManager())
        }
    }
} 